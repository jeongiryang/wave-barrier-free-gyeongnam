import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createSchemaBootstrap } from "../lib/schema-bootstrap.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("성공한 준비는 런타임 인스턴스당 한 번만 실행한다", async () => {
  let runs = 0;
  const bootstrap = createSchemaBootstrap(async () => {
    runs += 1;
    return "sql";
  });
  assert.deepEqual(await Promise.all([bootstrap(), bootstrap(), bootstrap()]), ["sql", "sql", "sql"]);
  assert.equal(await bootstrap(), "sql");
  assert.equal(runs, 1);
});

test("실패한 준비는 다음 요청이 다시 시도한다", async () => {
  // 실패를 캐시하면 이 인스턴스는 회수될 때까지 모든 요청에 같은 오류를 돌려준다.
  let runs = 0;
  const bootstrap = createSchemaBootstrap(async () => {
    runs += 1;
    if (runs === 1) throw new Error("Neon 콜드스타트 타임아웃");
    return "sql";
  });

  await assert.rejects(bootstrap(), /Neon 콜드스타트 타임아웃/);
  assert.equal(await bootstrap(), "sql", "두 번째 요청은 복구되어야 한다");
  assert.equal(await bootstrap(), "sql");
  assert.equal(runs, 2, "복구 뒤에는 다시 한 번만 실행한다");
});

test("동시에 들어온 요청은 같은 실패를 공유하고 준비는 한 번만 시도한다", async () => {
  let runs = 0;
  const bootstrap = createSchemaBootstrap(async () => {
    runs += 1;
    throw new Error("연결 거부");
  });
  const results = await Promise.allSettled([bootstrap(), bootstrap(), bootstrap()]);
  assert.deepEqual(results.map((item) => item.status), ["rejected", "rejected", "rejected"]);
  assert.equal(runs, 1);
  // 실패가 정리됐으므로 다음 요청은 새로 시도한다.
  await assert.rejects(bootstrap(), /연결 거부/);
  assert.equal(runs, 2);
});

test("동기적으로 던지는 준비도 거부로 다루고 다시 시도할 수 있다", async () => {
  let runs = 0;
  const bootstrap = createSchemaBootstrap(() => {
    runs += 1;
    if (runs === 1) throw new Error("설정 누락");
    return Promise.resolve("sql");
  });
  await assert.rejects(bootstrap(), /설정 누락/);
  assert.equal(await bootstrap(), "sql");
});

test("공유 여행과 커뮤니티는 같은 준비 방식을 쓴다", async () => {
  const [trips, community] = await Promise.all([
    source("server/trips/database.ts"),
    source("features/community/server/database.ts"),
  ]);
  for (const [name, code] of [["trips", trips], ["community", community]]) {
    assert.match(code, /createSchemaBootstrap\(/, `${name}가 공용 준비 방식을 쓰지 않는다`);
    // 거부된 Promise를 직접 들고 있으면 실패가 인스턴스 수명 내내 남는다.
    assert.doesNotMatch(code, /let schemaReady/, `${name}에 실패를 캐시하는 변수가 남아 있다`);
  }
});
