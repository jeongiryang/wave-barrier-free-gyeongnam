import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SAVE_PATH_SWEEP_LIMIT,
  SCHEDULED_SWEEP_LIMIT,
  sweepLimitFor,
} from "../lib/trips/retention.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("사용자 저장 경로는 예약 작업보다 훨씬 적게 지운다", () => {
  // 저장은 사람이 응답을 기다리는 경로다. 예약 작업이 며칠 밀렸을 때 그 청소를
  // 운 나쁜 사용자 한 명이 떠안으면 안 된다.
  assert.equal(sweepLimitFor("save"), SAVE_PATH_SWEEP_LIMIT);
  assert.equal(sweepLimitFor("cron"), SCHEDULED_SWEEP_LIMIT);
  assert.ok(SAVE_PATH_SWEEP_LIMIT > 0);
  assert.ok(SAVE_PATH_SWEEP_LIMIT <= 50, "저장 요청에 얹는 정리는 작게 유지한다");
  assert.ok(SCHEDULED_SWEEP_LIMIT > SAVE_PATH_SWEEP_LIMIT * 10);
});

test("만료 행을 지우는 문장에는 상한이 있다", async () => {
  const database = await source("server/trips/database.ts");
  const sweep = database.slice(database.indexOf("export async function sweepExpiredTrips"));
  assert.match(sweep, /LIMIT \$\{limit\}/, "상한 없는 DELETE는 한 요청이 얼마나 오래 걸릴지 알 수 없다");
  assert.match(sweep, /ORDER BY expires_at/, "오래 만료된 것부터 지운다");
  assert.match(sweep, /limit = SCHEDULED_SWEEP_LIMIT/);
});

test("저장 요청은 작은 상한을 명시해서 부른다", async () => {
  const actions = await source("server/trips/itinerary-actions.ts");
  assert.match(actions, /sweepExpiredTrips\(sql, now, SAVE_PATH_SWEEP_LIMIT\)/);
});

test("예약 작업은 기본 상한을 그대로 쓴다", async () => {
  const retention = await source("server/trips/retention-handler.ts");
  assert.match(retention, /sweepExpiredTrips\(sql\)/);
});

test("주석이 코드와 어긋나지 않는다", async () => {
  // 예전 주석은 "한 번에 지우는 양을 제한한다"라고 적혀 있었지만 DELETE에는
  // 상한이 없었다. 문서와 코드가 어긋나면 다음 사람이 잘못 믿는다.
  const database = await source("server/trips/database.ts");
  const doc = database.slice(0, database.indexOf("export async function sweepExpiredTrips"));
  if (/한 번에 지우는 양을 제한|지우는 양을 묶/.test(doc)) {
    assert.match(database, /LIMIT \$\{limit\}/);
  }
});
