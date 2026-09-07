import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as coordinates from "../lib/map-coordinates.js";

const code = ts.transpileModule(readFileSync(new URL("../server/tourism/place-coordinates.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
async function run(items, { id = "1001", error = false } = {}) {
  const mod = { exports: {} }, calls = [];
  new Function("module", "exports", "require", code)(mod, mod.exports, name => {
    if (name.endsWith("map-coordinates.js")) return coordinates;
    if (name.endsWith("/http")) return { json: (body, status = 200) => ({ body, status }) };
    if (name.endsWith("/provider-data")) return {
      commonParams: () => ({ numOfRows: "1" }),
      fetchTourismData: async (...args) => { calls.push(args.slice(1)); return { items }; },
      attemptProvider: async promise => error ? { ok: false } : { ok: true, value: await promise },
    };
    throw Error(name);
  });
  const result = await mod.exports.handlePlaceCoordinates(new URL(`https://wave.test/api/wave?action=place-coordinates&contentId=${encodeURIComponent(id)}`), {});
  return { ...result, calls };
}
test("public-ID restore binds official coordinates to the exact requested ID", async () => {
  const result = await run([{ contentid: "1001", mapx: "128.691", mapy: "35.238" }]);
  assert.deepEqual(result.body, { id: "1001", status: "available", mapX: "128.691", mapY: "35.238", source: "ⓒ한국관광공사" });
  assert.equal(result.status, 200);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][0], "KorService2");
  assert.equal(result.calls[0][1], "detailCommon2");
  assert.equal(result.calls[0][2].contentId, "1001");
  assert.doesNotMatch(JSON.stringify(result.calls), /startLat|startLng|profiles|gps|serviceKey/);
});
for (const id of ["", "0", "map-place", "1001,1002", "1001&serviceKey=x", "https://example.org", "1234567890123"]) {
  test(`invalid public ID is rejected before calling the provider: ${id}`, async () => {
    const result = await run([], { id });
    assert.equal(result.status, 400); assert.deepEqual(result.calls, []);
  });
}
test("empty, unavailable coordinates, mismatch and provider errors remain distinct", async () => {
  assert.equal((await run([])).body.status, "empty");
  assert.equal((await run([{ contentid: "1001" }])).body.status, "coordinates-missing");
  assert.equal((await run([{ contentid: "9999", mapx: "128.6", mapy: "35.2" }])).body.status, "invalid-response");
  assert.equal((await run([], { error: true })).body.status, "provider-error");
});
for (const [mapx, mapy] of [["0", "0"], ["139.7", "35.6"], ["128", "NaN"], ["128", "Infinity"], ["1e999", "35"]]) {
  test(`invalid coordinates are never restored: ${mapx},${mapy}`, async () => {
    const result = await run([{ contentid: "1001", mapx, mapy }]);
    assert.equal(result.status, 502); assert.equal(result.body.status, "invalid-response");
    assert.equal(result.body.mapX, undefined); assert.equal(result.body.mapY, undefined);
  });
}
