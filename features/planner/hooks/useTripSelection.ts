"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveSavedPlaces } from "../../../lib/saved-place-catalog.js";
import { sanitizeTripBreaks, type StopPurpose } from "../../../lib/trip-comfort.js";
import { canMoveVisitDate } from "../../../lib/trip-date-move.js";
import type { RoutePoint } from "../../routing/types";
import type { Place } from "../types";
import { useOptimizedTripOrder } from "./useOptimizedTripOrder";
import { useSavedPlaceIds } from "./useSavedPlaceIds";
import { useTripSchedule } from "./useTripSchedule";

export function useTripSelection({ activePlaces, origin, accessibilityProfileCount }: {
  activePlaces: Place[];
  origin: RoutePoint;
  accessibilityProfileCount: number;
}) {
  const { saved, catalog, resetSaved, storageReady: savedStorageReady, addSavedIds, removeSavedId, rememberSavedPlaces, replaceSavedId } = useSavedPlaceIds();
  const schedule = useTripSchedule();
  const [dayChoice, setActiveDay] = useState("");
  const activeDay = schedule.tripDays.includes(dayChoice) ? dayChoice : schedule.tripDays[0];
  const { ensurePlaceAssignment, removePlaceAssignment, canChangePlace } = schedule;
  const savedPlaces = useMemo(
    () => resolveSavedPlaces(saved, activePlaces, catalog),
    [activePlaces, catalog, saved],
  );

  useEffect(() => {
    const selectedActivePlaces = activePlaces.filter((place) => saved.includes(place.id));
    if (selectedActivePlaces.length) rememberSavedPlaces(selectedActivePlaces);
  }, [activePlaces, rememberSavedPlaces, saved]);

  const optimized = useOptimizedTripOrder({
    savedPlaces,
    saved,
    savedStorageReady,
    origin,
    accessibilityProfileCount,
    scheduleAssignments: schedule.scheduleAssignments,
    defaultDay: schedule.tripDays[0] || schedule.travelStart,
    fixedVisits: schedule.fixedVisits,
  });

  const toggleSaved = useCallback((id: string, snapshot?: Place) => {
    if (saved.includes(id)) {
      if (!canChangePlace(id)) return false;
      removePlaceAssignment(id);
      removeSavedId(id);
      return;
    }
    const place = snapshot || activePlaces.find((item) => item.id === id);
    if (!place) return false;
    ensurePlaceAssignment(id);
    addSavedIds([id], [place]);
    return true;
  }, [activePlaces, addSavedIds, ensurePlaceAssignment, removePlaceAssignment, removeSavedId, saved, canChangePlace]);

  // 지도에서 한 번에 담을 때 쓴다. 이미 담긴 곳은 건너뛰고 실제로 더한 수를 돌려준다.
  const savePlaceIds = useCallback((ids: string[]) => {
    const additions = ids.filter((id) => !saved.includes(id) && activePlaces.some((place) => place.id === id));
    additions.forEach(ensurePlaceAssignment);
    addSavedIds(additions, activePlaces);
    return additions.length;
  }, [activePlaces, addSavedIds, ensurePlaceAssignment, saved]);

  const replaceSavedPlace = (previousId: string, place: Place) => {
    if (!saved.includes(previousId) || saved.includes(place.id) || !schedule.canChangePlace(previousId)) return false;
    replaceSavedId(previousId, place);
    schedule.replacePlaceAssignment(previousId, place.id);
    optimized.replacePlaceOrder(previousId, place.id);
    return true;
  };

  const addSuggestedBreaks = (values: Record<string, number>) => {
    for (const [id, minutes] of Object.entries(sanitizeTripBreaks(values, saved))) schedule.setBreakMinutes(id, minutes);
  };

  const canMoveToDate = (id: string, date: string) => canMoveVisitDate({ id, date, order: optimized.orderedPlaceIds,
    assignments: schedule.scheduleAssignments, fixed: schedule.fixedVisits, start: schedule.travelStart, end: schedule.travelEnd });
  const movePlaceToDate = (id: string, date: string) => {
    if (!canMoveToDate(id, date) || !schedule.movePlaceWithPeriod(id, date, saved)) return false;
    optimized.appendPlaceOrder(id); setActiveDay(date); return true;
  };

  const addCourseStop = (afterId: string, place: Place, minutes: number, purpose?: StopPurpose) => {
    if (!/^[1-9]\d{0,11}$/.test(place.id) || !Number.isInteger(minutes) || minutes < 15 || minutes > 720) return false;
    const day = schedule.scheduleAssignments[afterId] || schedule.tripDays[0];
    const sameDay = optimized.orderedSavedPlaces.filter(item => (schedule.scheduleAssignments[item.id] || schedule.tripDays[0]) === day);
    const afterIndex = sameDay.findIndex(item => item.id === afterId);
    if (afterIndex < 0 || !schedule.tripDays.includes(day) || saved.includes(place.id) || saved.length >= 12 || sameDay.slice(afterIndex + 1).some(item => schedule.fixedVisits[item.id])) return false;
    addSavedIds([place.id], [place]);
    schedule.assignPlaceToDay(place.id, day); schedule.setVisitMinutes(place.id, minutes); if (purpose) schedule.setStopPurpose(place.id, purpose);
    optimized.insertPlaceAfter(afterId, place.id);
    return true;
  };
  const addRestStop = (afterId: string, place: Place, minutes: number, purpose: StopPurpose) => addCourseStop(afterId, place, minutes, purpose);

  const resetTrip = (start: string, end: string) => {
    resetSaved(); schedule.resetSchedule(start, end); optimized.resetOrder(); setActiveDay("");
  };

  return {
    rememberSavedPlaces,
    addSuggestedBreaks, addRestStop, addCourseStop,
    canMoveToDate, movePlaceToDate,
    resetTrip,
    saved,
    activeDay,
    setActiveDay,
    savePlaceIds,
    ...schedule,
    ...optimized,
    storageReady: savedStorageReady && schedule.storageReady,
    toggleSaved,
    replaceSavedPlace,
  };
}
