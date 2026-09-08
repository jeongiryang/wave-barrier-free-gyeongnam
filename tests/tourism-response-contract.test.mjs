import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import * as coordinates from "../lib/map-coordinates.js";
import * as accessibility from "../lib/accessibility-score.js";

const root = fileURLToPath(new URL("../", import.meta.url));
function loadServer(fetchFixture = async () => { throw Error("Unexpected provider call"); }) {
  const cache = new Map();
  const load = name => {
    let file = resolve(root, name);
    if (!existsSync(file)) file += ".ts";
    if (file.endsWith("map-coordinates.js")) return coordinates;
    if (file.endsWith("accessibility-score.js")) return accessibility;
    if (file.endsWith("plan-builder.ts")) return { buildPlan: () => { throw Error("Unexpected new recommendation search"); } };
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function("module", "exports", "require", "fetch", code)(mod, mod.exports, specifier => {
      if (!specifier.startsWith(".")) throw Error("Unexpected external dependency");
      return load(resolve(dirname(file), specifier));
    }, fetchFixture);
    return mod.exports;
  };
  return load;
}
const normalize = loadServer()("server/shared/provider-normalizers.ts").normalizeItems;
const success = (items, totalCount = 0) => ({ response: { header: { resultCode: "0000", resultMsg: "OK" }, body: { items, totalCount } } });
const flatParameterError = { resultCode: "10", resultMsg: "INVALID_REQUEST_PARAMETER_ERROR(defaultYN)" };

test("actual flat KTO parameter error never becomes a successful empty result", () => {
  assert.throws(() => normalize(flatParameterError));
  assert.throws(() => normalize({ response: flatParameterError }));
});
test("provider error details never expose arbitrary upstream text", () => {
  for (const data of [
    { ...flatParameterError, resultMsg: "sentinel-private-query" },
    { response: { header: { resultCode: "10", resultMsg: "sentinel-private-query" } } },
  ]) assert.throws(() => normalize(data), error => !error.message.includes("sentinel-private-query"));
});
test("official wrapped and unwrapped successful envelopes preserve exact public records", () => {
  const item = { contentid: "2784014", mapx: "128.628547869107", mapy: "35.2525520086896" };
  const data = success({ item }, 1);
  assert.deepEqual(normalize(data), { items: [item], total: 1 });
  assert.deepEqual(normalize(data.response), { items: [item], total: 1 });
  assert.deepEqual(normalize(success({ item: [item] }, 1)), { items: [item], total: 1 });
});
test("successful zero results remain distinct from errors and missing response bodies", () => {
  for (const items of ["", [], { item: [] }, {}]) assert.deepEqual(normalize(success(items)), { items: [], total: 0 });
  for (const data of [null, [], {}, { resultCode: "0000" }, { response: { header: { resultCode: "0000" } } }, { response: { header: {}, body: { items: "", totalCount: 0 } } }]) assert.throws(() => normalize(data));
});
test("malformed nonempty records and contradictory totals are not empty successes", () => {
  for (const data of [success({ item: "invalid" }, 1), success({ item: [null] }, 1), success("", 1), success({}, -1), success({}, "NaN")]) assert.throws(() => normalize(data));
});
test("public-ID restoration uses the current official request and real wire response", async () => {
  const calls = [];
  const load = loadServer(async input => {
    const url = new URL(input); calls.push(url);
    const allowed = ["MobileOS", "MobileApp", "_type", "contentId", "numOfRows", "pageNo", "serviceKey"];
    if ([...url.searchParams.keys()].some(key => !allowed.includes(key))) return Response.json(flatParameterError);
    return Response.json(success({ item: { contentid: "2784014", mapx: "128.628547869107", mapy: "35.2525520086896" } }, 1));
  });
  const response = await load("server/tourism/place-coordinates.ts").handlePlaceCoordinates(new URL("https://wave.test/api/wave?action=place-coordinates&contentId=2784014"), { TOUR_API_SERVICE_KEY_ENCODED: "fixture" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "available");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].searchParams.get("contentId"), "2784014");
});
test("actual flat provider error reaches the recovery UI as provider-error, not empty", async () => {
  const load = loadServer(async () => Response.json(flatParameterError));
  const response = await load("server/tourism/place-coordinates.ts").handlePlaceCoordinates(new URL("https://wave.test/api/wave?action=place-coordinates&contentId=2784014"), { TOUR_API_SERVICE_KEY_ENCODED: "fixture" });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { id: "2784014", status: "provider-error" });
});
test("shared itinerary restores a current official detail without legacy fields or replacement search", async () => {
  const calls = [];
  const load = loadServer(async input => {
    const url = new URL(input); calls.push(url);
    if (url.pathname.endsWith("detailWithTour2")) return Response.json(success(""));
    assert.ok(url.pathname.endsWith("detailCommon2"));
    const allowed = ["MobileOS", "MobileApp", "_type", "contentId", "numOfRows", "pageNo", "serviceKey"];
    if ([...url.searchParams.keys()].some(key => !allowed.includes(key))) return Response.json(flatParameterError);
    return Response.json(success({ item: { contentid: "2784014", title: "사화공원", addr1: "경상남도 창원시", mapx: "128.628547869107", mapy: "35.2525520086896" } }, 1));
  });
  const { restoreSharedPlan } = load("server/tourism/shared-plan-restoration.ts");
  const result = await restoreSharedPlan({ TOUR_API_SERVICE_KEY_ENCODED: "fixture" }, { placeRefs: [{ contentId: "2784014", order: 0 }] }, { region: "창원", profiles: [] }, Promise.resolve({ places: [], stops: [] }));
  assert.equal(result.restoration.restored, 1);
  assert.equal(result.restoration.missing, 0);
  assert.equal(result.plan.places[0].id, "2784014");
  assert.equal(result.plan.places[0].mapX, "128.628547869107");
  assert.equal(calls.length, 2);
});
