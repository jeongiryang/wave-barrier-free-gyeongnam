"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildItineraryLegs, usableLegRoutes } from "../../../lib/itinerary-legs.js";
import { fetchRouteData, type RouteDataBundle } from "../services/route-data";
import type { useTripSelection } from "./useTripSelection";
import type { useRoutePlanning } from "./useRoutePlanning";

export function useItineraryRoutes(trip: ReturnType<typeof useTripSelection>, route: ReturnType<typeof useRoutePlanning>) {
  const legs = useMemo(() => buildItineraryLegs({ places: trip.orderedSavedPlaces, days: trip.tripDays, assignments: trip.scheduleAssignments, origin: route.origin, originLabel: route.originLabel, privateOrigin: route.privateOrigin }), [trip.orderedSavedPlaces, trip.tripDays, trip.scheduleAssignments, route.origin, route.originLabel, route.privateOrigin]);
  const signature = JSON.stringify(legs.map((leg) => leg.key));
  const [evidence, setEvidence] = useState<{ signature: string; data: Record<string, RouteDataBundle> }>({ signature: "", data: {} });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const data = evidence.signature === signature ? evidence.data : {};
  const readyCount = legs.filter((leg) => usableLegRoutes(data[leg.key], route.routeTravelMode).length).length;
  const routeMinutes = Object.fromEntries(legs.flatMap((leg) => {
    const best = usableLegRoutes(data[leg.key], route.routeTravelMode)[0];
    return best ? [[leg.place.id, best.totalTime]] : [];
  }));

  useEffect(() => { controllerRef.current?.abort(); }, [signature]);
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function checkRoutes() {
    if (loading || !legs.length) return;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setLoading(true);
    setNotice("선택한 날짜와 순서대로 이동 구간을 확인하고 있어요.");
    setEvidence({ signature, data: {} });
    let next = 0;
    const timer = window.setTimeout(() => controller.abort(), 30_000);
    const worker = async () => {
      while (next < legs.length && !controller.signal.aborted) {
        const leg = legs[next++];
        if (!leg.from || !leg.to || leg.blocked) continue;
        try {
          const result = await fetchRouteData(leg.from, leg.to, controller.signal);
          if (!controller.signal.aborted && controllerRef.current === controller) setEvidence((current) => current.signature === signature ? { signature, data: { ...current.data, [leg.key]: result } } : current);
        } catch {
          // A missing leg stays explicitly unchecked. Never use an invented route.
        }
      }
    };
    try { await Promise.all([worker(), worker()]); }
    finally {
      window.clearTimeout(timer);
      if (controllerRef.current === controller) {
        setLoading(false);
        setNotice(controller.signal.aborted ? "확인을 중단했습니다. 확인되지 않은 구간은 다시 시도해 주세요." : "조회가 끝났습니다. 확인되지 않은 구간과 실제 이동 편의를 방문 전에 다시 확인해 주세요.");
      }
    }
  }

  return { legs, data, loading, notice, signature, readyCount, complete: legs.length > 0 && readyCount === legs.length, routeMinutes, checkRoutes, cancel: () => controllerRef.current?.abort() };
}
