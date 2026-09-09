import assert from "node:assert/strict";
import test from "node:test";
import { assessDepartureReadiness } from "../lib/departure-assessment.js";

const field = (key, state) => ({ key, label: key, state, detail: state === "unknown" ? "" : "Official record" });
const place = {
  id: "museum", name: "Museum", score: 100, knownFields: 3,
  checkedAt: "2026-09-09T10:00:00Z", source: "Official tourism data",
  accessibility: [field("parking", "confirmed"), field("elevator", "unknown"), field("restroom", "negative")],
};
const assess = (places, extra = {}) => assessDepartureReadiness({
  places, placeCriteriaCurrent: true, currentPlaceIds: [place.id], requiredFacilityKeys: ["parking", "elevator"], ...extra,
}).items.find(item => item.id === "evidence");

test("a positive place score cannot conceal unknown or negative facility records", () => {
  const result = assess([place], { requiredFacilityKeys: ["parking", "elevator", "restroom"] });
  assert.equal(result.state, "recheck");
  assert.match(result.summary, /확인됨 1/);
  assert.match(result.summary, /미확인 1/);
  assert.match(result.summary, /미제공 기록 1/);
  assert.equal(assess([{ ...place, accessibility: [field("parking", "confirmed"), field("elevator", "unknown")] }]).state, "partial");
});

test("only current item-level official evidence confirms every requested facility", () => {
  const complete = { ...place, accessibility: [field("parking", "confirmed"), field("elevator", "confirmed")] };
  assert.equal(assess([complete]).state, "confirmed");
  for (const incomplete of [
    { ...complete, accessibility: undefined }, { ...complete, accessibility: [] },
    { ...complete, checkedAt: "invalid" }, { ...complete, source: "" },
  ]) assert.equal(assess([incomplete]).state, "recheck");
  assert.equal(assess([complete], { placeCriteriaCurrent: false }).state, "recheck");
  assert.equal(assess([complete, { id: "old", score: 100, knownFields: 5 }]).state, "partial");
});

test("duplicate or conflicting fields cannot inflate official facility coverage", () => {
  const result = assess([{ ...place, accessibility: [field("parking", "confirmed"), field("parking", "confirmed"), field("elevator", "confirmed"), field("elevator", "negative")] }]);
  assert.equal(result.state, "partial");
  assert.match(result.summary, /확인됨 1/);
  assert.match(result.summary, /미확인 1/);
});

test("a current search does not renew an archived place absent from its results", () => {
  const complete = { ...place, accessibility: [field("parking", "confirmed")] };
  assert.equal(assess([complete], { currentPlaceIds: ["another-place"], requiredFacilityKeys: ["parking"] }).state, "recheck");
});

test("every currently requested facility is counted even if its field is absent", () => {
  const complete = { ...place, accessibility: [field("parking", "confirmed"), field("unrequested", "confirmed")] };
  const result = assess([complete], { currentPlaceIds: [place.id], requiredFacilityKeys: ["parking", "elevator"] });
  assert.equal(result.state, "partial");
  assert.match(result.summary, /확인됨 1/);
  assert.match(result.summary, /미확인 1/);
});

test("legacy or empty query metadata cannot confirm current facility coverage", () => {
  const complete = { ...place, accessibility: [field("parking", "confirmed"), field("elevator", "confirmed")] };
  for (const extra of [{ requiredFacilityKeys: undefined }, { requiredFacilityKeys: [] }, { currentPlaceIds: undefined }, { currentPlaceIds: [] }]) {
    assert.equal(assess([complete], extra).state, "recheck");
  }
});
