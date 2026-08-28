import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CLIENT_BUDGET_MS,
  PLAN_TOTAL_BUDGET_MS,
  SERVER_BUDGET_MS,
  UPSTREAM_TIMEOUT_MS,
  budgetClock,
  withinBudget,
} from "../lib/request-budget.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("클라이언트는 서버보다 늦게 끊는다", () => {
  // 같은 값이면 느린 상류에서 클라이언트가 먼저 끊어, 서버가 정상 응답해도
  // 사용자는 실패만 본다. 실제로 12초 대 12초라 경로 결과가 버려지고 있었다.
  for (const [name, serverBudget] of Object.entries(SERVER_BUDGET_MS)) {
    assert.ok(
      CLIENT_BUDGET_MS[name] > serverBudget,
      `${name}: 클라이언트 ${CLIENT_BUDGET_MS[name]}ms가 서버 ${serverBudget}ms보다 길어야 한다`,
    );
  }
});

test("사람이 기다릴 만한 상한을 넘지 않는다", () => {
  for (const [name, budget] of Object.entries(CLIENT_BUDGET_MS)) {
    assert.ok(budget <= 20_000, `${name}: ${budget}ms는 너무 길다`);
  }
});

test("상류 타임아웃은 한 곳에서만 정한다", async () => {
  const files = [
    "server/shared/tourism-provider.ts",
    "server/shared/public-transport-provider.ts",
    "server/tourism/expressway-rests.ts",
    "server/tourism/water-travel.ts",
    "server/transport/kakao-route.ts",
    "server/transport/odsay.ts",
    "server/location/handler.ts",
    "server/weather/open-meteo.ts",
  ];
  const bundle = (await Promise.all(files.map(source))).join("\n");
  assert.match(bundle, /UPSTREAM_TIMEOUT_MS/);
  // 숫자를 직접 적어 두면 한쪽만 바뀌어 다시 역전된다.
  const literalTimeouts = [...bundle.matchAll(/AbortSignal\.timeout\(\s*([0-9_]+)\s*\)/g)].map(([, value]) => value);
  assert.deepEqual(literalTimeouts, [], `상수 대신 숫자를 쓴 곳: ${literalTimeouts.join(", ")}`);
});

test("관광 계획은 요청 전체에 예산을 둔다", async () => {
  // 월을 거슬러 올라가며 반복 조회하는 구간이 있어, 호출마다 건 타임아웃으로는
  // 전체 시간이 잡히지 않는다. 상류가 느리면 4분을 넘길 수 있었다.
  const builder = await source("server/tourism/plan-builder.ts");
  assert.match(builder, /budgetClock\(PLAN_TOTAL_BUDGET_MS\)/);
  const stages = [...builder.matchAll(/withinBudget\(/g)];
  assert.equal(stages.length, 3, "세 단계 모두 남은 예산 안에서 끝나야 한다");
  assert.ok(PLAN_TOTAL_BUDGET_MS < UPSTREAM_TIMEOUT_MS.tourism * 3, "단계별 최악을 그대로 더한 값보다 짧아야 한다");
});

test("예산 안에 끝나면 그 결과를 그대로 쓴다", async () => {
  const result = await withinBudget(Promise.resolve("실제 결과"), 1_000, () => "대체값");
  assert.equal(result, "실제 결과");
});

test("예산을 넘기면 대체값으로 넘어가고 오류로 만들지 않는다", async () => {
  const slow = new Promise((resolve) => setTimeout(() => resolve("너무 늦은 결과"), 5_000));
  const started = Date.now();
  const result = await withinBudget(slow, 60, () => "확인 못 함");
  assert.equal(result, "확인 못 함");
  assert.ok(Date.now() - started < 1_000, "예산을 넘기면 기다리지 않는다");
});

test("남은 예산이 없으면 곧바로 대체값을 쓴다", async () => {
  assert.equal(await withinBudget(new Promise(() => undefined), 0, () => "확인 못 함"), "확인 못 함");
  assert.equal(await withinBudget(new Promise(() => undefined), -5, () => "확인 못 함"), "확인 못 함");
});

test("실패는 삼키지 않고 그대로 올린다", async () => {
  await assert.rejects(withinBudget(Promise.reject(new Error("상류 오류")), 1_000, () => "대체값"), /상류 오류/);
});

test("단계를 지날수록 남은 예산이 줄어든다", () => {
  let now = 1_000;
  const remaining = budgetClock(10_000, () => now);
  assert.equal(remaining(), 10_000);
  now += 4_000;
  assert.equal(remaining(), 6_000);
  now += 9_000;
  assert.equal(remaining(), 0, "예산을 넘겨도 음수가 되지 않는다");
});
