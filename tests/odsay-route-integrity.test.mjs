import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import * as envelope from "../lib/transport/odsay-response.js";
import * as coordinates from "../lib/map-coordinates.js";
import * as failures from "../lib/provider-failure.js";
import {createProviderRequester} from "../server/shared/provider-request.js";

const source = readFileSync(new URL("../server/transport/odsay.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const valid = () => ({ result: { searchType: 0, path: [{ pathType: 2, info: { totalTime: 14, totalDistance: 2000, trafficDistance: 1800, totalWalk: 200, payment: 1500 }, subPath: [
  { trafficType: 3, sectionTime: 2, distance: 100 },
  { trafficType: 2, sectionTime: 12, distance: 1800, lane: [{ busNo: "10" }], startX: 128.6705, startY: 35.2105, endX: 128.6995, endY: 35.2395 },
  { trafficType: 3, sectionTime: 0, distance: 100 },
] }] } });
async function run(body, { status = 200, fail = false, key = "fixture-not-a-real-key" } = {}) {
  const mod = { exports: {} };
  new Function("module", "exports", "require", "fetch", code)(mod, mod.exports, name => {
    if (name.endsWith("request-budget.js")) return { UPSTREAM_TIMEOUT_MS: { transport: 6000 } };
    if (name.endsWith("map-coordinates.js")) return coordinates;
    if (name.endsWith("site-metadata")) return { SITE_ORIGIN: "https://example.test" };
    if (name.endsWith("odsay-response.js")) return envelope;
    if (name.endsWith("provider-failure.js")) return failures;
    if (name.endsWith("provider-request.js")) return {requestProvider:createProviderRequester()};
    if (name.endsWith("http")) return { clean: value => String(value) };
    throw Error(name);
  }, async () => { if (fail) throw Error("controlled timeout"); return { ok: status === 200, status, json: async () => body }; });
  return mod.exports.fetchOdsayRoutes({ ODSAY_API_KEY: key }, 35.21, 128.67, 35.24, 128.70);
}
test("complete city route retains actual totals and zero-minute walking transfers", async () => {
  const result = await run(valid());
  assert.equal(result.provider.state, "connected");
  assert.equal(result.routes[0].totalTime, 14);
  assert.equal(result.routes[0].totalDistance, 2000);
  assert.equal(result.routes[0].segments[2].minutes, 0);
  assert.equal(result.routes[0].transfers, 0);
});
for (const body of [null, {}, { result: {} }, { result: { path: null } }]) test(`malformed envelope ${JSON.stringify(body)} is not no-result`, async () => {
  const result = await run(body); assert.deepEqual(result.routes, []); assert.equal(result.provider.state, "error");
});
for (const [name, change] of [
  ["missing total time", p => delete p.info.totalTime], ["zero total time", p => p.info.totalTime = 0], ["blank time", p => p.info.totalTime = ""],
  ["missing distance", p => { delete p.info.totalDistance; delete p.info.trafficDistance; }], ["negative distance", p => p.info.totalDistance = -1],
  ["missing walking distance", p => delete p.info.totalWalk], ["empty subpaths", p => p.subPath = []], ["unknown vehicle", p => p.subPath[1].trafficType = 99],
  ["missing segment time", p => delete p.subPath[1].sectionTime], ["negative segment time", p => p.subPath[1].sectionTime = -1],
  ["blank stop coordinate", p => p.subPath[1].startX = ""], ["out of range stop", p => p.subPath[1].startY = 100],
  ["missing stop coordinate", p => delete p.subPath[1].endY], ["null subpath", p => p.subPath[1] = null],
  ["zero coordinate", p => { p.subPath[1].startX = 0; p.subPath[1].startY = 0; }], ["outside service region", p => p.subPath[1].startX = 139.7],
]) test(`${name} cannot become a confirmed city route`, async () => {
  const body = valid(); change(body.result.path[0]); const result = await run(body);
  assert.deepEqual(result.routes, []); assert.equal(result.provider.state, "error");
});
test("terminal-only intercity search requires first and last mile confirmation", async () => {
  const body = valid(); body.result.searchType = 1; body.result.path[0].pathType = 12;
  const result = await run(body); assert.deepEqual(result.routes, []); assert.notEqual(result.provider.state, "connected");
  assert.match(result.provider.detail, /터미널/);
});
test("invalid alternative does not discard another complete city route", async () => {
  const body = valid(); body.result.path.unshift({ info: {} });
  const result = await run(body); assert.equal(result.routes.length, 1); assert.equal(result.provider.state, "connected");
});
test("transport distance plus walking distance is used only when total is absent", async () => {
  const body = valid(); delete body.result.path[0].info.totalDistance;
  const result = await run(body); assert.equal(result.routes[0].totalDistance, 2000);
});
test("raw upstream error text and arbitrary codes never reach public provider details", async () => {
  const result = await run({ error: { code: "fixture-sensitive-value", msg: "fixture-sensitive-value" } });
  assert.equal(result.provider.state, "error"); assert.doesNotMatch(result.provider.detail, /fixture-sensitive-value/);
});
test("documented no-route error codes stay distinct from upstream errors", async () => {
  for (const code of [3, 4, 5, 6, -98, -99]) {
    const result = await run({ error: { code, msg: "no route" } }); assert.equal(result.provider.state, "ready"); assert.deepEqual(result.routes, []);
  }
  for (const code of [500, -8, -9]) assert.equal((await run({ error: { code } })).provider.state, "error");
});
test("empty success, missing credential, HTTP errors and timeout remain distinct", async () => {
  assert.equal((await run({ result: { path: [] } })).provider.state, "ready");
  assert.equal((await run(valid(), { key: "" })).provider, null);
  for (const status of [401, 403, 429, 503]) assert.equal((await run(valid(), { status })).provider.state, "error");
  assert.equal((await run(valid(), { fail: true })).provider.state, "error");
});

