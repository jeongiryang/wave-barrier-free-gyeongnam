import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { verifiedPublicTransport } from "../scripts/production-transport-contract.mjs";

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

// TrainInfo/GetCtyCodeList is an unpaginated catalog in the official TAGO schema:
// https://www.data.go.kr/data/15098552/openapi.do (GetCtyCodeList_response).
const trainCityUrl = "https://apis.data.go.kr/1613000/TrainInfo";
const trainCities = [{ citycode: 11, cityname: "서울특별시" }, { citycode: "26", cityname: "부산광역시" }];

test("TAGO 철도 도시 목록은 공식 비페이지형 응답을 검증하고 실제 항목 수를 표시한다", async () => {
  const calls = [];
  const load = loadServer(async (input) => {
    const url = new URL(input);
    calls.push(url);
    return Response.json(publicResponse(url.pathname.endsWith("/GetCtyCodeList")
      ? { items: { item: trainCities } } : { totalCount: 0, items: [] }));
  });
  const env = { TAGO_API_KEY: "fixture-only" };
  const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot(env, 35.2, 128.6);
  assert.deepEqual(snapshot.trainCatalog, { ok: true, value: { items: trainCities, total: 2 } });
  const { providers } = load("server/transport/public-context-model.ts").buildPublicTransportContext(env, snapshot);
  const rail = providers.find((item) => item.id === "tago-rail-catalog");
  assert.equal(rail.state, "connected");
  assert.equal(rail.queryStatus, "success");
  assert.equal(rail.resultCount, 2);
  assert.equal(verifiedPublicTransport(rail), true);
  const query = calls.find((url) => url.pathname.endsWith("/GetCtyCodeList")).searchParams;
  assert.deepEqual([...query.keys()].sort(), ["_type", "serviceKey"]);
});

test("철도 도시 목록의 단일 항목과 명시적 빈 목록은 구분한다", async () => {
  for (const [items, expected] of [[{ item: trainCities[0] }, [trainCities[0]]], [{ item: [] }, []], ["", []]]) {
    const { fetchPublicTransportData } = loadServer(async () => Response.json(publicResponse({ items })))("server/shared/public-transport-provider.ts");
    assert.deepEqual(await fetchPublicTransportData({ TAGO_API_KEY: "fixture-only" }, "tago", trainCityUrl, "GetCtyCodeList"), { total: expected.length, items: expected });
  }
});

test("도시 목록 계약은 오류·누락·잘못된 도시·중복·불일치 개수를 성공으로 바꾸지 않는다", async () => {
  const invalid = [
    {}, publicResponse({}), publicResponse({ items: {} }),
    publicResponse({ items: { item: trainCities } }, "30"),
    publicResponse({ totalCount: 3, items: { item: trainCities } }),
    publicResponse({ totalCount: null, items: { item: trainCities } }),
    ...[{}, null, { nodeid: "STOP" }, { citycode: 11 }, { citycode: "bad", cityname: "서울" },
      { citycode: true, cityname: "서울" }, { citycode: 11, cityname: " " }, { citycode: 11, cityname: {} }]
      .map((item) => publicResponse({ items: { item: [item] } })),
    publicResponse({ items: { item: [trainCities[0], { citycode: "11", cityname: "서울" }] } }),
  ];
  for (const response of invalid) {
    const { fetchPublicTransportData } = loadServer(async () => Response.json(response))("server/shared/public-transport-provider.ts");
    await assert.rejects(fetchPublicTransportData({ TAGO_API_KEY: "fixture-only" }, "tago", trainCityUrl, "GetCtyCodeList"));
  }
});

test("도시 목록 예외는 다른 제공처·경로·operation의 totalCount 검증을 완화하지 않는다", async () => {
  for (const [provider, url, operation] of [["korail", trainCityUrl, "GetCtyCodeList"], ["tago", "https://provider.invalid", "GetCtyCodeList"], ["tago", trainCityUrl, "other"]]) {
    const { fetchPublicTransportData } = loadServer(async () => Response.json(publicResponse({ items: { item: trainCities } })))("server/shared/public-transport-provider.ts");
    await assert.rejects(fetchPublicTransportData({ TAGO_API_KEY: "fixture-only", KORAIL_API_KEY: "fixture-only" }, provider, url, operation));
  }
});

