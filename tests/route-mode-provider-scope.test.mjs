import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../server/transport/handler.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture() {
  const calls = [], mod = { exports: {} };
  const providers = ["kakao-drive", "odsay"].map(id => ({ id, configured: true, state: "ready" }));
  const context = { nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] };
  new Function("module", "exports", "require", code)(mod, mod.exports, name => {
    if (name === "../shared/http") return { json: (body, status = 200) => Response.json(body, { status }) };
    if (name === "./kakao-route") return { fetchKakaoRoute: async () => { calls.push("kakao"); return { alternative: null }; } };
    if (name === "./odsay") return { fetchOdsayRoutes: async () => { calls.push("odsay"); return { routes: [] }; } };
    if (name === "./public-context") return { fetchTransportContext: async () => { calls.push("public-context"); return { providers, context }; } };
    if (name === "./route-utils") return { finiteCoordinate: value => value === null ? null : Number(value), haversine: () => 2000 };
    if (name === "../shared/observability") return { recordOperationalEvent() {} };
    if (name === "./health") return {};
    if (name === "../shared/provider-data") return { transportProvider: (id, name, role, configured) => ({ id, name, role, configured, state: "missing", queryStatus: "not-requested" }) };
    throw Error(name);
  });
  return { calls, request: mode => mod.exports.handleRouteApi(new Request(`https://wave.test/api/route?startLat=35.2&startLng=128.6&endLat=35.24&endLng=128.7${mode === undefined ? "" : `&mode=${mode}`}`), {}) };
}

for (const [mode, expected] of [["car", ["kakao"]], ["transit", ["public-context", "odsay"]], ["walk", []], ["bicycle", []]]) {
  test(`${mode} requests only its supported route providers`, async () => {
    const app = fixture();
    const response = await app.request(mode);
    assert.equal(response.status, 200);
    assert.deepEqual(app.calls.sort(), expected.sort());
    const body = await response.json();
    assert.equal(body.configured, false);
    assert.ok(body.alternatives.every(route => !route.configured));
    assert.deepEqual(body.providers.map(provider => provider.id), mode === "car" ? ["kakao-drive"] : mode === "transit" ? ["odsay"] : []);
  });
}

test("an invalid travel mode is rejected before any provider request", async () => {
  const app = fixture();
  assert.equal((await app.request("flying")).status, 400);
  assert.deepEqual(app.calls, []);
});

test("older clients without a mode retain the existing comparison response", async () => {
  const app = fixture();
  assert.equal((await app.request()).status, 200);
  assert.deepEqual(app.calls.sort(), ["kakao", "odsay", "public-context"]);
});
