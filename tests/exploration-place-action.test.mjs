import assert from "node:assert/strict";
import test from "node:test";
import { explorationPlaceAction } from "../lib/exploration-place-action.js";

const field = (state, key = "route") => ({ key, label: key, state, detail: "" });
function input(overrides = {}) {
  const place = { id: "1001", city: "창원", score: 0, checkedAt: "2026-09-12T10:00:00Z", negativeFields: 0, accessibility: [field("unknown")], ...overrides };
  return { place, plan: { generatedAt: "2026-09-12T10:00:00Z", criteria: { facilityKeys: ["route"] }, explorationPlaces: [place], statuses: [] }, current: true, region: "창원", criteriaKey: '["창원","history",["wheel"]]' };
}

test("zero-score unknown evidence requires explicit acknowledgement without mutating or confirming evidence", () => {
  const value = input({ facilityLookupState: "error" });
  const before = structuredClone(value);
  const result = explorationPlaceAction(value);
  assert.equal(result.kind, "acknowledge");
  assert.equal(result.providerError, true);
  assert.ok(result.key);
  assert.deepEqual(value, before);
  assert.equal(value.place.accessibility[0].state, "unknown");
});

test("explicit required negatives and legacy negatives are blocked; a score cannot override them", () => {
  assert.equal(explorationPlaceAction(input({ score: 100, accessibility: [field("negative")] })).kind, "mismatch");
  assert.equal(explorationPlaceAction(input({ accessibility: [], negativeFields: 1 })).kind, "mismatch");
  assert.equal(explorationPlaceAction(input({ accessibility: [field("unknown"), field("negative", "braileblock")] })).kind, "acknowledge");
});

test("permission is bound to the current response object, numeric tourism ID, and requested region", () => {
  const value = input();
  for (const change of [
    { current: false }, { plan: null }, { place: { ...value.place } }, { region: "진주" }, { region: "" },
    { plan: { ...value.plan, explorationPlaces: [] } },
    { plan: { ...value.plan, explorationPlaces: [value.place, { ...value.place }] } },
  ]) assert.equal(explorationPlaceAction({ ...value, ...change }).kind, "blocked");
  for (const id of ["", "0", "made-up-place", "museum-2"]) assert.equal(explorationPlaceAction(input({ id })).kind, "blocked");
  assert.equal(explorationPlaceAction({ ...value, region: "경남 전체" }).kind, "acknowledge");
  assert.equal(explorationPlaceAction({ ...input({ city: "서울" }), region: "경남 전체" }).kind, "blocked");
});

test("new criteria, timestamps, or records cannot reuse an old acknowledgement key", () => {
  const value = input(), key = explorationPlaceAction(value).key;
  assert.notEqual(explorationPlaceAction({ ...value, criteriaKey: '["창원","history",["senior"]]' }).key, key);
  assert.notEqual(explorationPlaceAction({ ...value, plan: { ...value.plan, generatedAt: "2026-09-12T11:00:00Z" } }).key, key);
  assert.notEqual(explorationPlaceAction(input({ checkedAt: "2026-09-12T11:00:00Z" })).key, key);
  assert.equal(explorationPlaceAction({ ...value, plan: { ...value.plan, explorationPlaces: [{ ...value.place }] } }).kind, "blocked");
});

test("missing selection criteria and fully confirmed records do not invent an unknown-candidate route", () => {
  const value = input();
  assert.equal(explorationPlaceAction({ ...value, plan: { ...value.plan, criteria: {} } }).kind, "blocked");
  assert.equal(explorationPlaceAction(input({ accessibility: [field("confirmed")] })).kind, "blocked");
});
