import assert from "node:assert/strict";
import test from "node:test";
import {
  movePlaceWithinDay,
  placeMoveAvailability,
  reconcilePlaceOrder,
} from "../features/planner/optimization/manual-order.js";

test("manual order keeps saved places once and appends new places", () => {
  assert.deepEqual(
    reconcilePlaceOrder(["museum", "park", "market"], ["park", "park", "missing", "museum"]),
    ["park", "museum", "market"],
  );
});

test("move buttons swap only places assigned to the same day", () => {
  const assignments = { museum: "2026-09-01", market: "2026-09-02", park: "2026-09-01" };
  assert.deepEqual(
    movePlaceWithinDay(["museum", "market", "park"], "park", "up", assignments, "2026-09-01"),
    ["park", "market", "museum"],
  );
  assert.deepEqual(
    movePlaceWithinDay(["museum", "market", "park"], "museum", "down", assignments, "2026-09-01"),
    ["park", "market", "museum"],
  );
});

test("first and last places expose disabled movement without changing order", () => {
  const ids = ["museum", "park"];
  assert.deepEqual(placeMoveAvailability(ids, "museum"), { up: false, down: true });
  assert.deepEqual(placeMoveAvailability(ids, "park"), { up: true, down: false });
  assert.deepEqual(movePlaceWithinDay(ids, "museum", "up"), ids);
  assert.deepEqual(movePlaceWithinDay(ids, "park", "down"), ids);
});

test("empty and single-place itineraries stay stable", () => {
  assert.deepEqual(reconcilePlaceOrder([], ["museum"]), []);
  assert.deepEqual(movePlaceWithinDay(["museum"], "museum", "down"), ["museum"]);
  assert.deepEqual(placeMoveAvailability(["museum"], "museum"), { up: false, down: false });
});
