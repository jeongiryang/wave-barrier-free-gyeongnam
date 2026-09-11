import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeComfort, sanitizeTripBreaks, sanitizeStopPurposes, combineCompanionNeeds, routeWalkingEvidence, assessWalking, suggestTripBreaks } from "../lib/trip-comfort.js";
import { restStopCandidates } from "../lib/rest-stop-candidates.js";
import { buildItinerarySchedule } from "../features/planner/optimization/itinerary-schedule.js";
import { assessDayDeadline } from "../lib/trip-time-constraints.js";
import { createTravelBookSnapshot, travelBookRestorePayload } from "../lib/travel-book.js";
import { bookToAccountTrip } from "../lib/account-travel/model.js";
import { publicTravelBody } from "../lib/kakao-travel.js";

test("comfort and rests accept bounded choices, never profile details or unselected IDs", () => {
  assert.deepEqual(sanitizeComfort({ maxWalkMinutes: 10, breakEveryMinutes: 90, breakMinutes: 15, name: "private" }), { maxWalkMinutes: 10, breakEveryMinutes: 90, breakMinutes: 15 });
  assert.deepEqual(sanitizeComfort({ maxWalkMinutes: "10", breakEveryMinutes: 400, breakMinutes: -2 }), { maxWalkMinutes: null, breakEveryMinutes: null, breakMinutes: 15 });
  assert.deepEqual(sanitizeTripBreaks({ a: 15, b: 0, c: 121, d: 30, e: 7.5 }, ["a", "b", "c", "e"]), { a: 15 });
  assert.deepEqual(sanitizeStopPurposes({ a: "rest", b: "restroom", c: "medical" }, ["a", "c"]), { a: "rest" });
  assert.deepEqual(sanitizeTripBreaks(JSON.parse('{"__proto__":15}')), {});
});

test("combined choices preserve current needs and use the shortest chosen walking limit", () => {
  const result = combineCompanionNeeds([{ profiles: ["baby", "private"], maxWalkMinutes: 20 }, { profiles: ["hearing", "baby"], maxWalkMinutes: 10 }], ["wheel"], { maxWalkMinutes: 15, breakEveryMinutes: 90, breakMinutes: 20 });
  assert.deepEqual(result, { selected: ["wheel", "baby", "hearing"], comfort: { maxWalkMinutes: 10, breakEveryMinutes: 90, breakMinutes: 20 } });
  assert.equal(combineCompanionNeeds([{ maxWalkMinutes: -1 }]).comfort.maxWalkMinutes, null);
});

test("walking burden uses segment minutes and adjacent walking legs, not metre values", () => {
  const route = { configured: true, mode: "transit", totalWalk: 2400, segments: [{ type: "walk", minutes: 5 }, { type: "walk", minutes: 10 }, { type: "bus", minutes: 30 }, { type: "walk", minutes: 12 }] };
  const evidence = routeWalkingEvidence(route);
  assert.deepEqual(evidence, { metres: 2400, minutes: 27, longestMinutes: 15 });
  const result = assessWalking([{ id: "a", evidence }, { id: "b", evidence: null }], 10);
  assert.equal(result.checked, 1); assert.equal(result.unknown, 1); assert.equal(result.minutes, 27);
  assert.deepEqual(result.overLimit, [{ id: "a", minutes: 15 }]);
  assert.equal(routeWalkingEvidence({ ...route, configured: false }), null);
  assert.equal(routeWalkingEvidence({ ...route, segments: [{ type: "bus", minutes: 10 }] }).minutes, null);
  assert.equal(routeWalkingEvidence({ ...route, segments: [{ type: "walk", minutes: "10" }] }).minutes, null);
  assert.deepEqual(routeWalkingEvidence({ configured: true, mode: "car", totalWalk: 0, segments: [{ type: "car", minutes: 30 }] }), { metres: 0, minutes: 0, longestMinutes: 0 });
});

