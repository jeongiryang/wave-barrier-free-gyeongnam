"use client";

import { useCallback } from "react";
import type { Place } from "../types";
import { useRouteOrigin } from "./useRouteOrigin";
import { useRouteRequest } from "./useRouteRequest";
import { useRouteView } from "./useRouteView";

export function useRoutePlanning(region: string) {
  const routeRequest = useRouteRequest(region);
  const { clearRouteAlternatives, loadRouteData, routeAlternatives, transportContext } = routeRequest;
  const routeOrigin = useRouteOrigin(clearRouteAlternatives);
  const { origin, originLabel, privateOrigin, setRouteNotice } = routeOrigin;
  const routeView = useRouteView(routeAlternatives, transportContext);
  const { setActiveRouteId } = routeView;

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
      onNotice: setRouteNotice,
      onActiveRouteChange: setActiveRouteId,
    });
  }, [loadRouteData, origin, originLabel, privateOrigin, setActiveRouteId, setRouteNotice]);

  return {
    ...routeOrigin,
    ...routeRequest,
    loadRoutes,
    ...routeView,
  };
}
