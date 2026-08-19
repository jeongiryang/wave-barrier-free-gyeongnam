"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RoutePoint } from "../../routing/types";
import { explainVisitOrder, optimizeVisitOrder } from "../optimization/visit-order.js";
import type { Place } from "../types";
import { dateRange, localDate } from "../utils";

const SAVED_PLACES_KEY = "wave-saved-places";

export function useTripSelection({ activePlaces, origin, accessibilityProfileCount }: {
  activePlaces: Place[];
  origin: RoutePoint;
  accessibilityProfileCount: number;
}) {
  const [saved, setSaved] = useState<string[]>([]);
  const [travelStart, setTravelStart] = useState(localDate());
  const [travelEnd, setTravelEnd] = useState(localDate(1));
  const [scheduleAssignments, setScheduleAssignments] = useState<Record<string, string>>({});
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(SAVED_PLACES_KEY);
        const parsed = stored ? JSON.parse(stored) as unknown : [];
        if (Array.isArray(parsed)) setSaved(parsed.filter((id): id is string => typeof id === "string"));
      } catch {
        // 손상되거나 차단된 기기 저장소는 빈 보관함으로 안전하게 시작한다.
      }
      setStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(saved));
    } catch {
      // 저장소가 차단돼도 현재 탭의 여행 설계는 유지한다.
    }
  }, [saved, storageReady]);

  const tripDays = useMemo(() => dateRange(travelStart, travelEnd), [travelEnd, travelStart]);
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

  const changeTravelStart = useCallback((next: string) => {
    setTravelStart(next);
    setTravelEnd((current) => current < next ? next : current);
  }, []);

  const assignPlaceToDay = useCallback((placeId: string, day: string) => {
    setScheduleAssignments((current) => ({ ...current, [placeId]: day }));
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setSaved((current) => {
      if (current.includes(id)) {
        setScheduleAssignments((assignments) => {
          const next = { ...assignments };
          delete next[id];
          return next;
        });
        return current.filter((item) => item !== id);
      }
      setScheduleAssignments((assignments) => ({
        ...assignments,
        [id]: assignments[id] || tripDays[0] || travelStart,
      }));
      return [...current, id];
    });
  }, [travelStart, tripDays]);

  return {
    saved,
    travelStart,
    travelEnd,
    scheduleAssignments,
    tripDays,
    orderedSavedPlaces,
    orderExplanation,
    changeTravelStart,
    setTravelEnd,
    assignPlaceToDay,
    toggleSaved,
  };
}
