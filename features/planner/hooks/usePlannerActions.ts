"use client";

import type { RoutePoint } from "../../routing/types";
import type { PointPicker } from "./useLocationSearch";
import type { Place } from "../types";
import { useBookingRouteClipboard } from "./useBookingRouteClipboard";
import { usePlannerImpactAction } from "./usePlannerImpactAction";
import { usePlannerPointActions } from "./usePlannerPointActions";

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
  const points = usePlannerPointActions({ region, origin, privateOrigin, pointPicker, routeDestination, activePlaces, updateOrigin, loadRoutes, clearLocationSearch });
  const impact = usePlannerImpactAction({ impactAlternative, loadRoutes, setTheme, setNotice });
  const booking = useBookingRouteClipboard({ originLabel, region, routeDestination, activePlaces, setRouteNotice });
  return { ...points, ...impact, ...booking };
}
