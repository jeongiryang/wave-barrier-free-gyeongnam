"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { routeWalkingEvidence } from "../../../lib/trip-comfort.js";
import { buildItineraryLegs, usableLegRoutes } from "../../../lib/itinerary-legs.js";
import { supportedPlacePoint } from "../../../lib/map-coordinates.js";
import { fetchRouteData, type RouteDataBundle } from "../services/route-data";
import type { useTripSelection } from "./useTripSelection";
import type { useRoutePlanning } from "./useRoutePlanning";

export function useItineraryRoutes(trip: ReturnType<typeof useTripSelection>, route: ReturnType<typeof useRoutePlanning>) {
  const legs = useMemo(() => buildItineraryLegs({ places: trip.orderedSavedPlaces, days: trip.tripDays, assignments: trip.scheduleAssignments, origin: route.origin, originLabel: route.originLabel, privateOrigin: route.privateOrigin }), [trip.orderedSavedPlaces, trip.tripDays, trip.scheduleAssignments, route.origin, route.originLabel, route.privateOrigin]);
  const signature = JSON.stringify([route.routeTravelMode, legs.map((leg) => leg.key)]);
  const [evidence, setEvidence] = useState<{ signature: string; data: Record<string, RouteDataBundle> }>({ signature: "", data: {} });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const lastAutomaticSignature = useRef('');
  const data = evidence.signature === signature ? evidence.data : {};
  const readyCount = legs.filter((leg) => usableLegRoutes(data[leg.key], route.routeTravelMode).length).length;
  const selectedDestination = route.routeDestination && supportedPlacePoint(route.routeDestination.mapX, route.routeDestination.mapY);
  const selectedRoute = usableLegRoutes({ alternatives: route.activeRoute ? [route.activeRoute] : [] }, route.routeTravelMode)[0];
  const selectedLeg = !route.routeStartIsPrivate && route.routeStart && selectedDestination && selectedRoute
    ? legs.find(leg => !leg.blocked && leg.place.id === route.routeDestination?.id
      && leg.from?.lat === route.routeStart?.lat && leg.from?.lng === route.routeStart?.lng
      && leg.to?.lat === selectedDestination.lat && leg.to?.lng === selectedDestination.lng)
    : undefined;
  // An automatic check supplies the remaining legs. It must not replace the
  // traveler's selected alternative for the exact same public journey.
  const bestRoute = (leg: (typeof legs)[number]) => leg.key === selectedLeg?.key
    ? selectedRoute : usableLegRoutes(data[leg.key], route.routeTravelMode)[0];
  const routeMinutes = Object.fromEntries(legs.flatMap((leg) => {
    const best = bestRoute(leg);
    return best ? [[leg.place.id, best.totalTime]] : [];
  }));

  const walkingByPlaceId = Object.fromEntries(legs.map(leg => [leg.place.id, routeWalkingEvidence(bestRoute(leg))]));
  const costByPlaceId = Object.fromEntries(legs.flatMap(leg => {
    const best = bestRoute(leg);
    return best ? [[leg.place.id, { configured: best.configured, payment: best.payment, paymentType: best.paymentType }]] : [];
  }));

  useEffect(() => { controllerRef.current?.abort(); }, [signature]);
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function checkRoutes() {
    if (!trip.storageReady || loading || controllerRef.current || !legs.length) return;
    // A manual check also satisfies the pending automatic check for this trip.
    lastAutomaticSignature.current = signature;
    const controller = new AbortController();
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
          const result = await fetchRouteData(leg.from, leg.to, route.routeTravelMode, controller.signal);
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
        controllerRef.current = null;
        setLoading(false);
        setNotice(controller.signal.aborted ? "확인을 중단했습니다. 확인되지 않은 구간은 다시 시도해 주세요." : "조회가 끝났습니다. 확인되지 않은 구간과 실제 이동 편의를 방문 전에 다시 확인해 주세요.");
      }
    }
  }

  function resetItineraryRoutes() {
    controllerRef.current?.abort(); controllerRef.current = null;
    setEvidence({ signature: "", data: {} }); setLoading(false); setNotice("");
  }

  const automaticCheck = useRef(checkRoutes);
  useEffect(() => { automaticCheck.current = checkRoutes; });
  useEffect(() => {
    if (!trip.storageReady || loading || !legs.length || lastAutomaticSignature.current === signature) return;
    const timer = window.setTimeout(() => { void automaticCheck.current(); }, 650);
    return () => window.clearTimeout(timer);
  }, [signature, trip.storageReady, legs.length, loading]);

  return { costByPlaceId, walkingByPlaceId, resetItineraryRoutes, legs, data, loading, notice, signature, readyCount, complete: legs.length > 0 && readyCount === legs.length, routeMinutes, checkRoutes, cancel: () => controllerRef.current?.abort() };
}
