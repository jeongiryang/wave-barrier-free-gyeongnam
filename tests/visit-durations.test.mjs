import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeVisitDurations } from "../lib/visit-durations.js";
import { createTravelBookSnapshot, travelBookRestorePayload } from "../lib/travel-book.js";
import { bookToAccountTrip } from "../lib/account-travel/model.js";
import { publicTravelBody } from "../lib/kakao-travel.js";

test("visit choices remain in archive, restore, account and public share without unknown IDs", () => {
  const book = createTravelBookSnapshot({ region: "창원", travelStart: "2026-09-11", travelEnd: "2026-09-11", places: [{ id: "1001", name: "미술관" }, { id: "1002", name: "공원" }], visitMinutesByPlaceId: { "1001": 137, "1002": 15, other: 90 } });
  const expected = { "1001": 137, "1002": 15 };
  assert.deepEqual(book.visitMinutesByPlaceId, expected);
  assert.deepEqual(travelBookRestorePayload(book).schedule.visitMinutesByPlaceId, expected);
  const account = bookToAccountTrip(book);
  assert.deepEqual(account.visitMinutesByPlaceId, expected);
  assert.deepEqual(publicTravelBody(account).selections.visitMinutesByPlaceId, expected);
});

test("invalid and inherited duration values never override defaults", () => {
  assert.deepEqual(sanitizeVisitDurations(Object.assign(Object.create({ inherited: 30 }), { valid: 720, a: true, b: "60", c: 30.5, d: 14, e: 721, f: null }), ["valid", "inherited", "a", "b", "c", "d", "e", "f"]), { valid: 720 });
  assert.deepEqual(sanitizeVisitDurations(null), {});
});
