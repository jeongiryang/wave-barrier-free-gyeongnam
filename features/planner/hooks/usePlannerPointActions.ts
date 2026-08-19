"use client";

import { useCallback } from "react";
import type { MapPlace, RoutePoint } from "../../routing/types";
import { mapPlaceToPlannerPlace, richSpotToPlace } from "../place-adapters";
import type { Place, RichSpot } from "../types";
import type { PointPicker } from "./useLocationSearch";

export function usePlannerPointActions({ region, origin, privateOrigin, pointPicker, routeDestination, activePlaces, updateOrigin, loadRoutes, clearLocationSearch }: {
  region: string;
  origin: RoutePoint;
  privateOrigin: boolean;
  pointPicker: PointPicker;
  routeDestination: Place | null;
  activePlaces: Place[];
  updateOrigin: (point: RoutePoint, label: string, isPrivate?: boolean) => void;
  loadRoutes: (place: Place, nextOrigin?: RoutePoint, nextOriginIsPrivate?: boolean, nextOriginLabel?: string) => Promise<void>;
  clearLocationSearch: () => void;
}) {
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

  return { choosePoint, routeFromRichSpot, routeFromMapPlace };
}
