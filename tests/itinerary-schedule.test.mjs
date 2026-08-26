import assert from "node:assert/strict";
import test from "node:test";
import {
  buildItinerarySchedule,
  formatScheduleTime,
  parseClock,
  routeMinutesForOriginLeg,
  travelDurationBetween,
  visitDurationFor,
} from "../features/planner/optimization/itinerary-schedule.js";

const origin = { lat: 35.227, lng: 128.681 };
const museum = { id: "museum", contentTypeId: "14", mapY: "35.24", mapX: "128.69" };
const park = { id: "park", contentTypeId: "12", mapY: "35.28", mapX: "128.72" };

test("schedule chains route, visit and following travel time", () => {
  const [day] = buildItinerarySchedule({
    places: [museum, park],
    days: ["2026-09-01"],
    startTime: "09:30",
    origin,
    routeMinutesByPlaceId: { museum: 25, park: 40 },
  });

  assert.equal(day.entries[0].startsAtLabel, "09:55");
  assert.equal(day.entries[0].endsAtLabel, "11:55");
  assert.equal(day.entries[1].startsAtLabel, "12:35");
  assert.equal(day.entries[1].endsAtLabel, "14:05");
  assert.equal(day.entries[1].travelSource, "route");
});

test("schedule recalculates all following entries when a leg changes", () => {
  const input = { places: [museum, park], days: ["2026-09-01"], startTime: "10:00", origin };
  const before = buildItinerarySchedule({ ...input, routeMinutesByPlaceId: { museum: 10, park: 10 } });
  const after = buildItinerarySchedule({ ...input, routeMinutesByPlaceId: { museum: 35, park: 10 } });
  assert.equal(after[0].entries[0].startsAt - before[0].entries[0].startsAt, 25);
  assert.equal(after[0].entries[1].startsAt - before[0].entries[1].startsAt, 25);
});

test("an origin route is never reused as a later place-to-place leg", () => {
  assert.deepEqual(routeMinutesForOriginLeg({
    places: [museum, park], days: ["2026-09-01"], destinationId: "park", routeMinutes: 55,
  }), {});
  assert.deepEqual(routeMinutesForOriginLeg({
    places: [museum, park], days: ["2026-09-01"], destinationId: "museum", routeMinutes: 25,
  }), { museum: 25 });
});

test("invalid route values use bounded coordinate or missing-coordinate fallbacks", () => {
  const estimated = travelDurationBetween(origin, museum, { routeMinutes: Number.NaN });
  const missing = travelDurationBetween({}, {}, { routeMinutes: -10 });
  assert.equal(estimated.source, "estimate");
  assert.ok(estimated.minutes >= 5 && estimated.minutes <= 240);
  assert.deepEqual(missing, { minutes: 30, source: "fallback" });
});

test("visit defaults follow place type and defend invalid custom values", () => {
  assert.equal(visitDurationFor(museum), 120);
  assert.equal(visitDurationFor({ ...museum, visitMinutes: 45 }), 45);
  assert.equal(visitDurationFor({ ...museum, visitMinutes: -1 }), 120);
});

test("clock formatting handles invalid input and date boundaries", () => {
  assert.equal(parseClock("08:15"), 495);
  assert.equal(parseClock("30:99"), 600);
  assert.equal(formatScheduleTime(25 * 60 + 5), "+1일 01:05");
  const [day] = buildItinerarySchedule({
    places: [{ ...museum, visitMinutes: 180 }],
    days: ["2026-09-01"],
    startTime: "23:00",
    origin,
    routeMinutesByPlaceId: { museum: 30 },
  });
  assert.equal(day.entries[0].crossesDateBoundary, true);
  assert.equal(day.entries[0].endsAtLabel, "+1일 02:30");
});
