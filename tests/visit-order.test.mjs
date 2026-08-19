import assert from "node:assert/strict";
import test from "node:test";
import { directDistanceKm, explainVisitOrder, optimizeVisitOrder, placeCost } from "../features/planner/optimization/visit-order.js";

const origin = { lat: 35.23, lng: 128.68 };
const near = { id: "near", mapY: "35.24", mapX: "128.69", confidence: 90 };
const far = { id: "far", mapY: "35.7", mapX: "128.9", confidence: 90 };

test("visit order uses coordinate distance without inventing route duration", () => {
  assert.ok(directDistanceKm(origin, near) < directDistanceKm(origin, far));
  assert.deepEqual(optimizeVisitOrder([far, near], { origin }).map((place) => place.id), ["near", "far"]);
  assert.match(explainVisitOrder([near, far], origin), /실제 이동시간은 경로 화면/);
});

test("visit cost can account for accessibility confidence and closing constraints", () => {
  const uncertain = { ...near, confidence: 10, negativeFields: 2 };
  assert.ok(placeCost(origin, uncertain) > placeCost(origin, near));
  assert.ok(placeCost(origin, { ...near, closesAt: 60, visitMinutes: 90 }, { arrivalMinutes: 30 }) > 1000);
});

test("places without coordinates remain available as a deterministic fallback", () => {
  const unknown = { id: "unknown" };
  assert.deepEqual(optimizeVisitOrder([unknown, near], { origin }).map((place) => place.id), ["near", "unknown"]);
});