async function api(body) {
  const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const utils = { exports: {} }; new Function("module", "exports", compile("../server/transport/route-utils.ts"))(utils, utils.exports);
  const mod = { exports: {} };
  const dependencies = {
    "./odsay": { fetchOdsayRoutes: () => run(body) }, "./kakao-route": { fetchKakaoRoute: async () => ({ alternative: null, provider: null }) },
    "./public-context": { fetchTransportContext: async () => ({ providers: [{ id: "odsay", configured: true, state: "ready" }], context: {} }) },
    "./route-utils": utils.exports, "./health": {}, "../shared/observability": { recordOperationalEvent() {} },
    "../shared/http": { json: (value, status) => new Response(JSON.stringify(value), { status }) },
  };
  new Function("module", "exports", "require", compile("../server/transport/handler.ts"))(mod, mod.exports, name => { if (name in dependencies) return dependencies[name]; throw Error(name); });
  return (await mod.exports.handleRouteApi(new Request("https://example.test/api/route?startLat=35.21&startLng=128.67&endLat=35.24&endLng=128.70"), {})).json();
}
test("API only confirms a complete city alternative", async () => {
  const result = await api(valid()); assert.equal(result.configured, true); assert.equal(result.alternatives[0].mode, "transit"); assert.equal(result.providers[0].state, "connected");
});

for (const [name, change, message] of [
  ["Seoul stops for a Gyeongnam request", p => Object.assign(p.subPath[1], { startX: 127, startY: 37.5, endX: 127.01, endY: 37.51 }), /출발·도착/],
  ["unrelated arrival only", p => Object.assign(p.subPath[1], { endX: 127, endY: 37.5 }), /출발·도착/],
  ["reversed boarding and alighting", p => Object.assign(p.subPath[1], { startX: 128.6995, startY: 35.2395, endX: 128.6705, endY: 35.2105 }), /출발·도착/],
  ["implausible declared walk cannot authorize Seoul", p => { Object.assign(p.subPath[1], { startX: 127, startY: 37.5 }); p.subPath[0].distance = 400000; p.info.totalWalk = 400100; }, /출발·도착/],
  ["missing access walk distance", p => delete p.subPath[0].distance, /도보·환승/],
  ["missing egress walk distance", p => delete p.subPath[2].distance, /도보·환승/],
  ["zero access distance despite distant stop", p => { p.subPath[0].distance = 0; p.info.totalWalk = 100; }, /출발·도착/],
  ["total walking distance omits access and egress", p => p.info.totalWalk = 0, /도보·환승/],
  ["missing boarding coordinate", p => delete p.subPath[1].startX, /위치가 빠져/],
  ["outside coordinate envelope", p => p.subPath[1].startX = 139, /지원 좌표 범위/],
  ["unconnected transfer with valid request endpoints", p => {
    const second = { ...p.subPath[1], startX: 127, startY: 37.5 };
    p.subPath.splice(2, 0, { trafficType: 3, sectionTime: 0, distance: 0 }, second);
  }, /도보·환승/],
]) test(`${name} remains unconfirmed through the public API`, async () => {
  const body = valid(); change(body.result.path[0]);
  const result = await api(body);
  assert.equal(result.configured, false);
  assert.deepEqual(result.alternatives.map(route => route.mode), ["preview"]);
  assert.equal(result.alternatives[0].configured, false);
  assert.equal(result.providers[0].state, "error");
  assert.match(result.providers[0].detail, message);
});

