import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));

// Execute the real TypeScript modules with a bounded fixture transport. No keys/network.
function loadServer(fetchFixture) {
  const cache = new Map();
  const load = (name) => {
    let path = resolve(root, name);
    if (!existsSync(path)) path += ".ts";
    if (cache.has(path)) return cache.get(path).exports;
    const compiledModule = { exports: {} };
    cache.set(path, compiledModule);
    const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const require = (specifier) => {
      if (!specifier.startsWith(".")) throw new Error("Unexpected external module in provider fixture");
      return load(resolve(dirname(path), specifier));
    };
    new Function("module", "exports", "require", "fetch", outputText)(compiledModule, compiledModule.exports, require, fetchFixture);
    return compiledModule.exports;
  };
  return load;
}

function fixtureTransport({ failStops = false } = {}) {
  const calls = [];
  const fetch = async (input) => {
    const url = new URL(input);
    calls.push(url);
    if (failStops && url.pathname.includes("BusSttnInfo")) return new Response("unavailable", { status: 503 });
    return Response.json({ response: { header: { resultCode: "00" }, body: { items: [], totalCount: 0 } } });
  };
  return { calls, load: loadServer(fetch) };
}

test("각 공공교통 제공처는 자기 인증키를 사용하고 다른 제공처 키로 대체하지 않는다", async () => {
  const { calls, load } = fixtureTransport();
  const { fetchPublicTransportSnapshot } = load("server/transport/public-provider-queries.ts");
  await fetchPublicTransportSnapshot({ KORAIL_API_KEY: "fixture-korail", TAGO_API_KEY: "fixture-tago", TOUR_API_SERVICE_KEY_ENCODED: "fixture-common" }, 35.2, 128.6);
  assert.equal(calls.length, 5);
  for (const call of calls) assert.equal(call.searchParams.get("serviceKey"), call.pathname.includes("B551457") ? "fixture-korail" : "fixture-tago");
});

test("TAGO만 설정했으면 KORAIL을 호출하지 않고 missing으로 유지한다", async () => {
  const { calls, load } = fixtureTransport();
  const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot({ TAGO_API_KEY: "fixture-tago" }, 35.2, 128.6);
  assert.equal(calls.length, 4);
  assert.equal(snapshot.korailKey, false);
  assert.equal(snapshot.korailPlans, null);
  assert.ok(calls.every((call) => !call.pathname.includes("B551457")));
});

test("공통 공공데이터 키는 두 제공처에 사용할 수 있다", async () => {
  const { calls, load } = fixtureTransport();
  const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot({ TOUR_API_SERVICE_KEY_ENCODED: "fixture-common" }, 35.2, 128.6);
  assert.equal(calls.length, 5);
  assert.ok(snapshot.korailKey && snapshot.tagoKey);
  assert.ok(calls.every((call) => call.searchParams.get("serviceKey") === "fixture-common"));
});

test("KORAIL만 설정했으면 TAGO를 호출하지 않는다", async () => {
  const { calls, load } = fixtureTransport();
  const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot({ KORAIL_API_KEY: "fixture-korail" }, 35.2, 128.6);
  assert.equal(calls.length, 1);
  assert.equal(snapshot.tagoKey, false);
  assert.equal(snapshot.nearbyStops, null);
  assert.ok(calls[0].pathname.includes("B551457"));
});

test("주변 정류장이 빈 결과면 도착 API를 호출하지 않았다고 안내한다", async () => {
  const { calls, load } = fixtureTransport();
  const env = { TAGO_API_KEY: "fixture-tago" };
  const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot(env, 35.2, 128.6);
  const { providers } = load("server/transport/public-context-model.ts").buildPublicTransportContext(env, snapshot);
  const arrival = providers.find((item) => item.id === "tago-bus-arrival");
  assert.equal(arrival.state, "ready");
  assert.match(arrival.detail, /주변 정류장이 없어.*조회하지 않았/);
  assert.ok(calls.every((call) => !call.pathname.includes("ArvlInfo")));
});

test("정류장 실패로 조회하지 못한 도착정보를 준비됨으로 표시하지 않는다", async () => {
  const { calls, load } = fixtureTransport({ failStops: true });
  const env = { TOUR_API_SERVICE_KEY_ENCODED: "fixture-common" };
  const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot(env, 35.2, 128.6);
  const { providers, context } = load("server/transport/public-context-model.ts").buildPublicTransportContext(env, snapshot);
  assert.ok(calls.every((call) => !call.pathname.includes("ArvlInfo")));
  assert.equal(providers.find((item) => item.id === "tago-bus-arrival").state, "error");
  assert.match(providers.find((item) => item.id === "tago-bus-arrival").detail, /정류장/);
  assert.equal(context.datasets.find((item) => item.id === "bus-arrival").state, "error");
  assert.deepEqual(context.arrivals, []);
});

