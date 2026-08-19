"use client";

import { useCallback } from "react";
import type { Place } from "../types";

export function useBookingRouteClipboard({ originLabel, region, routeDestination, activePlaces, setRouteNotice }: {
  originLabel: string;
  region: string;
  routeDestination: Place | null;
  activePlaces: Place[];
  setRouteNotice: (notice: string) => void;
}) {
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
  return { copyBookingRoute };
}
