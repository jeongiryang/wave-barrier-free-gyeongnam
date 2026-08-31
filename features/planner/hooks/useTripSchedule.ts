"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dateRange, localDate } from "../utils";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TRIP_SCHEDULE_KEY = "wave-trip-schedule-v1";

type StoredSchedule = {
  travelStart?: unknown;
  travelEnd?: unknown;
  dayStartTime?: unknown;
  scheduleAssignments?: unknown;
};

function readStoredSchedule(): StoredSchedule {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TRIP_SCHEDULE_KEY) || "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as StoredSchedule : {};
  } catch {
    return {};
  }
}

function assignmentsWithinDays(assignments: Record<string, string>, days: string[]) {
  const validDays = new Set(days);
  return Object.fromEntries(Object.entries(assignments)
    .map(([id, day]) => [id, validDays.has(day) ? day : days[0]]));
}

export function useTripSchedule() {
  const [travelStart, setTravelStart] = useState(localDate());
  const [travelEnd, setTravelEnd] = useState(localDate(1));
  const [dayStartTime, setDayStartTime] = useState("10:00");
  const [scheduleAssignments, setScheduleAssignments] = useState<Record<string, string>>({});
  const [storageReady, setStorageReady] = useState(false);
  const tripDays = useMemo(() => dateRange(travelStart, travelEnd), [travelEnd, travelStart]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredSchedule();
      const query = new URLSearchParams(window.location.search);
      const queryStart = query.get("travelStart") || "";
      const queryEnd = query.get("travelEnd") || "";
      const storedStart = typeof stored.travelStart === "string" && DATE_PATTERN.test(stored.travelStart) ? stored.travelStart : localDate();
      const storedEnd = typeof stored.travelEnd === "string" && DATE_PATTERN.test(stored.travelEnd) && stored.travelEnd >= storedStart ? stored.travelEnd : storedStart;
      const start = DATE_PATTERN.test(queryStart) ? queryStart : storedStart;
      const end = DATE_PATTERN.test(queryStart) ? (DATE_PATTERN.test(queryEnd) && queryEnd >= start ? queryEnd : start) : storedEnd;
      const assignments = stored.scheduleAssignments && typeof stored.scheduleAssignments === "object" && !Array.isArray(stored.scheduleAssignments)
        ? Object.fromEntries(Object.entries(stored.scheduleAssignments as Record<string, unknown>)
          .filter(([id, day]) => Boolean(id) && typeof day === "string" && DATE_PATTERN.test(day)))
        : {};
      setTravelStart(start);
      setTravelEnd(end);
      setDayStartTime(typeof stored.dayStartTime === "string" && TIME_PATTERN.test(stored.dayStartTime) ? stored.dayStartTime : "10:00");
      setScheduleAssignments(assignmentsWithinDays(assignments as Record<string, string>, dateRange(start, end)));
      setStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(TRIP_SCHEDULE_KEY, JSON.stringify({
        travelStart,
        travelEnd,
        dayStartTime,
        scheduleAssignments,
      }));
    } catch {
      // 저장소가 차단돼도 현재 탭의 일정 편집은 유지한다.
    }
  }, [dayStartTime, scheduleAssignments, storageReady, travelEnd, travelStart]);

  const changeTravelStart = useCallback((next: string) => {
    const nextEnd = travelEnd < next ? next : travelEnd;
    setTravelStart(next);
    setTravelEnd(nextEnd);
    setScheduleAssignments((current) => assignmentsWithinDays(current, dateRange(next, nextEnd)));
  }, [travelEnd]);

  const changeTravelEnd = useCallback((next: string) => {
    if (next < travelStart) return;
    setTravelEnd(next);
    setScheduleAssignments((current) => assignmentsWithinDays(current, dateRange(travelStart, next)));
  }, [travelStart]);

  const assignPlaceToDay = useCallback((placeId: string, day: string) => {
    setScheduleAssignments((current) => ({ ...current, [placeId]: tripDays.includes(day) ? day : tripDays[0] }));
  }, [tripDays]);

  const ensurePlaceAssignment = useCallback((placeId: string) => {
    setScheduleAssignments((current) => ({
      ...current,
      [placeId]: current[placeId] || tripDays[0] || travelStart,
    }));
  }, [travelStart, tripDays]);

  const removePlaceAssignment = useCallback((placeId: string) => {
    setScheduleAssignments((current) => {
      const next = { ...current };
      delete next[placeId];
      return next;
    });
  }, []);

  return {
    travelStart,
    travelEnd,
    dayStartTime,
    scheduleAssignments,
    tripDays,
    changeTravelStart,
    changeTravelEnd,
    setDayStartTime,
    assignPlaceToDay,
    ensurePlaceAssignment,
    removePlaceAssignment,
  };
}
