import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as coordinates from "../lib/map-coordinates.js";
import { resolveSavedPlaces } from "../lib/saved-place-catalog.js";

const code = ts.transpileModule(readFileSync(new URL("../features/planner/hooks/useRouteRequest.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function requestFixture() {
  const mod = { exports: {} }, calls = [], notices = [];
  new Function("module", "exports", "require", code)(mod, mod.exports, name => {
    if (name === "react") return { useState: value => [value, () => {}], useRef: value => ({ current: value }), useCallback: fn => fn, useEffect() {} };
    if (name.endsWith("map-coordinates.js")) return coordinates;
    if (name.endsWith("route-estimates.js")) return { hasJourneyEstimate: () => false };
    if (name.endsWith("/route-copy")) return { routeResultNotice: () => ({ ko: "checked", en: "checked" }) };
    if (name.endsWith("/route-data")) return {
      fetchDestinationCrowd: async (...args) => { calls.push(["crowd", ...args]); return null; },
      fetchRouteData: async (...args) => { calls.push(["route", ...args]); return { alternatives: [], providers: [] }; },
    };
    throw Error(name);
  });
  return { calls, notices, run: options => mod.exports.useRouteRequest("창원").loadRouteData({
    origin: { lat: 35.2, lng: 128.6 }, originLabel: "public station", privateOrigin: false,
    onNotice: message => notices.push(message), onActiveRouteChange() {}, ...options,
  }) };
}
const place = { id: "1001", name: "public museum", mapX: "128.691", mapY: "35.238" };
for (const [mapX, mapY] of [["0", "0"], ["139.7", "35.6"], ["NaN", "35.2"], ["128.6", "Infinity"], ["128.6", ""]]) {
  test(`invalid destination cannot start route or crowd requests: ${mapX},${mapY}`, async () => {
    const app = requestFixture(); await app.run({ place: { ...place, mapX, mapY } });
    assert.deepEqual(app.calls, []); assert.ok(app.notices[0].ko); assert.ok(app.notices[0].en);
  });
}
test("an invalid origin is blocked but a valid same-place journey reaches the provider", async () => {
  const app = requestFixture(); await app.run({ place, origin: { lat: 0, lng: 0 } });
  assert.deepEqual(app.calls, []);
  await app.run({ place, origin: { lat: 35.238, lng: 128.691 } });
  const call = app.calls.find(call => call[0] === "route"); assert.ok(call);
  assert.deepEqual(call[1], call[2]);
});
test("ID-bound catalog coordinates repair an incomplete recommendation without changing evidence", () => {
  const incomplete = { ...place, mapX: "0", mapY: "0", score: 10, knownFields: 2 };
  const [repaired] = resolveSavedPlaces([place.id], [incomplete], [{ ...place, score: 99, knownFields: 9 }]);
  assert.equal(repaired.mapX, place.mapX); assert.equal(repaired.mapY, place.mapY);
  assert.equal(repaired.score, 10); assert.equal(repaired.knownFields, 2);
  assert.equal(resolveSavedPlaces([place.id], [incomplete], [{ ...place, id: "9999" }])[0].mapX, "0");
});
