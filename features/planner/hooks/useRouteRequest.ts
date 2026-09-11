"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasJourneyEstimate } from "../../../lib/route-estimates.js";
import { supportedPlacePoint } from "../../../lib/map-coordinates.js";
import type { RouteAlternative, RoutePoint } from "../../routing/types";
import type { DestinationCrowd, Place, TransportContext, TransportProvider } from "../types";
import { fetchDestinationCrowd, fetchRouteData } from "../services/route-data";
import type { RouteDataBundle } from "../services/route-data";
import { routeResultNotice, type RouteNotice } from "../route-copy";
import type { RouteTravelMode } from "./useRouteView";

interface RouteRequestOptions {
  place: Place;
  origin: RoutePoint;
  privateOrigin: boolean;
  originLabel: string;
  mode: RouteTravelMode;
  onNotice: (message: RouteNotice) => void;
  onActiveRouteChange: (routeId: string) => void;
}

export function useRouteRequest(region: string) {
  const [routeAlternatives, setRouteAlternatives] = useState<RouteAlternative[]>([]);
  const [routeDestination, setRouteDestination] = useState<Place | null>(null);
  const [destinationCrowd, setDestinationCrowd] = useState<DestinationCrowd | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeFailed, setRouteFailed] = useState(false);
  const [transportProviders, setTransportProviders] = useState<TransportProvider[]>([]);
  const [transportContext, setTransportContext] = useState<TransportContext | null>(null);
  const routeRequestRef = useRef<AbortController | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<{ point: RoutePoint; label: string; isPrivate: boolean } | null>(null);

  const clearRouteAlternatives = useCallback(() => {
    routeRequestRef.current?.abort();
    routeRequestRef.current = null;
    setRouteAlternatives([]);
    setDestinationCrowd(null);
    setTransportProviders([]);
    setTransportContext(null);
    setRouteLoading(false);
    setRouteFailed(false);
    setRouteOrigin(null);
  }, []);

  const loadRouteData = useCallback(async ({
    place,
    origin,
    privateOrigin,
    originLabel,
    mode,
    onNotice,
    onActiveRouteChange,
  }: RouteRequestOptions) => {
    routeRequestRef.current?.abort();
    const controller = new AbortController();
    setRouteFailed(false);
    routeRequestRef.current = controller;
    setRouteOrigin({ point: origin, label: originLabel, isPrivate: privateOrigin });
    const endpoint = supportedPlacePoint(place.mapX, place.mapY);
    if (!endpoint || !supportedPlacePoint(origin.lng, origin.lat)) {
      onNotice({ ko: "선택한 여행지에 좌표가 없어 경로를 계산할 수 없습니다. 카카오맵에서 장소 이름으로 확인해 주세요.", en: "This place has no coordinates for a route calculation. Search by its name in Kakao Maps." });
      setRouteAlternatives([]);
      setRouteDestination(place);
      setRouteLoading(false);
      setTransportContext(null);
      setTransportProviders([]);
      setDestinationCrowd(null);
      routeRequestRef.current = null;
      return;
    }
    setRouteLoading(true);
    setRouteAlternatives([]);
    setRouteDestination(place);
    setDestinationCrowd(null);
    setTransportContext(null);
    setTransportProviders([]);
    if (privateOrigin) {
      setRouteLoading(false);
      setRouteAlternatives([]);
      onNotice({ ko: "현재 위치 좌표는 WAVE 경로 API나 외부 링크에 넣지 않습니다. 공개 출발 거점을 선택하거나 카카오맵에서 출발지·이동수단을 직접 선택해 주세요. 지도 제공처의 처리는 개인정보처리방침을 확인해 주세요.", en: "Device coordinates are not sent to WAVE routes or external links. Choose a public departure or select departure and mode in Kakao Maps. See the privacy policy for map provider processing." });
      routeRequestRef.current = null;
      return;
    }
    onNotice({ ko: "출발지부터 도착지까지 이동 경로를 확인하고 있습니다.", en: "Checking routes from departure to destination.", subject: `${originLabel} → ${place.name}` });
    void fetchDestinationCrowd(region, place, controller.signal)
      .then((crowd) => {
        if (routeRequestRef.current === controller) setDestinationCrowd(crowd);
      })
      .catch(() => {
        if (!controller.signal.aborted && routeRequestRef.current === controller) setDestinationCrowd(null);
      });
    try {
      const data = await fetchRouteData(origin, endpoint, mode, controller.signal);
      if (controller.signal.aborted || routeRequestRef.current !== controller) return;
      const alternatives = data.alternatives || [];
      setRouteAlternatives(alternatives);
      setTransportProviders(data.providers || []);
      setTransportContext(data.context || null);
      onActiveRouteChange(alternatives.find(hasJourneyEstimate)?.id || "");
      onNotice(routeResultNotice(alternatives));
    } catch {
      if (controller.signal.aborted || routeRequestRef.current !== controller) return;
      setRouteFailed(true);
      setRouteAlternatives([]);
      onNotice({ ko: "이동 경로를 확인하지 못했습니다. 다시 조회하거나 카카오맵에서 확인해 주세요.", en: "Routes could not be checked. Try again or check in Kakao Maps." });
    } finally {
      if (routeRequestRef.current === controller) {
        setRouteLoading(false);
      }
    }
  }, [region]);

  const resetRouteData = useCallback(() => {
    routeRequestRef.current?.abort();
    routeRequestRef.current = null;
    setRouteAlternatives([]);
    setRouteDestination(null);
    setDestinationCrowd(null);
    setTransportProviders([]);
    setTransportContext(null);
    setRouteLoading(false);
    setRouteFailed(false);
    setRouteOrigin(null);
  }, []);

  const displayRouteData = useCallback((place: Place, start: RoutePoint, label: string, bundle: RouteDataBundle) => {
    routeRequestRef.current?.abort();
    routeRequestRef.current = null;
    setRouteLoading(false);
    setRouteFailed(false);
    setRouteDestination(place);
    // Only public, unblocked itinerary legs are fetched and displayed here.
    setRouteOrigin({ point: start, label, isPrivate: false });
    setRouteAlternatives(bundle.alternatives || []);
    setTransportProviders(bundle.providers || []);
    setTransportContext(bundle.context || null);
    setDestinationCrowd(null);
  }, []);

  useEffect(() => () => routeRequestRef.current?.abort(), []);

  return {
    routeAlternatives,
    routeDestination,
    destinationCrowd,
    routeLoading,
    routeFailed,
    transportProviders,
    transportContext,
    clearRouteAlternatives,
    loadRouteData,
    resetRouteData,
    routeStart: routeOrigin?.point ?? null,
    routeStartLabel: routeOrigin?.label ?? "",
    routeStartIsPrivate: routeOrigin?.isPrivate ?? false,
    displayRouteData,
  };
}
