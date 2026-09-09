import assert from "node:assert/strict";
import test from "node:test";
import { assessDepartureReadiness } from "../lib/departure-assessment.js";

const connected = [{ name: "Kakao Mobility", state: "connected" }, { name: "TAGO stop catalogue", state: "connected" }];

test("connected provider responses do not confirm any itinerary journey", () => {
  const result = assessDepartureReadiness({ transportProviders: connected });
  assert.equal(result.items.find(item => item.id === "transport").state, "recheck");
});

test("departure route coverage uses current verified legs and keeps mobility access unconfirmed", () => {
  for (const [verified, expected] of [[0, "recheck"], [1, "partial"], [2, "confirmed"]]) {
    const result = assessDepartureReadiness({ transportProviders: connected, routeCoverage: { total: 2, verified, loading: false } });
    assert.equal(result.items.find(item => item.id === "transport").state, expected);
    assert.equal(result.items.find(item => item.id === "mobility")?.state, "recheck");
    assert.equal(result.state, "recheck");
  }
});

test("loading or invalid coverage cannot turn into checked journeys", () => {
  for (const routeCoverage of [{ total: 2, verified: 2, loading: true }, { total: 0, verified: 0 }, { total: 2, verified: 3 }, { total: 2, verified: -1 }, { total: 2, verified: 1.5 }]) {
    const result = assessDepartureReadiness({ transportProviders: connected, routeCoverage });
    assert.equal(result.items.find(item => item.id === "transport").state, "recheck");
  }
});