test("rest proposals reset each day, include waiting, and preserve already chosen rests", () => {
  const entry = (id, visitMinutes = 30) => ({ place: { id }, travelMinutes: 10, visitMinutes });
  const days = [{ entries: [entry("a"), { ...entry("b"), waitingMinutes: 20 }, entry("c")] }, { entries: [entry("d", 90), entry("e")] }];
  const pref = { maxWalkMinutes: 10, breakEveryMinutes: 90, breakMinutes: 15 };
  assert.deepEqual(suggestTripBreaks(days, pref), { b: 15, d: 15 });
  assert.deepEqual(suggestTripBreaks(days, pref, { a: 30 }), { d: 15 });
  assert.deepEqual(suggestTripBreaks(days, { ...pref, breakEveryMinutes: null }), {});
});

test("nearby rest candidates retain facility constraints and distinguish unknown from negative", () => {
  const anchor = { id: "a", mapX: "128.681", mapY: "35.227" };
  const place = { id: "b", mapX: "128.682", mapY: "35.228", accessibility: [{ key: "restroom", state: "confirmed", detail: "1층" }, { key: "route", state: "confirmed" }] };
  const unknown = { ...place, id: "c", accessibility: [{ key: "route", state: "confirmed" }] };
  const negative = { ...place, id: "d", accessibility: [{ key: "restroom", state: "negative" }, { key: "route", state: "confirmed" }] };
  const input = { places: [unknown, place, negative, { ...place, id: "far", mapX: "140", mapY: "36" }], anchor, savedIds: ["a"], requiredKeys: ["route"], purpose: "restroom" };
  assert.deepEqual(restStopCandidates(input).map(item => item.place.id), ["b"]);
  assert.deepEqual(restStopCandidates({ ...input, includeUnknown: true }).map(item => item.place.id), ["b", "c"]);
  assert.equal(restStopCandidates(input)[0].extraTravelMinutes, 5);
  assert.equal(restStopCandidates({ ...input, savedIds: ["a", "b"] }).length, 0);
});

test("scheduled rests extend the timeline and return budget without shortening a walking leg", () => {
  const input = { places: [{ id: "a", visitMinutes: 30 }, { id: "b", visitMinutes: 30 }], days: ["2026-09-14"], startTime: "10:00", routeMinutesByPlaceId: { a: 10, b: 20 }, fixedVisits: { b: { kind: "event", position: 1, time: "11:00" } } };
  const before = buildItinerarySchedule(input)[0].entries;
  const after = buildItinerarySchedule({ ...input, breakMinutesByPlaceId: { a: 30 } })[0].entries;
  assert.equal(after[0].visitEndsAtLabel, "10:40"); assert.equal(after[0].endsAtLabel, "11:10");
  assert.equal(before[1].startsAtLabel, "11:00"); assert.equal(after[1].startsAtLabel, "11:30"); assert.equal(after[1].lateMinutes, 30);
  assert.equal(after[1].travelMinutes, before[1].travelMinutes);
  const deadline = { time: "12:00", returnMinutes: 15, bufferMinutes: 0 };
  assert.equal(assessDayDeadline(before, deadline).remainingMinutes, 15);
  assert.equal(assessDayDeadline(after, deadline).remainingMinutes, -15);
  assert.deepEqual(buildItinerarySchedule({ ...input, breakMinutesByPlaceId: { a: 121, b: "15" } }), buildItinerarySchedule(input));
});

test("only planned breaks and stop purposes enter account/public shares; local comfort survives archive", () => {
  const input = { region: "창원", travelStart: "2026-09-14", travelEnd: "2026-09-14", places: [{ id: "1001", name: "미술관" }], comfort: { maxWalkMinutes: 10, breakEveryMinutes: 90, breakMinutes: 15, person: "private" }, breakMinutesByPlaceId: { "1001": 15, other: 30 }, restPurposeByPlaceId: { "1001": "restroom", other: "rest" } };
  const book = createTravelBookSnapshot(input), restored = travelBookRestorePayload(book).schedule;
  const account = bookToAccountTrip(book), shared = publicTravelBody(account).selections;
  for (const value of [book, restored, account, shared]) { assert.deepEqual(value.breakMinutesByPlaceId, { "1001": 15 }); assert.deepEqual(value.restPurposeByPlaceId, { "1001": "restroom" }); }
  assert.equal(restored.comfort.maxWalkMinutes, 10); assert.equal(account.comfort, undefined); assert.equal(shared.comfort, undefined);
  assert.equal(JSON.stringify([book, account, shared]).includes("private"), false);
});
