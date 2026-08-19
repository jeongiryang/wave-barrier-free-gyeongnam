"use client";

import { useCallback } from "react";
import type { MapPlace, RoutePoint } from "../../routing/types";
import type { PointPicker } from "./useLocationSearch";
import type { Place, RichSpot } from "../types";

interface PlannerActionsOptions {
  region: string;
  origin: RoutePoint;
  originLabel: string;
  privateOrigin: boolean;
  pointPicker: PointPicker;
  routeDestination: Place | null;
  activePlaces: Place[];
  impactAlternative: Place | null;
  updateOrigin: (point: RoutePoint, label: string, isPrivate?: boolean) => void;
  loadRoutes: (
    place: Place,
    nextOrigin?: RoutePoint,
    nextOriginIsPrivate?: boolean,
    nextOriginLabel?: string,
  ) => Promise<void>;
  clearLocationSearch: () => void;
  setTheme: (theme: string) => void;
  setNotice: (notice: string) => void;
  setRouteNotice: (notice: string) => void;
}

export function richSpotToPlace(spot: RichSpot, region: string): Place {
  return {
    id: spot.id,
    contentTypeId: "",
    city: region,
    name: spot.title,
    address: spot.address,
    summary: spot.summary,
    image: spot.image,
    mapX: spot.mapX,
    mapY: spot.mapY,
    score: null,
    features: [spot.tag],
    details: [spot.summary],
    source: spot.source,
  };
}

export function mapPlaceToPlannerPlace(mapPlace: MapPlace, region: string): Place {
  return {
    id: mapPlace.id,
    contentTypeId: "12",
    city: region,
    name: mapPlace.name,
    address: mapPlace.address || "지도에서 선택한 위치",
    summary: mapPlace.summary || "지도에서 직접 선택한 목적지입니다.",
    image: mapPlace.image || "",
    mapX: mapPlace.mapX,
    mapY: mapPlace.mapY,
    score: mapPlace.score,
    features: [],
    details: ["선택한 좌표를 기준으로 교통 경로를 조회합니다."],
    source: "지도 직접 선택",
  };
}

export function usePlannerActions({
  region,
  origin,
  originLabel,
  privateOrigin,
  pointPicker,
  routeDestination,
  activePlaces,
  impactAlternative,
  updateOrigin,
  loadRoutes,
  clearLocationSearch,
  setTheme,
  setNotice,
  setRouteNotice,
}: PlannerActionsOptions) {
  const choosePoint = useCallback((place: Place, mode = pointPicker) => {
    if (mode === "origin") {
      const next = { lat: Number(place.mapY), lng: Number(place.mapX) };
      if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return;
      updateOrigin(next, place.name);
      const destination = routeDestination || activePlaces[0];
      if (destination) void loadRoutes(destination, next, false, place.name);
    } else if (mode === "destination") {
      void loadRoutes(place, origin, privateOrigin);
    }
    clearLocationSearch();
  }, [activePlaces, clearLocationSearch, loadRoutes, origin, pointPicker, privateOrigin, routeDestination, updateOrigin]);

  const routeFromRichSpot = useCallback((spot: RichSpot) => {
    void loadRoutes(richSpotToPlace(spot, region));
    document.getElementById("navigation")?.scrollIntoView({ behavior: "smooth" });
  }, [loadRoutes, region]);

  const routeFromMapPlace = useCallback((mapPlace: MapPlace) => {
    const known = activePlaces.find((place) => place.id === mapPlace.id);
    void loadRoutes(known || mapPlaceToPlannerPlace(mapPlace, region));
  }, [activePlaces, loadRoutes, region]);

  const applyImpactAction = useCallback((action: "culture" | "alternative") => {
    if (action === "culture") {
      setTheme("history");
      setNotice("강수 영향을 반영해 역사·문화 후보를 다시 확인합니다.");
      window.setTimeout(() => document.getElementById("places")?.scrollIntoView({ behavior: "smooth" }), 700);
      return;
    }
    if (!impactAlternative) return;
    void loadRoutes(impactAlternative);
    document.getElementById("navigation")?.scrollIntoView({ behavior: "smooth" });
  }, [impactAlternative, loadRoutes, setNotice, setTheme]);

  const copyBookingRoute = useCallback(async (provider: string) => {
    const destination = routeDestination?.name || activePlaces[0]?.name || region;
    const text = `${originLabel} → ${destination}`;
    try {
      await navigator.clipboard?.writeText(text);
      setRouteNotice(`${provider} 공식 사이트를 열었습니다. 출발·도착 정보 “${text}”를 붙여넣을 수 있도록 복사했습니다.`);
    } catch {
      setRouteNotice(`${provider} 공식 사이트를 열었습니다. 출발 ${originLabel}, 도착 ${destination}을 선택해 주세요.`);
    }
  }, [activePlaces, originLabel, region, routeDestination, setRouteNotice]);

  return { choosePoint, routeFromRichSpot, routeFromMapPlace, applyImpactAction, copyBookingRoute };
}