test("정류장 식별자가 없으면 도착 조회를 실행하지 않고 의존 실패를 전파한다", async () => {
  for (const stop of [{ nodenm: "정류장" }, { nodeid: "STOP" }, { citycode: "38030" }, { nodeid: " ", citycode: "38030" }]) {
    const calls = [];
    const load = loadServer(async (input) => {
      const url = new URL(input);
      calls.push(url.pathname);
      return Response.json(publicResponse(url.pathname.includes("BusSttnInfo")
        ? { totalCount: 1, items: { item: [stop] } } : { totalCount: 0, items: [] }));
    });
    const env = { TAGO_API_KEY: "fixture-only" };
    const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot(env, 35.2, 128.6);
    assert.equal(snapshot.nearbyStops.ok, true);
    assert.equal(snapshot.arrivals?.ok, false);
    assert.ok(calls.every((path) => !path.includes("ArvlInfo")));
    const { providers, context } = load("server/transport/public-context-model.ts").buildPublicTransportContext(env, snapshot);
    assert.equal(providers.find((item) => item.id === "tago-bus-arrival").state, "error");
    assert.match(providers.find((item) => item.id === "tago-bus-arrival").detail, /식별정보.*조회하지/);
    assert.equal(context.datasets.find((item) => item.id === "bus-arrival").state, "error");
    assert.deepEqual(context.arrivals, []);
  }
});

test("기존 snapshot도 정류장 식별자 누락을 도착 준비됨으로 바꾸지 않는다", () => {
  const load = loadServer(() => { throw new Error("The model must not make network calls"); });
  const { providers, context } = load("server/transport/public-context-model.ts").buildPublicTransportContext({}, {
    tagoKey: true, korailKey: false, korailPlans: null, trainCatalog: null, expressCatalog: null, intercityCatalog: null,
    nearbyStops: { ok: true, value: { total: 1, items: [{ nodenm: "정류장" }] } }, arrivals: null,
  });
  assert.equal(providers.find((item) => item.id === "tago-bus-arrival").state, "error");
  assert.equal(context.datasets.find((item) => item.id === "bus-arrival").state, "error");
  assert.deepEqual(context.arrivals, []);
});

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

test("교통 응답은 검증된 빈 조회·미조회·의존 실패를 기계적으로 구분한다", async () => {
  for (const scenario of ["empty", "unqueried", "error"]) {
    const load = loadServer(async (input) => {
      const isStops = new URL(input).pathname.includes("BusSttnInfo");
      if (isStops && scenario === "error") return Response.json({});
      return Response.json(publicResponse(isStops && scenario === "empty"
        ? { totalCount: 1, items: { item: [{ nodeid: "STOP", nodenm: "정류장", citycode: "38030" }] } }
        : { totalCount: 0, items: "" }));
    });
    const env = { TAGO_API_KEY: "fixture-only" };
    const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot(env, 35.2, 128.6);
    const { providers, context } = load("server/transport/public-context-model.ts").buildPublicTransportContext(env, snapshot);
    const expected = scenario === "empty" ? { queryStatus: "success", resultCount: 0 }
      : { queryStatus: scenario === "error" ? "error" : "not-requested", resultCount: null };
    for (const result of [providers.find((item) => item.id === "tago-bus-arrival"), context.datasets.find((item) => item.id === "bus-arrival")]) {
      assert.deepEqual({ queryStatus: result.queryStatus, resultCount: result.resultCount }, expected);
    }
    assert.equal(verifiedPublicTransport(providers.find((item) => item.id === "tago-bus-arrival"), true), scenario === "empty");
  }
});

test("누락된 도착시간·남은 정류장 수를 운행 중 또는 정류장 접근으로 바꾸지 않는다", async () => {
  const load = loadServer(async (input) => {
    const path = new URL(input).pathname;
    return Response.json(publicResponse(path.includes("BusSttnInfo")
      ? { totalCount: 1, items: { item: [{ nodeid: "STOP", nodenm: "정류장", citycode: "38030" }] } }
      : path.includes("ArvlInfo")
        ? { totalCount: 2, items: { item: [{ routeno: "101" }, { routeno: "102", arrtime: 0, arrprevstationcnt: 0 }] } }
        : { totalCount: 0, items: "" }));
  });
  const env = { TAGO_API_KEY: "fixture-only" };
  const snapshot = await load("server/transport/public-provider-queries.ts").fetchPublicTransportSnapshot(env, 35.2, 128.6);
  const { context } = load("server/transport/public-context-model.ts").buildPublicTransportContext(env, snapshot);
  assert.deepEqual(context.arrivals, [{ route: "101", minutes: null, stops: null }, { route: "102", minutes: 0, stops: 0 }]);
});
