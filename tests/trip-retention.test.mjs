import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("shared trips are deleted when their retention window ends", async () => {
  const [database, actions] = await Promise.all([
    source("server/trips/database.ts"),
    source("server/trips/itinerary-actions.ts"),
  ]);
  // 읽을 때 거르기만 하면 행은 영원히 남는다. 실제로 지우는 질의가 있어야 한다.
  assert.match(database, /DELETE FROM itineraries WHERE id IN \(/);
  assert.match(database, /expires_at <= \$\{now\}/);
  assert.match(database, /LIMIT \$\{EXPIRED_TRIP_SWEEP_LIMIT\}/);
  assert.match(actions, /sweepExpiredTrips\(sql, now\)/);
  // 정리 실패가 방금 저장한 여행의 응답을 막아서는 안 된다.
  assert.match(actions, /sweepExpiredTrips\(sql, now\)\.catch\(\(\) => 0\)/);
  // 정리는 저장이 끝난 뒤에 일어난다.
  assert.match(actions, /INSERT INTO itineraries[\s\S]{0,400}?sweepExpiredTrips\(sql, now\)/);
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
    source("migrations/002_trips.sql"),
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
  assert.match(readme, /만료된 공유 여행은 이후 저장 요청에 얹어 실제로 삭제/);
});
