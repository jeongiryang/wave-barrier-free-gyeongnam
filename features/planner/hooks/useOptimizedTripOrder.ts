"use client";

import { useMemo } from "react";
import type { RoutePoint } from "../../routing/types";
import { explainVisitOrder, optimizeVisitOrder } from "../optimization/visit-order.js";
import type { Place } from "../types";

export function useOptimizedTripOrder({ activePlaces, saved, origin, accessibilityProfileCount }: {
  activePlaces: Place[];
  saved: string[];
  origin: RoutePoint;
  accessibilityProfileCount: number;
}) {
  const savedPlaces = useMemo(
    () => activePlaces.filter((place) => saved.includes(place.id)),
    [activePlaces, saved],
  );
  const orderedSavedPlaces = useMemo(
    () => optimizeVisitOrder(savedPlaces, { origin, accessibilityWeight: accessibilityProfileCount ? 0.12 : 0 }),
    [accessibilityProfileCount, origin, savedPlaces],
  );
  const orderExplanation = useMemo(
    () => explainVisitOrder(orderedSavedPlaces, origin),
    [orderedSavedPlaces, origin],
  );

  return { orderedSavedPlaces, orderExplanation };
}