const publicResponse = (body, resultCode = "00") => ({ response: { header: { resultCode }, body } });

test("HTTP 200이어도 공공교통 응답 구조가 불명확하면 정상 0건으로 처리하지 않는다", async () => {
  const invalid = [
    null, {}, [], { message: "denied" },
    { response: { body: { totalCount: 0, items: [] } } },
    { response: { header: {}, body: { totalCount: 0, items: [] } } },
    publicResponse({ items: [] }),
    ...[null, "", true, -1, 1.5, "NaN"].map((totalCount) => publicResponse({ totalCount, items: [] })),
    publicResponse({ totalCount: 1, items: [] }),
    publicResponse({ totalCount: 0, items: { item: [{ nodeid: "STOP" }] } }),
    publicResponse({ totalCount: 1, items: { item: [null] } }),
    publicResponse({ totalCount: 1, items: { item: ["STOP"] } }),
    publicResponse({ totalCount: 1, items: { item: [{ nodeid: { invalid: true } }] } }),
    publicResponse({ totalCount: 0, items: "unexpected" }),
    publicResponse({ totalCount: 0, items: [] }, "30"),
  ];
  for (const body of invalid) {
    const { fetchPublicTransportData } = loadServer(async () => Response.json(body))("server/shared/public-transport-provider.ts");
    await assert.rejects(fetchPublicTransportData({ TAGO_API_KEY: "fixture-only" }, "tago", "https://provider.invalid", "arrivals"));
  }
});

test("공공교통의 명시적 성공·0건과 단일·복수 항목을 유지한다", async () => {
  const row = { nodeid: "STOP", nodenm: "정류장", arrtime: 120 };
  const valid = [
    ...[undefined, "", null, [], {}, { item: [] }].map((items) => ({ body: publicResponse({ totalCount: "0", items }), expected: { total: 0, items: [] } })),
    { body: publicResponse({ totalCount: 1, items: { item: row } }), expected: { total: 1, items: [row] } },
    { body: publicResponse({ totalCount: "2", items: { item: [row, row] } }), expected: { total: 2, items: [row, row] } },
  ];
  for (const { body, expected } of valid) {
    const { fetchPublicTransportData } = loadServer(async () => Response.json(body))("server/shared/public-transport-provider.ts");
    assert.deepEqual(await fetchPublicTransportData({ TAGO_API_KEY: "fixture-only" }, "tago", "https://provider.invalid", "arrivals"), expected);
  }
});

test("잘못된 정류장 응답은 도착정보 조회와 정상 인증 안내로 이어지지 않는다", async () => {
  const calls = [];
  const load = loadServer(async (input) => {
    const url = new URL(input);
    calls.push(url.pathname);
    return Response.json(url.pathname.includes("BusSttnInfo") ? {} : publicResponse({ totalCount: 0, items: [] }));
  });
  const env = { TAGO_API_KEY: "fixture-only" };
  const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot(env, 35.2, 128.6);
  const { providers, context } = load("server/transport/public-context-model.ts").buildPublicTransportContext(env, snapshot);
  for (const id of ["tago-bus-stop", "tago-bus-arrival"]) assert.equal(providers.find((item) => item.id === id).state, "error");
  assert.ok(calls.every((path) => !path.includes("ArvlInfo")));
  assert.deepEqual(context.nearbyStops, []);
  assert.deepEqual(context.arrivals, []);
});

test("검증된 정류장 뒤 실제 도착 조회 0건은 미조회와 다른 안내를 제공한다", async () => {
  const calls = [];
  const load = loadServer(async (input) => {
    const url = new URL(input);
    calls.push(url.pathname);
    return Response.json(publicResponse(url.pathname.includes("BusSttnInfo")
      ? { totalCount: 1, items: { item: [{ nodeid: "STOP", nodenm: "정류장", citycode: "38030" }] } }
      : { totalCount: 0, items: "" }));
  });
  const env = { TAGO_API_KEY: "fixture-only" };
  const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot(env, 35.2, 128.6);
  const { providers } = load("server/transport/public-context-model.ts").buildPublicTransportContext(env, snapshot);
  const arrival = providers.find((item) => item.id === "tago-bus-arrival");
  assert.equal(calls.filter((path) => path.includes("ArvlInfo")).length, 1);
  assert.equal(arrival.state, "ready");
  assert.match(arrival.detail, /현재 조건의 결과가 없습니다/);
  assert.doesNotMatch(arrival.detail, /조회하지 않았/);
});
