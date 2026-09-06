"use client";

import { useCallback } from "react";
import type { Place } from "../types";
import type { RouteNotice } from "../route-copy";

export function useBookingRouteClipboard({ originLabel, region, routeDestination, activePlaces, setRouteNotice }: {
  originLabel: string;
  region: string;
  routeDestination: Place | null;
  activePlaces: Place[];
  setRouteNotice: (notice: RouteNotice) => void;
}) {
  const copyBookingRoute = useCallback(async (provider: string) => {
    const destination = routeDestination?.name || activePlaces[0]?.name || region;
    const text = `${originLabel} → ${destination}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setRouteNotice({ ko: "출발·도착 정보를 복사했습니다. 공식 예매 사이트에서 붙여넣고 운행을 확인해 주세요.", en: "Departure and destination copied. Paste them on the official booking site and check the service.", subject: `${provider}: ${text}` });
    } catch {
      setRouteNotice({ ko: "출발·도착 정보를 복사하지 못했습니다. 공식 예매 사이트에서 직접 선택해 주세요.", en: "Departure and destination could not be copied. Select them on the official booking site.", subject: `${provider}: ${text}` });
    }
  }, [activePlaces, originLabel, region, routeDestination, setRouteNotice]);
  return { copyBookingRoute };
}
