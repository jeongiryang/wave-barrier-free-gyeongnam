import test from "node:test";
import assert from "node:assert/strict";
import { CURRENT_TRIP_KEY, REGION_KEY, emptyTrip, readTripValue, replaceCurrentTrip, writeTripValue } from "../lib/current-trip-storage.js";
import { buildItinerarySchedule } from "../features/planner/optimization/itinerary-schedule.js";

function storage() {
  const entries = new Map([["wave-saved-places", '["old"]'], ["wave-trip-order-v1", '{"mode":"manual","ids":["old"]}'], ["wave-travel-book-v1", '["archive"]']]);
  return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
}
test("a new trip commits IDs, catalogue, dates and order together, preserving archived trips", () => {
  const store = storage(), fresh = emptyTrip("Hadong", "2026-09-07", "2026-09-08");
  replaceCurrentTrip(store, fresh);
  for (const [key, value] of Object.entries(fresh)) assert.equal(readTripValue(store, key), value);
  assert.equal(store.getItem("wave-travel-book-v1"), '["archive"]');
  writeTripValue(store, "wave-saved-places", '["new"]');
  assert.equal(readTripValue(store, "wave-saved-places"), '["new"]');
  assert.equal(readTripValue(store, REGION_KEY), "Hadong");
});
test("an interrupted mirror write and reload cannot resurrect the previous itinerary", () => {
  const store = storage(), set = store.setItem;
  store.setItem = (key, value) => { if (key !== CURRENT_TRIP_KEY) throw Error("quota"); set(key, value); };
  replaceCurrentTrip(store, emptyTrip("Hadong", "2026-09-07", "2026-09-08"));
  assert.equal(store.getItem("wave-saved-places"), '["old"]');
  assert.equal(readTripValue(store, "wave-saved-places"), "[]");
  assert.equal(JSON.parse(readTripValue(store, "wave-trip-order-v1")).mode, "auto");
});
test("failed commit preserves all old values; damaged canonical data never falls back to an older trip", () => {
  const store = storage(), before = [...store.entries];
  store.setItem = () => { throw Error("quota"); };
  assert.throws(() => replaceCurrentTrip(store, emptyTrip("Hadong", "2026-09-07", "2026-09-08")), /quota/);
  assert.deepEqual([...store.entries], before);
  store.entries.set(CURRENT_TRIP_KEY, '{"version":99}');
  assert.throws(() => readTripValue(store, "wave-saved-places"), /INVALID_CURRENT_TRIP/);
});
test("a journey arriving after midnight is warned even when its visit ends the same following day", () => {
  const result = buildItinerarySchedule({ places: [{ id: "far", mapX: "127.75", mapY: "35.06" }], days: ["2026-09-07"], startTime: "23:30", origin: { lat: 35.23, lng: 128.69 }, routeMinutesByPlaceId: { far: 120 } });
  assert.equal(result[0].entries[0].crossesDateBoundary, true);
});
