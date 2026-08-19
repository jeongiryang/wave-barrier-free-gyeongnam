"use client";

import { useMemo, useState } from "react";
import type { RouteAlternative } from "../../../components/RouteMap";
import { transportModes } from "../constants";
import type { TransportContext, TransportMode } from "../types";

export type RouteSort = "time" | "fare" | "transfer" | "walk";

export function useRouteView(routeAlternatives: RouteAlternative[], transportContext: TransportContext | null) {
  const [activeRouteId, setActiveRouteId] = useState("");
  const [routeSort, setRouteSort] = useState<RouteSort>("time");
  const [transportMode, setTransportMode] = useState<TransportMode>("all");
  const [selectedTransportDataset, setSelectedTransportDataset] = useState("bus-arrival");

  const filteredRouteAlternatives = useMemo(() => routeAlternatives.filter((route) => {
    if (transportMode === "all") return true;
    if (transportMode === "car") return route.mode === "car";
    if (transportMode === "rail") return route.mode === "train" || /KORAIL|철도|열차/i.test(`${route.provider} ${route.label}`);
    if (transportMode === "bus") return route.mode === "bus" || route.mode === "transit";
    if (transportMode === "regional") return route.mode === "train" || /고속|시외/i.test(route.label);
    return route.mode === "walk" || route.mode === "bicycle";
  }), [routeAlternatives, transportMode]);

  const sortedRouteAlternatives = useMemo(() => [...filteredRouteAlternatives].sort((a, b) => {
    if (routeSort === "fare") return (a.payment ?? Number.MAX_SAFE_INTEGER) - (b.payment ?? Number.MAX_SAFE_INTEGER);
    if (routeSort === "transfer") return a.transfers - b.transfers || a.totalTime - b.totalTime;
    if (routeSort === "walk") return a.totalWalk - b.totalWalk || a.totalTime - b.totalTime;
    return a.totalTime - b.totalTime;
  }), [filteredRouteAlternatives, routeSort]);

  return {
    activeRouteId,
    setActiveRouteId,
    routeSort,
    setRouteSort,
    transportMode,
    setTransportMode,
    selectedTransportDataset,
    setSelectedTransportDataset,
    sortedRouteAlternatives,
    activeRoute: sortedRouteAlternatives.find((item) => item.id === activeRouteId) ?? sortedRouteAlternatives[0] ?? null,
    selectedDataset: transportContext?.datasets.find((item) => item.id === selectedTransportDataset) ?? null,
    activeTransportMode: transportModes.find((item) => item.id === transportMode) ?? transportModes[0],
  };
}
