"use client";

import { useCallback } from "react";
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
  const { saved, storageReady: savedStorageReady, addSavedIds, toggleSavedId } = useSavedPlaceIds();
  const schedule = useTripSchedule();
  const { ensurePlaceAssignment, removePlaceAssignment } = schedule;
  const optimized = useOptimizedTripOrder({
    activePlaces,
    saved,
    savedStorageReady,
    origin,
    accessibilityProfileCount,
    scheduleAssignments: schedule.scheduleAssignments,
    defaultDay: schedule.tripDays[0] || schedule.travelStart,
  });

  const toggleSaved = useCallback((id: string) => {
    if (saved.includes(id)) removePlaceAssignment(id);
    else ensurePlaceAssignment(id);
    toggleSavedId(id);
  }, [ensurePlaceAssignment, removePlaceAssignment, saved, toggleSavedId]);

  // 지도에서 한 번에 담을 때 쓴다. 이미 담긴 곳은 건너뛰고 실제로 더한 수를 돌려준다.
  const savePlaceIds = useCallback((ids: string[]) => {
    const additions = ids.filter((id) => !saved.includes(id));
    additions.forEach(ensurePlaceAssignment);
    addSavedIds(additions);
    return additions.length;
  }, [addSavedIds, ensurePlaceAssignment, saved]);

  return {
    saved,
    savePlaceIds,
    ...schedule,
    ...optimized,
    toggleSaved,
  };
}
