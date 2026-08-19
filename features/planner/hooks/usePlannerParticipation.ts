"use client";

import type { Place } from "../types";
import { useAccessibilityFeedback } from "./useAccessibilityFeedback";
import { useTripSharing, type TripSharingOptions } from "./useTripSharing";

interface PlannerParticipationOptions extends TripSharingOptions {
  selectedPlace: Place | null;
}

export function usePlannerParticipation({ selectedPlace, ...sharingOptions }: PlannerParticipationOptions) {
  const sharing = useTripSharing(sharingOptions);
  const feedback = useAccessibilityFeedback(selectedPlace);
  return { ...sharing, ...feedback };
}
