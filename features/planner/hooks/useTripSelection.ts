"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveSavedPlaces } from "../../../lib/saved-place-catalog.js";
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
  const { saved, catalog, storageReady: savedStorageReady, addSavedIds, removeSavedId, rememberSavedPlaces } = useSavedPlaceIds();
  const schedule = useTripSchedule();
  const [dayChoice, setActiveDay] = useState("");
  const activeDay = schedule.tripDays.includes(dayChoice) ? dayChoice : schedule.tripDays[0];
  const { ensurePlaceAssignment, removePlaceAssignment } = schedule;
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
  });

  const toggleSaved = useCallback((id: string, snapshot?: Place) => {
    if (saved.includes(id)) {
      removePlaceAssignment(id);
      removeSavedId(id);
      return;
    }
    const place = snapshot || activePlaces.find((item) => item.id === id);
    if (!place) return false;
    ensurePlaceAssignment(id);
    addSavedIds([id], [place]);
    return true;
  }, [activePlaces, addSavedIds, ensurePlaceAssignment, removePlaceAssignment, removeSavedId, saved]);

  // 지도에서 한 번에 담을 때 쓴다. 이미 담긴 곳은 건너뛰고 실제로 더한 수를 돌려준다.
  const savePlaceIds = useCallback((ids: string[]) => {
    const additions = ids.filter((id) => !saved.includes(id) && activePlaces.some((place) => place.id === id));
    additions.forEach(ensurePlaceAssignment);
    addSavedIds(additions, activePlaces);
    return additions.length;
  }, [activePlaces, addSavedIds, ensurePlaceAssignment, saved]);

  return {
    saved,
    activeDay,
    setActiveDay,
    savePlaceIds,
    ...schedule,
    ...optimized,
    toggleSaved,
  };
}
