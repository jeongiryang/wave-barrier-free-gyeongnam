import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("shared trips are deleted when their retention window ends", async () => {
  const [database, actions, retention, worker, vercel, workflow] = await Promise.all([
    source("server/trips/database.ts"),
    source("server/trips/itinerary-actions.ts"),
    source("server/trips/retention-handler.ts"),
    source("worker/index.ts"),
    source("vercel.json"),
    source(".github/workflows/cd.yml"),
  ]);
  assert.match(database, /DELETE FROM itineraries WHERE expires_at <= \$\{now\}/);
  assert.match(database, /expires_at <= \$\{now\}/);
  assert.match(actions, /sweepExpiredTrips\(sql, now\)/);
  assert.match(actions, /recordOperationalEvent\("trip_retention", \{ status: "failed", trigger: "save" \}\)/);
  assert.match(actions, /INSERT INTO itineraries[\s\S]{0,400}?sweepExpiredTrips\(sql, now\)/);
  assert.match(retention, /CRON_SECRET/);
  assert.match(retention, /VERCEL_ENV !== "production"/);
  assert.match(retention, /sweepExpiredTrips\(sql\)/);
  assert.match(worker, /\/api\/maintenance\/trip-retention/);
  assert.match(vercel, /"path": "\/api\/maintenance\/trip-retention"/);
  assert.match(vercel, /"schedule": "17 3 \* \* \*"/);
  assert.match(workflow, /--env CRON_SECRET="\$CRON_SECRET"/);
});

test("trip schema bootstrap runs once per runtime instead of per request", async () => {
  const [trips, community] = await Promise.all([
    source("server/trips/database.ts"),
    source("features/community/server/database.ts"),
  ]);
  // 커뮤니티와 같은 방식으로 캐싱한다.
  assert.match(trips, /let schemaReady: Promise<TripSql \| null> \| null = null;/);
  assert.match(trips, /if \(schemaReady\) return schemaReady;/);
  assert.match(community, /if \(schemaReady\) return schemaReady;/);
});

test("the trips migration matches the runtime bootstrap", async () => {
  const [migration, database] = await Promise.all([
    source("migrations/003_trips.sql"),
    source("server/trips/database.ts"),
  ]);
  for (const object of [
    "itineraries",
    "place_feedback",
    "itineraries_expires_idx",
    "itineraries_created_idx",
    "place_feedback_created_idx",
  ]) {
    assert.ok(migration.includes(object), `migration is missing ${object}`);
    assert.ok(database.includes(object), `runtime bootstrap is missing ${object}`);
  }
});

test("retention documentation states what actually happens", async () => {
  const readme = await source("README.md");
  assert.match(readme, /30일/);
  assert.match(readme, /만료된 공유 여행은 매일 예약 정리/);
});
