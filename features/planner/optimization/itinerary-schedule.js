import { directDistanceKm } from "./visit-order.js";
import { validVisitMinutes } from "../../../lib/visit-durations.js";
import { validTripClock } from "../../../lib/trip-time-constraints.js";

const DAY_MINUTES = 24 * 60;
const DEFAULT_START_MINUTES = 10 * 60;
const DEFAULT_VISIT_MINUTES = 90;
const MIN_TRAVEL_MINUTES = 5;
const MAX_ESTIMATED_TRAVEL_MINUTES = 240;

const VISIT_MINUTES_BY_CONTENT_TYPE = {
  "12": 90,
  "14": 120,
  "15": 120,
  "25": 150,
  "28": 120,
  "32": 60,
  "38": 60,
  "39": 75,
};

function finiteMinutes(value, fallback, minimum = 0, maximum = DAY_MINUTES) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum) return fallback;
  return Math.min(maximum, Math.round(parsed));
}

export function parseClock(value, fallback = DEFAULT_START_MINUTES) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}

export function formatScheduleTime(totalMinutes) {
  const safe = Math.max(0, finiteMinutes(totalMinutes, 0, 0, DAY_MINUTES * 7));
  const dayOffset = Math.floor(safe / DAY_MINUTES);
  const clock = safe % DAY_MINUTES;
  const label = `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`;
  return dayOffset ? `+${dayOffset}일 ${label}` : label;
}

export function visitDurationFor(place, fallback = DEFAULT_VISIT_MINUTES) {
  return finiteMinutes(
    place?.visitMinutes,
    VISIT_MINUTES_BY_CONTENT_TYPE[String(place?.contentTypeId || "")] || fallback,
    15,
    12 * 60,
  );
}

export function travelDurationBetween(from, to, options = {}) {
  const provided = verifiedRouteMinutes(options.routeMinutes);
  if (provided > 0) return { minutes: provided, source: "route" };

  const distance = directDistanceKm(from, to);
  if (distance === null) {
    return {
      minutes: finiteMinutes(options.missingCoordinatesMinutes, 30, 1, MAX_ESTIMATED_TRAVEL_MINUTES),
      source: "fallback",
    };
  }

  const speed = Math.max(5, Math.min(120, Number(options.assumedSpeedKmh) || 30));
  const roadFactor = Math.max(1, Math.min(2, Number(options.roadFactor) || 1.25));
  const estimate = distance / speed * 60 * roadFactor;
  return {
    minutes: Math.max(MIN_TRAVEL_MINUTES, finiteMinutes(estimate, 30, 0, MAX_ESTIMATED_TRAVEL_MINUTES)),
    source: "estimate",
  };
}

function verifiedRouteMinutes(value) {
  // Provider adapters return integer minutes. The estimate cap must never
  // shorten a verified journey or turn invalid values into confirmed times.
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : -1;
}

/**
 * A route provider result describes the current origin-to-destination leg. It is
 * only valid for a day's first stop; applying it between two saved places would
 * silently overstate or understate the remainder of the itinerary.
 */
export function routeMinutesForOriginLeg({ places, days, assignments = {}, destinationId, routeMinutes }) {
  const minutes = verifiedRouteMinutes(routeMinutes);
  if (!destinationId || minutes < 1 || !Array.isArray(places) || !places.length) return {};
  const safeDays = Array.isArray(days) && days.length ? days : [""];
  const destinationDay = assignments[destinationId] || safeDays[0];
  const firstStop = places.find((place) => (assignments[place.id] || safeDays[0]) === destinationDay);
  return firstStop?.id === destinationId ? { [destinationId]: minutes } : {};
}

export function buildItinerarySchedule({
  places,
  days,
  assignments = {},
  startTime = "10:00",
  origin = {},
  routeMinutesByPlaceId = {},
  visitMinutesByPlaceId = {},
  fixedVisits = {},
  breakMinutesByPlaceId = {},
  defaultVisitMinutes = DEFAULT_VISIT_MINUTES,
}) {
  const safePlaces = Array.isArray(places) ? places : [];
  const safeDays = Array.isArray(days) && days.length ? days : [""];
  const startMinutes = parseClock(startTime);

  return safeDays.map((day) => {
    const dayPlaces = safePlaces.filter((place) => (assignments[place.id] || safeDays[0]) === day);
    let cursor = origin;
    let elapsed = startMinutes;
    const entries = dayPlaces.map((place) => {
      const configuredRoute = routeMinutesByPlaceId[place.id];
      const travel = travelDurationBetween(cursor, place, {
        routeMinutes: configuredRoute,
      });
      const arrivesAt = elapsed + travel.minutes;
      const fixedTime = validTripClock(fixedVisits[place.id]?.time) ? fixedVisits[place.id].time : "";
      const fixedMinutes = fixedTime ? parseClock(fixedTime) : arrivesAt;
      const startsAt = Math.max(arrivesAt, fixedMinutes);
      const configuredVisit = visitMinutesByPlaceId[place.id];
      const visitMinutes = validVisitMinutes(configuredVisit) ? configuredVisit : visitDurationFor(place, defaultVisitMinutes);
      const visitEndsAt = startsAt + visitMinutes;
      const configuredBreak = breakMinutesByPlaceId[place.id];
      const breakMinutes = typeof configuredBreak === "number" && Number.isInteger(configuredBreak) && configuredBreak >= 5 && configuredBreak <= 120 ? configuredBreak : 0;
      const endsAt = visitEndsAt + breakMinutes;
      elapsed = endsAt;
      cursor = place;
      return {
        place,
        travelMinutes: travel.minutes,
        travelSource: travel.source,
        visitMinutes,
        visitSource: validVisitMinutes(configuredVisit) ? "user" : "default",
        startsAt,
        visitEndsAt,
        visitEndsAtLabel: formatScheduleTime(visitEndsAt),
        breakMinutes,
        endsAt,
        fixedTime,
        waitingMinutes: Math.max(0, fixedMinutes - arrivesAt),
        lateMinutes: fixedTime ? Math.max(0, arrivesAt - fixedMinutes) : 0,
        startsAtLabel: formatScheduleTime(startsAt),
        endsAtLabel: formatScheduleTime(endsAt),
        crossesDateBoundary: endsAt >= DAY_MINUTES,
      };
    });
    return { day, entries };
  });
}
