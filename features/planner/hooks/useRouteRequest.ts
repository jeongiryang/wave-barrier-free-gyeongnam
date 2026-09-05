"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RouteAlternative, RoutePoint } from "../../routing/types";
import type { DestinationCrowd, Place, TransportContext, TransportProvider } from "../types";
import { fetchDestinationCrowd, fetchRouteData } from "../services/route-data";

interface RouteRequestOptions {
  place: Place;
  origin: RoutePoint;
  privateOrigin: boolean;
  originLabel: string;
  onNotice: (message: string) => void;
  onActiveRouteChange: (routeId: string) => void;
}

export function useRouteRequest(region: string) {
  const [routeAlternatives, setRouteAlternatives] = useState<RouteAlternative[]>([]);
  const [routeDestination, setRouteDestination] = useState<Place | null>(null);
  const [destinationCrowd, setDestinationCrowd] = useState<DestinationCrowd | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [transportProviders, setTransportProviders] = useState<TransportProvider[]>([]);
  const [transportContext, setTransportContext] = useState<TransportContext | null>(null);
  const routeRequestRef = useRef<AbortController | null>(null);

  const clearRouteAlternatives = useCallback(() => {
    routeRequestRef.current?.abort();
    routeRequestRef.current = null;
    setRouteAlternatives([]);
    setDestinationCrowd(null);
    setTransportProviders([]);
    setTransportContext(null);
    setRouteLoading(false);
  }, []);

  const loadRouteData = useCallback(async ({
    place,
    origin,
    privateOrigin,
    originLabel,
    onNotice,
    onActiveRouteChange,
  }: RouteRequestOptions) => {
    routeRequestRef.current?.abort();
    const controller = new AbortController();
    routeRequestRef.current = controller;
    const endLat = Number(place.mapY);
    const endLng = Number(place.mapX);
    if (!place.mapX.trim() || !place.mapY.trim() || !Number.isFinite(endLat) || !Number.isFinite(endLng)) {
      onNotice("선택한 여행지에 좌표가 없어 경로를 계산할 수 없습니다.");
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
      onNotice("현재 위치 좌표는 W.A.V.E 경로 API에 보내지 않습니다. 경로를 비교하려면 공개 출발 거점을 선택하거나 카카오 지도 앱에서 직접 확인해 주세요. 지도 제공처의 화면 영역·접속 정보 처리는 개인정보처리방침을 확인해 주세요.");
      routeRequestRef.current = null;
      return;
    }
    onNotice(`${originLabel}에서 ${place.name}까지 이동 경로를 확인하고 있습니다.`);
    void fetchDestinationCrowd(region, place, controller.signal)
      .then((crowd) => {
        if (routeRequestRef.current === controller) setDestinationCrowd(crowd);
      })
      .catch(() => {
        if (!controller.signal.aborted && routeRequestRef.current === controller) setDestinationCrowd(null);
      });
    try {
      const data = await fetchRouteData(origin, { lat: endLat, lng: endLng }, controller.signal);
      if (controller.signal.aborted || routeRequestRef.current !== controller) return;
      const alternatives = data.alternatives || [];
      setRouteAlternatives(alternatives);
      setTransportProviders(data.providers || []);
      setTransportContext(data.context || null);
      onActiveRouteChange(alternatives[0]?.id || "");
      onNotice(data.configured
        ? `${alternatives.length}개 실제 교통 경로와 운행 데이터를 비교합니다.`
        : (data.message || "직선 연결 미리보기입니다."));
    } catch (error) {
      if (controller.signal.aborted || routeRequestRef.current !== controller) return;
      setRouteAlternatives([]);
      onNotice(error instanceof Error ? error.message : "경로 연결을 확인해 주세요.");
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
  }, []);

  useEffect(() => () => routeRequestRef.current?.abort(), []);

  return {
    routeAlternatives,
    routeDestination,
    destinationCrowd,
    routeLoading,
    transportProviders,
    transportContext,
    clearRouteAlternatives,
    loadRouteData,
    resetRouteData,
  };
}
