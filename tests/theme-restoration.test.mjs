import test from "node:test";
import assert from "node:assert/strict";
import { selectedThemes, normalizeThemes } from "../lib/planner-criteria.js";
import { sanitizeTravelBook, travelBookRestorePayload } from "../lib/travel-book.js";
import { emptyTrip, replaceCurrentTrip, writeTripValue, readTripValue, THEMES_KEY, CURRENT_TRIP_KEY } from "../lib/current-trip-storage.js";

test("restored activity IDs are canonical and empty/invalid selections never invent an activity", () => {
  assert.deepEqual(selectedThemes(" food,nature,food,invalid,history "), ["nature", "history", "food"]);
  for (const value of [undefined, null, {}, [], "", "invalid", [null, {}, "bad"]]) assert.deepEqual(selectedThemes(value), []);
  assert.deepEqual(normalizeThemes("invalid"), ["nature"], "existing server fallback is unchanged");
});

test("archive migration prefers themes, including an explicit empty array, and preserves old single labels", () => {
  const book = { region: "창원", travelStart: "2026-10-08", travelEnd: "2026-10-09", places: [{ id: "1001", name: "미술관" }], theme: "자연·휴양" };
  assert.deepEqual(travelBookRestorePayload(book).themes, ["nature"]);
  assert.deepEqual(travelBookRestorePayload({ ...book, theme: "자연·휴양,음식" }).themes, ["nature", "food"]);
  assert.deepEqual(travelBookRestorePayload({ ...book, theme: "자연" }).themes, ["nature"]);
  assert.deepEqual(travelBookRestorePayload({ ...book, theme: "nature,food" }).themes, ["nature", "food"]);
  assert.deepEqual(sanitizeTravelBook({ ...book, themes: ["food", "history", "food"] }).themes, ["history", "food"]);
  assert.deepEqual(travelBookRestorePayload({ ...book, themes: [] }).themes, []);
  assert.deepEqual(travelBookRestorePayload({ ...book, themes: ["invalid"] }).themes, []);
});

test("theme restoration commits with the itinerary, survives subsequent place writes, and clears for a new trip", () => {
  const entries = new Map([["wave-travel-book-v1", "archived"]]);
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  replaceCurrentTrip(storage, { ...emptyTrip("창원", "2026-10-08", "2026-10-09"), [THEMES_KEY]: '["nature","food"]' });
  writeTripValue(storage, "wave-saved-places", '["1001"]');
  assert.equal(readTripValue(storage, THEMES_KEY), '["nature","food"]');
  const before = storage.getItem(CURRENT_TRIP_KEY);
  assert.throws(() => replaceCurrentTrip({ ...storage, setItem: () => { throw Error("quota"); } }, emptyTrip("진주", "2026-10-10", "2026-10-11")), /quota/);
  assert.equal(storage.getItem(CURRENT_TRIP_KEY), before);
  replaceCurrentTrip(storage, emptyTrip("진주", "2026-10-10", "2026-10-11"));
  assert.equal(readTripValue(storage, THEMES_KEY), "[]");
  assert.equal(storage.getItem("wave-travel-book-v1"), "archived");
});