test("adjacent rides keep a real zero-minute zero-distance transfer", async () => {
  const body = valid(); const path = body.result.path[0];
  const second = { ...path.subPath[1], startX: 128.685, startY: 35.225 };
  Object.assign(path.subPath[1], { endX: 128.685, endY: 35.225 });
  path.subPath.splice(2, 0, { trafficType: 3, sectionTime: 0, distance: 0 }, second);
  const result = await run(body);
  assert.equal(result.provider.state, "connected");
  assert.equal(result.routes[0].transfers, 1);
  assert.equal(result.routes[0].segments[2].minutes, 0);
});

test("a documented access walk over 1 km can connect without claiming accessibility", async () => {
  const body = valid(); const path = body.result.path[0];
  Object.assign(path.subPath[1], { startX: 128.68, startY: 35.22 });
  path.subPath[0].distance = 1600; path.info.totalWalk = 1700;
  const result = await run(body);
  assert.equal(result.provider.state, "connected");
  assert.equal(result.routes[0].totalWalk, 1700);
  assert.equal(result.routes[0].segments[0].type, "walk");
});

test("missing walk segments only permit colocated endpoints", async () => {
  const body = valid(); const path = body.result.path[0];
  path.subPath = [path.subPath[1]]; path.info.totalWalk = 0;
  assert.equal((await run(body)).provider.state, "error");
  Object.assign(path.subPath[0], { startX: 128.67, startY: 35.21, endX: 128.70, endY: 35.24 });
  assert.equal((await run(body)).provider.state, "connected");
});

test("unchecked optional walk geometry cannot insert unrelated points", async () => {
  const body = valid(); Object.assign(body.result.path[0].subPath[0], { startX: 127, startY: 37.5, endX: 127.01, endY: 37.51 });
  const result = await run(body);
  assert.equal(result.provider.state, "connected");
  assert.equal(result.routes[0].geometry.length, 4);
  assert.ok(result.routes[0].geometry.every(point => point.lat < 36));
});

test("an unrelated alternative does not hide a valid request-matching route", async () => {
  const body = valid(); const unrelated = structuredClone(body.result.path[0]);
  Object.assign(unrelated.subPath[1], { startX: 127, startY: 37.5 });
  body.result.path.unshift(unrelated);
  const result = await api(body);
  assert.equal(result.configured, true); assert.equal(result.alternatives.length, 1);
  assert.equal(result.providers[0].state, "connected");
  assert.ok(result.alternatives[0].geometry.every(point => point.lat < 36));
});

test("empty, upstream failure, missing coordinates, unsupported coordinates and disconnected endpoints have different public details", async () => {
  const missing = valid(); delete missing.result.path[0].subPath[1].startX;
  const outside = valid(); outside.result.path[0].subPath[1].startX = 139;
  const mismatch = valid(); mismatch.result.path[0].subPath[1].startY = 37.5;
  const results = await Promise.all([{ result: { path: [] } }, { error: { code: 500 } }, missing, outside, mismatch].map(run));
  assert.deepEqual(results.map(result => result.provider.state), ["ready", "error", "error", "error", "error"]);
  assert.equal(new Set(results.map(result => result.provider.detail)).size, 5);
});
for (const body of [{}, { result: { searchType: 1, path: [{ pathType: 12 }] } }, { result: { path: [{ info: {} }] } }]) test(`API keeps incomplete ${JSON.stringify(body)} unconfirmed`, async () => {
  const result = await api(body); assert.equal(result.configured, false); assert.equal(result.alternatives[0].configured, false); assert.equal(result.alternatives[0].mode, "preview"); assert.equal(result.providers[0].state, "error");
});
