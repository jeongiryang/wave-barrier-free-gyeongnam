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
  places, placeCriteriaCurrent: true, ...extra,
}).items.find(item => item.id === "evidence");

test("a positive place score cannot conceal unknown or negative facility records", () => {
  const result = assess([place]);
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
