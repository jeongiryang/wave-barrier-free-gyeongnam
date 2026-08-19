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
  const { saved, toggleSavedId } = useSavedPlaceIds();
  const schedule = useTripSchedule();
  const { ensurePlaceAssignment, removePlaceAssignment } = schedule;
  const optimized = useOptimizedTripOrder({ activePlaces, saved, origin, accessibilityProfileCount });

  const toggleSaved = useCallback((id: string) => {
    if (saved.includes(id)) removePlaceAssignment(id);
    else ensurePlaceAssignment(id);
    toggleSavedId(id);
  }, [ensurePlaceAssignment, removePlaceAssignment, saved, toggleSavedId]);

  return {
    saved,
    ...schedule,
    ...optimized,
    toggleSaved,
  };
}
