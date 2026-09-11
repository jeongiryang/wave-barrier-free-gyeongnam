import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeFixedVisits, sanitizeDayDeadlines, preserveFixedVisitOrder, assessDayDeadline } from "../lib/trip-time-constraints.js";
import { buildItinerarySchedule } from "../features/planner/optimization/itinerary-schedule.js";
import { placeMoveAvailability, movePlaceWithinDay } from "../features/planner/optimization/manual-order.js";
import { createTravelBookSnapshot, travelBookRestorePayload } from "../lib/travel-book.js";
import { bookToAccountTrip } from "../lib/account-travel/model.js";
import { publicTravelBody } from "../lib/kakao-travel.js";
const fixed = { kind: "event", position: 1, time: "13:00" };
const deadline = { time: "18:00", returnMinutes: 60, bufferMinutes: 15 };

test("time preferences allow only bounded user choices and public selected IDs", () => {
  assert.deepEqual(sanitizeFixedVisits({ a: { ...fixed, address: "private", position: 0 }, b: fixed, c: { ...fixed, position: -1 }, d: { ...fixed, kind: "hospital" } }, ["a", "c", "d"]), { a: { ...fixed, position: 0 } });
  assert.deepEqual(sanitizeFixedVisits({ a: { ...fixed, time: "25:00" } }), { a: { ...fixed, time: "" } });
  assert.deepEqual(sanitizeFixedVisits(JSON.parse('{"__proto__":{"kind":"visit","position":0,"time":"12:00"}}')), {});
  assert.deepEqual(sanitizeDayDeadlines({ "2026-02-30": deadline, "2026-09-14": { ...deadline, returnMinutes: "30" }, "2026-09-15": { ...deadline, bufferMinutes: 121 } }), {});
  assert.deepEqual(sanitizeDayDeadlines({ "2026-09-14": deadline, "2026-09-15": deadline }, ["2026-09-14"]), { "2026-09-14": deadline });
});

test("reordering keeps pinned daily slots while flexible places can still change", () => {
  const assignments = { a: "one", b: "one", c: "one", d: "two" };
  const pins = { b: fixed, d: { ...fixed, position: 0 } };
  assert.deepEqual(preserveFixedVisitOrder(["b", "c", "d", "a"], pins, assignments), ["c", "b", "d", "a"]);
  assert.deepEqual(placeMoveAvailability(["a", "b", "c"], "a", assignments, "", pins), { up: false, down: false });
  assert.deepEqual(movePlaceWithinDay(["a", "b", "c"], "b", "down", assignments, "", pins), ["a", "b", "c"]);
  assert.deepEqual(movePlaceWithinDay(["a", "b", "c"], "b", "down", assignments), ["a", "c", "b"]);
  assert.deepEqual(preserveFixedVisitOrder(["b"], pins, assignments), ["b"]);
});

test("fixed times insert waiting and report late arrivals without inventing an earlier trip", () => {
  const input = { places: [{ id: "a", visitMinutes: 60 }, { id: "b", visitMinutes: 30 }], days: ["2026-09-14"], routeMinutesByPlaceId: { a: 15, b: 20 }, fixedVisits: { a: { ...fixed, position: 0, time: "11:00" } } };
  const early = buildItinerarySchedule({ ...input, startTime: "10:00" })[0].entries;
  assert.equal(early[0].waitingMinutes, 45); assert.equal(early[0].startsAtLabel, "11:00"); assert.equal(early[1].startsAtLabel, "12:20");
  const late = buildItinerarySchedule({ ...input, startTime: "12:00" })[0].entries;
  assert.equal(late[0].lateMinutes, 75); assert.equal(late[0].startsAtLabel, "12:15"); assert.equal(late[1].startsAtLabel, "13:35");
  const restored = buildItinerarySchedule({ ...input, startTime: "10:00", fixedVisits: {} })[0].entries;
  assert.equal(restored[0].startsAtLabel, "10:15"); assert.equal(restored[0].waitingMinutes, 0);
});

test("deadline includes return and buffer, keeps unknown travel and handles past-midnight overruns", () => {
  const entries = [{ endsAt: 1000, travelSource: "estimate" }];
  assert.deepEqual(assessDayDeadline(entries, deadline), { projectedEnd: 1075, remainingMinutes: 5, returnKnown: true, state: "within", allLegsVerified: false });
  assert.equal(assessDayDeadline(entries, { ...deadline, returnMinutes: null }).state, "unknown");
  assert.equal(assessDayDeadline(entries, { ...deadline, returnMinutes: 66 }).remainingMinutes, -1);
  assert.equal(assessDayDeadline([{ endsAt: 1450, travelSource: "route" }], { ...deadline, returnMinutes: null }).state, "over");
  assert.equal(assessDayDeadline([], deadline), null);
});

test("pins and return choices survive archive restore, private account and public Kakao selections", () => {
  const input = { region: "창원", travelStart: "2026-09-14", travelEnd: "2026-09-14", places: [{ id: "1001", name: "미술관" }], fixedVisits: { "1001": fixed, unknown: fixed }, dayDeadlines: { "2026-09-14": deadline } };
  const book = createTravelBookSnapshot(input);
  const restored = travelBookRestorePayload(book).schedule;
  const account = bookToAccountTrip(book), shared = publicTravelBody(account).selections;
  for (const value of [book, restored, account, shared]) { assert.deepEqual(value.fixedVisits, { "1001": fixed }); assert.deepEqual(value.dayDeadlines, input.dayDeadlines); }
  assert.equal(JSON.stringify(shared).includes("미술관"), false);
});
