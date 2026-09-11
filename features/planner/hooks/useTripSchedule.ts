"use client";

import { readTripValue, writeTripValue } from "../../../lib/current-trip-storage.js";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dateRange, localDate } from "../utils";
import { boundedTripEnd, offsetTripDate, validTripDate } from "../../../lib/trip-dates.js";
import { changeVisitDuration, sanitizeVisitDurations } from "../../../lib/visit-durations.js";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TRIP_SCHEDULE_KEY = "wave-trip-schedule-v1";

type StoredSchedule = {
  travelStart?: unknown;
  travelEnd?: unknown;
  dayStartTime?: unknown;
  scheduleAssignments?: unknown;
  visitMinutesByPlaceId?: unknown;
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
      }));
    } catch {
      // 저장소가 차단돼도 현재 탭의 일정 편집은 유지한다.
    }
  }, [dayStartTime, scheduleAssignments, storageReady, travelEnd, travelStart, visitMinutesByPlaceId]);

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
    if (!placeId || !tripDays.includes(day)) return;
    setScheduleAssignments((current) => ({ ...current, [placeId]: day }));
  }, [tripDays]);

  const ensurePlaceAssignment = useCallback((placeId: string) => {
    setScheduleAssignments((current) => ({
      ...current,
      [placeId]: current[placeId] || tripDays[0] || travelStart,
    }));
  }, [travelStart, tripDays]);

  const removePlaceAssignment = useCallback((placeId: string) => {
    setVisitMinutesByPlaceId(current => changeVisitDuration(current, placeId, null));
    setScheduleAssignments((current) => {
      const next = { ...current };
      delete next[placeId];
      return next;
    });
  }, []);

  const replacePlaceAssignment = useCallback((previousId: string, nextId: string) => {
    // A duration chosen for the old venue does not imply the same visit at its replacement.
    setVisitMinutesByPlaceId(current => changeVisitDuration(current, previousId, null));
    setScheduleAssignments((current) => {
      const next = { ...current, [nextId]: current[previousId] || tripDays[0] || travelStart };
      delete next[previousId];
      return next;
    });
  }, [travelStart, tripDays]);

  const resetSchedule = useCallback((start: string, end: string) => {
    setTravelStart(start); setTravelEnd(end); setDayStartTime("10:00");
    setScheduleAssignments({}); setVisitMinutesByPlaceId({}); setDateNotice(null);
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
    setVisitMinutes,
    tripDays,
    changeTravelStart,
    changeTravelEnd,
    setDayStartTime,
    assignPlaceToDay,
    ensurePlaceAssignment,
    removePlaceAssignment,
    replacePlaceAssignment,
  };
}
