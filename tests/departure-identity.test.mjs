import assert from "node:assert/strict";
import test from "node:test";
import { assessDepartureReadiness } from "../lib/departure-readiness.js";

const first = { id: "one", name: "Museum" };
const second = { id: "two", name: "Lake" };
const evidence = { rate: 31.5, place: "Lake", baseYmd: "20261008" };
const input = { travelStart: "2026-10-08", today: "2026-10-08", places: [second], crowd: evidence, crowdPlaceId: second.id };
const crowdItem = value => assessDepartureReadiness(value).items.find(item => item.id === "crowd");

for (const locale of ["ko", "en"]) {
  test(`departure forecast matches itinerary identity and assigned date in ${locale}`, () => {
    assert.equal(crowdItem({ ...input, locale }).state, "confirmed");
    for (const mismatch of [
      { places: [] }, { places: [first] }, { crowdPlaceId: first.id },
      { crowd: { ...evidence, place: first.name } },
      { travelStart: "2026-10-09" }, { scheduleAssignments: { two: "2026-10-09" } },
      { crowd: { ...evidence, baseYmd: "" } }, { crowd: { ...evidence, rate: NaN } },
      { crowd: { ...evidence, rate: Infinity } }, { crowd: { ...evidence, rate: -1 } },
      { crowd: { ...evidence, rate: 101 } },
    ]) {
      const result = crowdItem({ ...input, ...mismatch, locale });
      assert.equal(result.state, "recheck", JSON.stringify(mismatch));
      assert.ok(!result.summary.includes("31.5%"));
    }
    assert.equal(crowdItem({ ...input, locale, travelStart: "2026-10-07", scheduleAssignments: { two: "2026-10-08" } }).state, "confirmed");
    assert.equal(crowdItem({ ...input, locale, places: [first, second] }).state, "partial");
  });
  test(`provider readiness does not imply API authorisation in ${locale}`, () => {
    for (const providers of [[{ name: "Provider", state: "ready" }], [{ name: "One", state: "connected" }, { name: "Two", state: "ready" }]]) {
      const result = assessDepartureReadiness({ locale, transportProviders: providers }).items.find(item => item.id === "transport");
      assert.doesNotMatch(result.summary, /authorised|authorized|\uC2B9\uC778/);
      assert.notEqual(result.state, "confirmed");
    }
  });
}

test("same-name places without a source ID cannot establish one itinerary forecast", () => {
  assert.equal(crowdItem({ ...input, crowdPlaceId: undefined, places: [second, { id: "three", name: second.name }] }).state, "recheck");
});
