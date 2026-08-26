"use client";

import { useCallback, useMemo, useState } from "react";
import { dateRange, localDate } from "../utils";

export function useTripSchedule() {
  const [travelStart, setTravelStart] = useState(localDate());
  const [travelEnd, setTravelEnd] = useState(localDate(1));
  const [dayStartTime, setDayStartTime] = useState("10:00");
  const [scheduleAssignments, setScheduleAssignments] = useState<Record<string, string>>({});
  const tripDays = useMemo(() => dateRange(travelStart, travelEnd), [travelEnd, travelStart]);

  const changeTravelStart = useCallback((next: string) => {
    setTravelStart(next);
    setTravelEnd((current) => current < next ? next : current);
  }, []);

  const assignPlaceToDay = useCallback((placeId: string, day: string) => {
    setScheduleAssignments((current) => ({ ...current, [placeId]: day }));
  }, []);

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
    setTravelEnd,
    setDayStartTime,
    assignPlaceToDay,
    ensurePlaceAssignment,
    removePlaceAssignment,
  };
}
