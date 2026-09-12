"use client";

import { useCallback } from "react";
import type { Place } from "../types";
import { useRouteOrigin } from "./useRouteOrigin";
import { useRouteRequest } from "./useRouteRequest";
import { useRouteView, type RouteTravelMode } from "./useRouteView";
import { routeResultNotice } from "../route-copy";

export function useRoutePlanning(region: string, journey: Parameters<typeof useRouteView>[2] & { storageReady: boolean }) {
  const routeRequest = useRouteRequest(region);
  const { clearRouteAlternatives, loadRouteData, routeAlternatives, transportContext } = routeRequest;
  const routeOrigin = useRouteOrigin(clearRouteAlternatives);
  const { origin, originLabel, privateOrigin, setRouteNotice } = routeOrigin;
  const routeView = useRouteView(routeAlternatives, transportContext, journey);
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
    if (!journey.storageReady) return;
    await loadRouteData({
      place,
      origin: nextOrigin,
      privateOrigin: nextOriginIsPrivate,
      originLabel: nextOriginLabel,
      mode: routeTravelMode,
      onNotice: setRouteNotice,
      onActiveRouteChange: setActiveRouteId,
    });
  }, [journey.storageReady, loadRouteData, origin, originLabel, privateOrigin, routeTravelMode, setActiveRouteId, setRouteNotice]);

  const setRouteTravelMode = (mode: RouteTravelMode) => {
    if (!journey.storageReady || mode === routeTravelMode) return;
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
