"use client";

import { useCallback, useRef, useState } from "react";
import type { RoutePoint } from "../../routing/types";
import { departurePresets } from "../constants";
import { confirmMapLocationUse } from "../../../lib/location-consent.js";
import type { RouteNotice } from "../route-copy";
import { useSitePreferences } from "../../../components/SitePreferences";

const initialNotice: RouteNotice = { ko: "여행지를 찾으면 출발지부터의 이동 경로를 비교합니다.", en: "Find a place to compare routes from your departure point." };

export function useRouteOrigin(onPrivateOrigin?: () => void) {
  const locationGeneration = useRef(0);
  const { locale } = useSitePreferences();
  const [origin, setOrigin] = useState<RoutePoint>(departurePresets[0].point);
  const [originLabel, setOriginLabel] = useState(departurePresets[0].name);
  const [privateOrigin, setPrivateOrigin] = useState(false);
  const [routeNotice, setRouteNotice] = useState<RouteNotice>(initialNotice);

  const updateOrigin = useCallback((point: RoutePoint, label: string, isPrivate = false) => {
    setOrigin(point);
    setOriginLabel(label);
    setPrivateOrigin(isPrivate);
    onPrivateOrigin?.();
    if (isPrivate) {
      setRouteNotice({ ko: "현재 위치를 표시했습니다. W.A.V.E 경로 API로 좌표를 보내거나 저장하지 않습니다. 지도 제공처에는 화면 영역·접속 정보가 전달될 수 있습니다.", en: "Your location is displayed. Coordinates are not sent to or stored by the W.A.V.E route service. Map providers may receive the visible map area and connection information." });
    }
  }, [onPrivateOrigin]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setRouteNotice({ ko: "이 브라우저는 현재 위치를 지원하지 않습니다. 출발 거점을 선택해 주세요.", en: "Location is unavailable in this browser. Choose a public departure point." });
      return;
    }
    if (!confirmMapLocationUse(locale)) return;
    setRouteNotice({ ko: "현재 위치 권한을 확인하고 있습니다.", en: "Waiting for location permission." });
    const generation = ++locationGeneration.current;
    navigator.geolocation.getCurrentPosition((position) => {
      if (generation !== locationGeneration.current) return;
      updateOrigin({ lat: position.coords.latitude, lng: position.coords.longitude }, "현재 위치", true);
    }, () => {
      if (generation !== locationGeneration.current) return;
      setRouteNotice({ ko: "현재 위치를 확인하지 못했습니다. 출발 거점을 선택해 주세요.", en: "Your location could not be obtained. Choose a public departure point." });
    }, {
      enableHighAccuracy: false,
      timeout: 8000,
    });
  }, [locale, updateOrigin]);

  const resetOrigin = useCallback(() => {
    locationGeneration.current++; setOrigin(departurePresets[0].point);
    setOriginLabel(departurePresets[0].name); setPrivateOrigin(false);
    setRouteNotice(initialNotice);
  }, []);

  return {
    resetOrigin,
    origin,
    originLabel,
    privateOrigin,
    routeNotice,
    setRouteNotice,
    updateOrigin,
    requestCurrentLocation,
  };
}
