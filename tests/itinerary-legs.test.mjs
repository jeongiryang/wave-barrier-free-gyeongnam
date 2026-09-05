import assert from "node:assert/strict";
import test from "node:test";
import { buildItineraryLegs, usableLegRoutes } from "../lib/itinerary-legs.js";

const a = { id: "a", name: "첫 장소", mapX: "128.691", mapY: "35.238" };
const b = { id: "b", name: "다음 장소", mapX: "128.683", mapY: "35.229" };
const c = { id: "c", name: "다른 날", mapX: "128.6", mapY: "35.3" };
const options = { places: [a, b, c], days: ["2026-10-08", "2026-10-09"], assignments: { c: "2026-10-09" }, origin: { lat: 35.2, lng: 128.5 }, originLabel: "공개 출발 거점" };

test("every day restarts at its declared origin and never crosses a day boundary", () => {
  const legs = buildItineraryLegs(options);
  assert.deepEqual(legs.map((leg) => [leg.fromLabel, leg.place.id, leg.day]), [["공개 출발 거점", "a", "2026-10-08"], ["첫 장소", "b", "2026-10-08"], ["공개 출발 거점", "c", "2026-10-09"]]);
  assert.deepEqual(legs[1].from, { lat: 35.238, lng: 128.691 });
  assert.deepEqual(legs[2].from, options.origin);
});

test("reordering, rescheduling, deletion and changing origin invalidate the affected legs", () => {
  const before = buildItineraryLegs(options).map((leg) => leg.key);
  for (const changed of [{ places: [b, a, c] }, { assignments: { b: "2026-10-09", c: "2026-10-09" } }, { places: [a, c] }, { origin: { lat: 35.1, lng: 128.5 } }]) {
    assert.notDeepEqual(buildItineraryLegs({ ...options, ...changed }).map((leg) => leg.key), before);
  }
  assert.deepEqual(buildItineraryLegs({ ...options, days: ["2026-10-09"], assignments: { a: "2026-10-08", b: "2026-10-08", c: "2026-10-09" } }).map((leg) => leg.place.id), ["c"]);
});

test("device origins are blocked, missing coordinates are not silently bypassed", () => {
  assert.deepEqual(buildItineraryLegs({ ...options, privateOrigin: true }).map((leg) => leg.blocked), [true, false, true]);
  const missing = buildItineraryLegs({ ...options, places: [{ ...a, mapX: "" }, b] });
  assert.equal(missing[0].to, null);
  assert.equal(missing[1].from, null);
  assert.equal(missing[1].fromLabel, "첫 장소");
});

test("only real routes for the chosen mode count as complete", () => {
  const bundle = { alternatives: [{ configured: true, totalTime: 25, mode: "car" }, { configured: false, totalTime: 10, mode: "transit" }, { configured: true, totalTime: NaN, mode: "bus" }, { configured: true, totalTime: 40, mode: "transit" }] };
  assert.deepEqual(usableLegRoutes(bundle, "car"), [bundle.alternatives[0]]);
  assert.deepEqual(usableLegRoutes(bundle, "transit"), [bundle.alternatives[3]]);
  assert.deepEqual(usableLegRoutes(bundle, "walk"), []);
});
