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
  // 만료 행은 읽을 때 거르는 데 그치지 않고 실제로 지운다. 다만 한 문장이
  // 지우는 양은 묶는다 — 상한은 tests/retention-sweep.test.mjs가 지킨다.
  assert.match(database, /DELETE FROM itineraries WHERE id IN \(/);
  assert.match(database, /SELECT id FROM itineraries WHERE expires_at <= \$\{now\}/);
  assert.match(database, /expires_at <= \$\{now\}/);
  assert.match(actions, /sweepExpiredTrips\(sql, now, SAVE_PATH_SWEEP_LIMIT\)/);
  assert.match(actions, /recordOperationalEvent\("trip_retention", \{ status: "failed", trigger: "save" \}\)/);
  assert.match(actions, /INSERT INTO itineraries[\s\S]{0,500}?sweepExpiredTrips\(sql, now, SAVE_PATH_SWEEP_LIMIT\)/);
  assert.match(retention, /CRON_SECRET/);
  assert.match(retention, /VERCEL_ENV !== "production"/);
  assert.match(retention, /sweepExpiredTrips\(sql\)/);
  assert.match(worker, /\/api\/maintenance\/trip-retention/);
  assert.match(vercel, /"path": "\/api\/maintenance\/trip-retention"/);
  assert.match(vercel, /"schedule": "17 3 \* \* \*"/);
  // Vercel Cron이 보내는 Bearer와 런타임이 비교하는 값은 프로젝트 Production
  // CRON_SECRET 하나여야 한다. 배포별 --env override를 다시 만들지 않는다.
  assert.match(workflow, /env ls production/);
  assert.match(workflow, /env add CRON_SECRET production --sensitive/);
  assert.doesNotMatch(workflow, /--env CRON_SECRET=/);
});

test("trip schema bootstrap runs once per runtime instead of per request", async () => {
  const [trips, community] = await Promise.all([
    source("server/trips/database.ts"),
    source("features/community/server/database.ts"),
  ]);
  // 성공 캐시는 유지하되 실패한 준비는 공용 bootstrap이 비워 다음 요청이 재시도한다.
  assert.ok(trips.includes("createSchemaBootstrap(async (): Promise<TripSql | null> =>"));
  assert.ok(community.includes("createSchemaBootstrap(async (): Promise<CommunitySql | null> =>"));
  assert.doesNotMatch(trips, /let schemaReady/);
  assert.doesNotMatch(community, /let schemaReady/);
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
  const [readme, setup] = await Promise.all([
    source("README.md"),
    source("docs/vercel-neon-setup.md"),
  ]);
  assert.match(readme, /30일/);
  assert.match(readme, /만료된 공유 여행은 매일 예약 정리/);
  assert.match(setup, /CRON_SECRET/);
  assert.match(setup, /배포별 `--env` 값으로 덮어쓰지 않는다/);
});
