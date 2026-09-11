"use client";

import { readTripValue, writeTripValue } from "../../../lib/current-trip-storage.js";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dateRange, localDate } from "../utils";
import { boundedTripEnd, offsetTripDate, validTripDate } from "../../../lib/trip-dates.js";
import { periodForDate } from "../../../lib/trip-date-move.js";
import { changeVisitDuration, sanitizeVisitDurations } from "../../../lib/visit-durations.js";
import { sanitizeFixedVisits, sanitizeDayDeadlines, type FixedVisit, type DayDeadline } from "../../../lib/trip-time-constraints.js";

import { emptyComfort, sanitizeComfort, sanitizeTripBreaks, sanitizeStopPurposes, type TripComfort, type StopPurpose } from "../../../lib/trip-comfort.js";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TRIP_SCHEDULE_KEY = "wave-trip-schedule-v1";

type StoredSchedule = {
  travelStart?: unknown;
  travelEnd?: unknown;
  dayStartTime?: unknown;
  scheduleAssignments?: unknown;
  visitMinutesByPlaceId?: unknown;
  fixedVisits?: unknown;
  dayDeadlines?: unknown;
  comfort?: unknown;
  breakMinutesByPlaceId?: unknown;
  restPurposeByPlaceId?: unknown;
};

function readStoredSchedule(): StoredSchedule {
  try {
    const parsed = JSON.parse(readTripValue(window.localStorage, TRIP_SCHEDULE_KEY) || "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as StoredSchedule : {};
  } catch {
    return {};
  }
}

export function useTripSchedule() {
  // SSR and the first browser render must agree even across time zones or
  // midnight. Read today's local date only in the restoration effect below.
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [dayStartTime, setDayStartTime] = useState("10:00");
  const [scheduleAssignments, setScheduleAssignments] = useState<Record<string, string>>({});
  const [visitMinutesByPlaceId, setVisitMinutesByPlaceId] = useState<Record<string, number>>({});
  const [fixedVisits, setFixedVisits] = useState<Record<string, FixedVisit>>({});
  const [dayDeadlines, setDayDeadlines] = useState<Record<string, DayDeadline>>({});
  const [comfort, updateComfort] = useState<TripComfort>(emptyComfort);
  const [breakMinutesByPlaceId, setTripBreaks] = useState<Record<string, number>>({});
  const [restPurposeByPlaceId, setStopPurposes] = useState<Record<string, StopPurpose>>({});
  const [constraintNotice, setConstraintNotice] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [dateNotice, setDateNotice] = useState<{ kind: "limit" | "adjusted" | "invalid"; end?: string } | null>(null);
  const lastTravelDate = travelStart ? offsetTripDate(travelStart, 6) : "";
  const tripDays = useMemo(() => travelStart && travelEnd ? dateRange(travelStart, travelEnd) : [], [travelEnd, travelStart]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredSchedule();
      const query = new URLSearchParams(window.location.search);
      const queryStart = query.get("travelStart") || "";
      const queryEnd = query.get("travelEnd") || "";
      const storedStart = typeof stored.travelStart === "string" && validTripDate(stored.travelStart) ? stored.travelStart : localDate();
      const storedEnd = typeof stored.travelEnd === "string" && validTripDate(stored.travelEnd) ? stored.travelEnd : storedStart;
      const start = validTripDate(queryStart) ? queryStart : storedStart;
      const requestedEnd = validTripDate(queryStart) ? queryEnd || start : storedEnd;
      const end = boundedTripEnd(start, requestedEnd);
      const assignments = stored.scheduleAssignments && typeof stored.scheduleAssignments === "object" && !Array.isArray(stored.scheduleAssignments)
        ? Object.fromEntries(Object.entries(stored.scheduleAssignments as Record<string, unknown>)
          .filter(([id, day]) => Boolean(id) && validTripDate(day)))
        : {};
      setTravelStart(start);
      setTravelEnd(end);
      if (end !== requestedEnd) setDateNotice({ kind: "adjusted", end });
      setDayStartTime(typeof stored.dayStartTime === "string" && TIME_PATTERN.test(stored.dayStartTime) ? stored.dayStartTime : "10:00");
      setScheduleAssignments(assignments as Record<string, string>);
      setVisitMinutesByPlaceId(sanitizeVisitDurations(stored.visitMinutesByPlaceId));
      setFixedVisits(sanitizeFixedVisits(stored.fixedVisits));
      setDayDeadlines(sanitizeDayDeadlines(stored.dayDeadlines));
      updateComfort(sanitizeComfort(stored.comfort));
      setTripBreaks(sanitizeTripBreaks(stored.breakMinutesByPlaceId));
      setStopPurposes(sanitizeStopPurposes(stored.restPurposeByPlaceId));
      setStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      writeTripValue(window.localStorage, TRIP_SCHEDULE_KEY, JSON.stringify({
        travelStart,
        travelEnd,
        dayStartTime,
        scheduleAssignments,
        visitMinutesByPlaceId,
        fixedVisits,
        dayDeadlines, comfort, breakMinutesByPlaceId, restPurposeByPlaceId,
      }));
    } catch {
      // 저장소가 차단돼도 현재 탭의 일정 편집은 유지한다.
    }
  }, [dayStartTime, scheduleAssignments, storageReady, travelEnd, travelStart, visitMinutesByPlaceId, fixedVisits, dayDeadlines, comfort, breakMinutesByPlaceId, restPurposeByPlaceId]);

  const setComfort = useCallback((value: TripComfort) => updateComfort(sanitizeComfort(value)), []);
  const setBreakMinutes = useCallback((id: string, minutes: number | null) => {
    setTripBreaks(current => { const next = { ...current }; if (minutes === null) delete next[id]; else next[id] = minutes; return sanitizeTripBreaks(next); });
  }, []);
  const setStopPurpose = useCallback((id: string, purpose: StopPurpose | null) => {
    setStopPurposes(current => { const next = { ...current }; if (purpose === null) delete next[id]; else next[id] = purpose; return sanitizeStopPurposes(next); });
  }, []);

  const setFixedVisit = useCallback((id: string, value: FixedVisit | null) => {
    setFixedVisits(current => { const next = { ...current }; if (value) Object.assign(next, sanitizeFixedVisits({ [id]: value })); else delete next[id]; return next; });
    setConstraintNotice(value ? "장소와 방문 날짜·순서를 고정했어요. 시각은 아래에서 정할 수 있어요." : "장소 고정을 해제했어요.");
  }, []);
  const setDayDeadline = useCallback((day: string, value: DayDeadline | null) => {
    if (!tripDays.includes(day)) return;
    setDayDeadlines(current => { const next = { ...current }; if (value) Object.assign(next, sanitizeDayDeadlines({ [day]: value })); else delete next[day]; return sanitizeDayDeadlines(next, tripDays); });
  }, [tripDays]);
  const canChangePlace = useCallback((id: string) => {
    if (!fixedVisits[id]) return true;
    setConstraintNotice("고정한 장소예요. 일정 수정에서 고정을 해제한 뒤 날짜 변경·교체·제거할 수 있어요.");
    return false;
  }, [fixedVisits]);

  const setVisitMinutes = useCallback((id: string, minutes: number | null) => {
    setVisitMinutesByPlaceId(current => changeVisitDuration(current, id, minutes));
  }, []);

  const changeTravelStart = useCallback((next: string) => {
    if (!validTripDate(next)) { setDateNotice({ kind: "invalid" }); return; }
    const nextEnd = boundedTripEnd(next, travelEnd);
    setTravelStart(next);
    setTravelEnd(nextEnd);
    setDateNotice(nextEnd !== travelEnd ? { kind: "adjusted", end: nextEnd } : null);
  }, [travelEnd]);

  const changeTravelEnd = useCallback((next: string) => {
    if (!validTripDate(next) || next < travelStart) { setDateNotice({ kind: "invalid" }); return; }
    if (next > lastTravelDate) { setDateNotice({ kind: "limit" }); return; }
    setTravelEnd(next);
    setDateNotice(null);
  }, [travelStart, lastTravelDate]);

  const assignPlaceToDay = useCallback((placeId: string, day: string) => {
    if (!placeId || !tripDays.includes(day) || !canChangePlace(placeId)) return;
    setScheduleAssignments((current) => ({ ...current, [placeId]: day }));
  }, [tripDays, canChangePlace]);

  const movePlaceWithPeriod = useCallback((placeId: string, day: string, placeIds: string[]) => {
    const period = periodForDate(travelStart, travelEnd, day);
    if (!period || !placeIds.includes(placeId) || !canChangePlace(placeId)) return false;
    // Materialize old implicit dates before expanding the period to an earlier day.
    setScheduleAssignments(current => ({ ...current, ...Object.fromEntries(placeIds.map(id => [id, current[id] || travelStart])), [placeId]: day }));
    setTravelStart(period.start); setTravelEnd(period.end); setDateNotice(null);
    setConstraintNotice(`${day}로 방문일을 옮겼어요. 다른 장소의 날짜는 유지했습니다.`);
    return true;
  }, [travelStart, travelEnd, canChangePlace]);

  const ensurePlaceAssignment = useCallback((placeId: string) => {
    setScheduleAssignments((current) => ({
      ...current,
      [placeId]: current[placeId] || tripDays[0] || travelStart,
    }));
  }, [travelStart, tripDays]);

  const removePlaceAssignment = useCallback((placeId: string) => {
    setBreakMinutes(placeId, null); setStopPurpose(placeId, null);
    setVisitMinutesByPlaceId(current => changeVisitDuration(current, placeId, null));
    setScheduleAssignments((current) => {
      const next = { ...current };
      delete next[placeId];
      return next;
    });
  }, [setBreakMinutes, setStopPurpose]);

  const replacePlaceAssignment = useCallback((previousId: string, nextId: string) => {
    setBreakMinutes(previousId, null); setStopPurpose(previousId, null);
    // A duration chosen for the old venue does not imply the same visit at its replacement.
    setVisitMinutesByPlaceId(current => changeVisitDuration(current, previousId, null));
    setScheduleAssignments((current) => {
      const next = { ...current, [nextId]: current[previousId] || tripDays[0] || travelStart };
      delete next[previousId];
      return next;
    });
  }, [travelStart, tripDays, setBreakMinutes, setStopPurpose]);

  const resetSchedule = useCallback((start: string, end: string) => {
    setTravelStart(start); setTravelEnd(end); setDayStartTime("10:00");
    setScheduleAssignments({}); setVisitMinutesByPlaceId({}); setDateNotice(null);
    setFixedVisits({}); setDayDeadlines({}); setConstraintNotice("");
    updateComfort(emptyComfort); setTripBreaks({}); setStopPurposes({});
  }, []);

  return {
    resetSchedule,
    storageReady,
    travelStart,
    travelEnd,
    lastTravelDate,
    dateNotice,
    dayStartTime,
    scheduleAssignments,
    visitMinutesByPlaceId,
    fixedVisits,
    dayDeadlines,
    comfort, setComfort, breakMinutesByPlaceId, restPurposeByPlaceId, setBreakMinutes, setStopPurpose,
    setFixedVisit,
    setDayDeadline,
    canChangePlace,
    constraintNotice,
    setVisitMinutes,
    tripDays,
    changeTravelStart,
    changeTravelEnd,
    setDayStartTime,
    assignPlaceToDay,
    movePlaceWithPeriod,
    ensurePlaceAssignment,
    removePlaceAssignment,
    replacePlaceAssignment,
  };
}
