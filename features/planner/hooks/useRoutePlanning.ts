"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RouteAlternative } from "../../routing/types";
import { optionalPlannerJson, plannerJson } from "../services/api";
import type { DestinationCrowd, Place, TransportContext, TransportProvider } from "../types";
import { useRouteOrigin } from "./useRouteOrigin";
import { useRouteView } from "./useRouteView";

export function useRoutePlanning(region: string) {
  const [routeAlternatives, setRouteAlternatives] = useState<RouteAlternative[]>([]);
  const [routeDestination, setRouteDestination] = useState<Place | null>(null);
  const [destinationCrowd, setDestinationCrowd] = useState<DestinationCrowd | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [transportProviders, setTransportProviders] = useState<TransportProvider[]>([]);
  const [transportContext, setTransportContext] = useState<TransportContext | null>(null);
  const clearPrivateOriginRoutes = useCallback(() => setRouteAlternatives([]), []);
  const routeOrigin = useRouteOrigin(clearPrivateOriginRoutes);
  const { origin, originLabel, privateOrigin, setRouteNotice } = routeOrigin;
  const routeRequestRef = useRef<AbortController | null>(null);
  const routeView = useRouteView(routeAlternatives, transportContext);
  const { setActiveRouteId } = routeView;

  const loadRoutes = useCallback(async (
    place: Place,
    nextOrigin = origin,
    nextOriginIsPrivate = privateOrigin,
    nextOriginLabel = originLabel,
  ) => {
    routeRequestRef.current?.abort();
    const controller = new AbortController();
    routeRequestRef.current = controller;
    const endLat = Number(place.mapY);
    const endLng = Number(place.mapX);
    if (!Number.isFinite(endLat) || !Number.isFinite(endLng)) {
      setRouteNotice("선택한 여행지에 좌표가 없어 경로를 계산할 수 없습니다.");
      setRouteAlternatives([]);
      routeRequestRef.current = null;
      return;
    }
    setRouteLoading(true);
    setRouteDestination(place);
    setDestinationCrowd(null);
    if (nextOriginIsPrivate) {
      setRouteLoading(false);
      setRouteAlternatives([]);
      setRouteNotice("현재 위치는 이 지도에서만 표시합니다. 좌표를 서버로 보내지 않으므로 카카오 지도 앱에서 경로를 이어서 확인해 주세요.");
      routeRequestRef.current = null;
      return;
    }
    setRouteNotice(`${nextOriginLabel}에서 ${place.name}까지 이동 경로를 확인하고 있습니다.`);
    const crowdParams = new URLSearchParams({ action: "crowd", region, title: place.name });
    void optionalPlannerJson<{ crowd?: DestinationCrowd | null }>(`/api/wave?${crowdParams.toString()}`, { signal: controller.signal })
      .then((data) => {
        if (routeRequestRef.current === controller) setDestinationCrowd(data?.crowd || null);
      })
      .catch(() => {
        if (!controller.signal.aborted && routeRequestRef.current === controller) setDestinationCrowd(null);
      });
    try {
      const params = new URLSearchParams({
        startLat: String(nextOrigin.lat),
        startLng: String(nextOrigin.lng),
        endLat: String(endLat),
        endLng: String(endLng),
      });
      const data = await plannerJson<{
        alternatives?: RouteAlternative[];
        providers?: TransportProvider[];
        context?: TransportContext;
        configured?: boolean;
        message?: string;
      }>(`/api/route?${params.toString()}`, { cache: "no-store", signal: controller.signal });
      if (controller.signal.aborted || routeRequestRef.current !== controller) return;
      const alternatives = data.alternatives || [];
      setRouteAlternatives(alternatives);
      setTransportProviders(data.providers || []);
      setTransportContext(data.context || null);
      setActiveRouteId(alternatives[0]?.id || "");
      setRouteNotice(data.configured
        ? `${alternatives.length}개 실제 교통 경로와 운행 데이터를 비교합니다.`
        : (data.message || "직선 연결 미리보기입니다."));
    } catch (error) {
      if (controller.signal.aborted || routeRequestRef.current !== controller) return;
      setRouteAlternatives([]);
      setRouteNotice(error instanceof Error ? error.message : "경로 연결을 확인해 주세요.");
    } finally {
      if (routeRequestRef.current === controller) {
        routeRequestRef.current = null;
        setRouteLoading(false);
      }
    }
  }, [origin, originLabel, privateOrigin, region, setActiveRouteId, setRouteNotice]);

  const resetRouteData = useCallback(() => {
    routeRequestRef.current?.abort();
    routeRequestRef.current = null;
    setRouteAlternatives([]);
    setRouteDestination(null);
    setDestinationCrowd(null);
    setTransportProviders([]);
    setTransportContext(null);
    setRouteLoading(false);
  }, []);

  useEffect(() => () => routeRequestRef.current?.abort(), []);

  return {
    ...routeOrigin,
    routeAlternatives,
    routeDestination,
    destinationCrowd,
    routeLoading,
    transportProviders,
    transportContext,
    loadRoutes,
    resetRouteData,
    ...routeView,
  };
}
