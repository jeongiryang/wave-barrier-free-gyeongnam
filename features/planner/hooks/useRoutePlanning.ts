"use client";

import { useCallback } from "react";
import type { Place } from "../types";
import { useRouteOrigin } from "./useRouteOrigin";
import { useRouteRequest } from "./useRouteRequest";
import { useRouteView, type RouteTravelMode } from "./useRouteView";
import { routeResultNotice } from "../route-copy";

export function useRoutePlanning(region: string) {
  const routeRequest = useRouteRequest(region);
  const { clearRouteAlternatives, loadRouteData, routeAlternatives, transportContext } = routeRequest;
  const routeOrigin = useRouteOrigin(clearRouteAlternatives);
  const { origin, originLabel, privateOrigin, setRouteNotice } = routeOrigin;
  const routeView = useRouteView(routeAlternatives, transportContext);
  const { setActiveRouteId, routeTravelMode } = routeView;
  const { displayRouteData } = routeRequest;
  const showItineraryRoute = useCallback((...args: Parameters<typeof displayRouteData>) => {
    displayRouteData(...args);
    setRouteNotice(routeResultNotice(args[3].alternatives || []));
  }, [displayRouteData, setRouteNotice]);

  const loadRoutes = useCallback(async (
    place: Place,
    nextOrigin = origin,
    nextOriginIsPrivate = privateOrigin,
    nextOriginLabel = originLabel,
  ) => {
    await loadRouteData({
      place,
      origin: nextOrigin,
      privateOrigin: nextOriginIsPrivate,
      originLabel: nextOriginLabel,
      mode: routeTravelMode,
      onNotice: setRouteNotice,
      onActiveRouteChange: setActiveRouteId,
    });
  }, [loadRouteData, origin, originLabel, privateOrigin, routeTravelMode, setActiveRouteId, setRouteNotice]);

  const setRouteTravelMode = (mode: RouteTravelMode) => {
    if (mode === routeTravelMode) return;
    routeView.setRouteTravelMode(mode);
    const { routeDestination, routeStart, routeStartIsPrivate, routeStartLabel } = routeRequest;
    if (routeDestination && routeStart) void loadRouteData({
      place: routeDestination, origin: routeStart, privateOrigin: routeStartIsPrivate,
      originLabel: routeStartLabel, mode, onNotice: setRouteNotice, onActiveRouteChange: setActiveRouteId,
    });
  };

  return {
    ...routeOrigin,
    ...routeRequest,
    displayRouteData: showItineraryRoute,
    loadRoutes,
    ...routeView,
    setRouteTravelMode,
  };
}
