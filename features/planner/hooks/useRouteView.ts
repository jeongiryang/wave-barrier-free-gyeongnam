"use client";

import { useMemo, useState } from "react";
import type { RouteAlternative } from "../../routing/types";
import { transportModes } from "../constants";
import type { TransportContext, TransportMode } from "../types";

export type RouteTravelMode = "walk" | "bicycle" | "transit" | "car";
export type LegacyRouteSort = "time" | "fare" | "transfer" | "walk";

const routeModeMeta: Array<{ id: RouteTravelMode; label: string; description: string }> = [
  { id: "walk", label: "도보", description: "걸어서 이동" },
  { id: "bicycle", label: "자전거", description: "자전거 이동" },
  { id: "transit", label: "대중교통", description: "지하철 · 기차 · 버스" },
  { id: "car", label: "자동차", description: "도로 경로" },
];

function belongsToMode(route: RouteAlternative, mode: RouteTravelMode) {
  if (mode === "walk") return route.mode === "walk";
  if (mode === "bicycle") return route.mode === "bicycle";
  if (mode === "car") return route.mode === "car";
  return route.mode === "transit" || route.mode === "train" || route.mode === "bus";
}

/**
 * 저장된 과거 비교 규칙의 순수 함수. 현재 UI는 이 정렬 탭을 노출하지 않고
 * 이동수단별 최소 시간 비교를 사용하지만, 기존 저장 데이터·회귀 계약을 검증할 때만 재사용한다.
 */
export function compareLegacyRoutePreference(routeSort: LegacyRouteSort, a: RouteAlternative, b: RouteAlternative) {
  if (routeSort === "fare") return (a.payment ?? Number.MAX_SAFE_INTEGER) - (b.payment ?? Number.MAX_SAFE_INTEGER);
  if (routeSort === "transfer") return a.transfers - b.transfers || a.totalTime - b.totalTime;
  if (routeSort === "walk") return a.totalWalk - b.totalWalk || a.totalTime - b.totalTime;
  return a.totalTime - b.totalTime;
}

export function useRouteView(routeAlternatives: RouteAlternative[], transportContext: TransportContext | null) {
  const [activeRouteId, setActiveRouteId] = useState("");
  const [routeTravelMode, setRouteTravelMode] = useState<RouteTravelMode>("transit");
  const [transportMode, setTransportMode] = useState<TransportMode>("all");
  const [selectedTransportDataset, setSelectedTransportDataset] = useState("bus-arrival");

  const routeModeSummaries = useMemo(() => routeModeMeta.map((mode, baseIndex) => {
    const routes = routeAlternatives.filter((route) => belongsToMode(route, mode.id));
    const configured = routes.filter((route) => route.configured && route.totalTime > 0);
    const minutes = configured.length ? Math.min(...configured.map((route) => route.totalTime)) : null;
    return { ...mode, minutes, configured: configured.length > 0, count: configured.length, baseIndex };
  }).sort((a, b) => {
    if (a.minutes === null && b.minutes === null) return a.baseIndex - b.baseIndex;
    if (a.minutes === null) return 1;
    if (b.minutes === null) return -1;
    return a.minutes - b.minutes || a.baseIndex - b.baseIndex;
  }), [routeAlternatives]);

  const filteredRouteAlternatives = useMemo(() => routeAlternatives
    .filter((route) => belongsToMode(route, routeTravelMode))
    .sort((a, b) => {
      if (a.configured !== b.configured) return a.configured ? -1 : 1;
      return a.totalTime - b.totalTime;
    }), [routeAlternatives, routeTravelMode]);

  return {
    activeRouteId,
    setActiveRouteId,
    routeTravelMode,
    setRouteTravelMode,
    routeModeSummaries,
    transportMode,
    setTransportMode,
    selectedTransportDataset,
    setSelectedTransportDataset,
    sortedRouteAlternatives: filteredRouteAlternatives,
    activeRoute: filteredRouteAlternatives.find((item) => item.id === activeRouteId) ?? filteredRouteAlternatives[0] ?? routeAlternatives[0] ?? null,
    selectedDataset: transportContext?.datasets.find((item) => item.id === selectedTransportDataset) ?? null,
    activeTransportMode: transportModes.find((item) => item.id === transportMode) ?? transportModes[0],
  };
}
