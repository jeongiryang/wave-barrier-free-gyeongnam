import assert from "node:assert/strict";
import test from "node:test";
import { parseLocationResults } from "../features/planner/location-results.ts";

const place = { id: "station", name: "창원중앙역", mapX: "128.6982", mapY: "35.2422", address: "경남", category: "기차역" };
test("location search preserves real empty responses and original public place coordinates", () => {
  assert.deepEqual(parseLocationResults({ places: [] }), []);
  assert.deepEqual(parseLocationResults({ places: [place] }), [{ ...place, categoryCode: "", region: "", resultType: "other", summary: "" }]);
});
test("location search keeps region and result type metadata without inventing missing details", () => {
  const enriched = { ...place, region: "창원시", categoryCode: "CE7", resultType: "cafe", summary: "음식점 · 카페" };
  assert.deepEqual(parseLocationResults({ places: [enriched] }), [enriched]);
});
test("malformed location responses cannot become empty success or zero-coordinate destinations", () => {
  for (const response of [null, {}, { places: null }, { places: "invalid" }, { places: [null] },
    { places: [{ ...place, mapX: " " }] }, { places: [{ ...place, mapY: "" }] },
    { places: [{ ...place, mapY: "NaN" }] }, { places: [{ ...place, mapX: "181" }] },
    { places: [{ ...place, mapY: "91" }] }, { places: [{ ...place, name: "" }] }]) {
    assert.throws(() => parseLocationResults(response));
  }
});
