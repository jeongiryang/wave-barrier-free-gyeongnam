"use client";

import { useCallback } from "react";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import type { MapPlace, RoutePoint } from "../../routing/types";
import { mapPlaceToPlannerPlace, richSpotToPlace } from "../place-adapters";
import type { Place, RichSpot } from "../types";
import type { PointPicker } from "./useLocationSearch";

export function usePlannerPointActions({ region, origin, privateOrigin, pointPicker, routeDestination, activePlaces, updateOrigin, loadRoutes, clearLocationSearch, onSelectDestination }: {
  region: string;
  origin: RoutePoint;
  privateOrigin: boolean;
  pointPicker: PointPicker;
  routeDestination: Place | null;
  activePlaces: Place[];
  updateOrigin: (point: RoutePoint, label: string, isPrivate?: boolean) => void;
  loadRoutes: (place: Place, nextOrigin?: RoutePoint, nextOriginIsPrivate?: boolean, nextOriginLabel?: string) => Promise<void>;
  clearLocationSearch: () => void;
  onSelectDestination: (place: Place) => boolean;
}) {
  const choosePoint = useCallback((place: Place, mode = pointPicker) => {
    if (mode === "origin") {
      const next = { lat: Number(place.mapY), lng: Number(place.mapX) };
      if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return;
      updateOrigin(next, place.name);
      const destination = routeDestination || activePlaces[0];
      if (destination) void loadRoutes(destination, next, false, place.name);
    } else if (mode === "destination") {
      if (!onSelectDestination(place)) return;
      void loadRoutes(place, origin, privateOrigin);
    }
    clearLocationSearch();
  }, [activePlaces, clearLocationSearch, loadRoutes, origin, pointPicker, privateOrigin, routeDestination, updateOrigin, onSelectDestination]);

  const routeFromRichSpot = useCallback((spot: RichSpot) => {
    const place = richSpotToPlace(spot, region);
    if (!onSelectDestination(place)) return;
    void loadRoutes(place);
    scrollToSection("navigation");
  }, [loadRoutes, region, onSelectDestination]);

  const routeFromMapPlace = useCallback((mapPlace: MapPlace) => {
    const known = activePlaces.find((place) => place.id === mapPlace.id);
    const place = known || mapPlaceToPlannerPlace(mapPlace, region);
    if (!onSelectDestination(place)) return;
    void loadRoutes(place);
  }, [activePlaces, loadRoutes, region, onSelectDestination]);

  return { choosePoint, routeFromRichSpot, routeFromMapPlace };
}
