import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import * as envelope from "../lib/transport/odsay-response.js";
import * as coordinates from "../lib/map-coordinates.js";

const source = readFileSync(new URL("../server/transport/odsay.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const valid = () => ({ result: { searchType: 0, path: [{ pathType: 2, info: { totalTime: 14, totalDistance: 2000, trafficDistance: 1800, totalWalk: 200, payment: 1500 }, subPath: [
  { trafficType: 3, sectionTime: 2, distance: 100 },
  { trafficType: 2, sectionTime: 12, distance: 1800, lane: [{ busNo: "10" }], startX: 128.68, startY: 35.22, endX: 128.69, endY: 35.23 },
  { trafficType: 3, sectionTime: 0, distance: 100 },
] }] } });
async function run(body, { status = 200, fail = false, key = "fixture-not-a-real-key" } = {}) {
  const mod = { exports: {} };
  new Function("module", "exports", "require", "fetch", code)(mod, mod.exports, name => {
    if (name.endsWith("request-budget.js")) return { UPSTREAM_TIMEOUT_MS: { transport: 6000 } };
    if (name.endsWith("map-coordinates.js")) return coordinates;
    if (name.endsWith("site-metadata")) return { SITE_ORIGIN: "https://example.test" };
    if (name.endsWith("odsay-response.js")) return envelope;
    if (name.endsWith("http")) return { clean: value => String(value) };
    throw Error(name);
  }, async () => { if (fail) throw Error("controlled timeout"); return { ok: status === 200, status, json: async () => body }; });
  return mod.exports.fetchOdsayRoutes({ ODSAY_API_KEY: key }, 35.21, 128.67, 35.24, 128.70, 1000);
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
for (const body of [{}, { result: { searchType: 1, path: [{ pathType: 12 }] } }, { result: { path: [{ info: {} }] } }]) test(`API keeps incomplete ${JSON.stringify(body)} unconfirmed`, async () => {
  const result = await api(body); assert.equal(result.configured, false); assert.equal(result.alternatives[0].configured, false); assert.equal(result.alternatives[0].mode, "preview"); assert.equal(result.providers[0].state, "error");
});
