"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoutePoint } from "../../routing/types";
import { departurePresets } from "../constants";
import { localDistanceKilometres } from "../../../lib/device-location.js";
import { confirmMapLocationUse } from "../../../lib/location-consent.js";
import type { RouteNotice } from "../route-copy";
import { useSitePreferences } from "../../../components/SitePreferences";

const initialNotice: RouteNotice = { ko: "여행지를 찾으면 출발지부터의 이동 경로를 비교합니다.", en: "Find a place to compare routes from your departure point." };

export function useRouteOrigin(onPrivateOrigin?: () => void) {
  const locationGeneration = useRef(0);
  const { locale } = useSitePreferences();
  useEffect(() => () => { locationGeneration.current++; }, []);
  const [origin, setOrigin] = useState<RoutePoint>(departurePresets[0].point);
  const [originLabel, setOriginLabel] = useState(departurePresets[0].name);
  const [privateOrigin, setPrivateOrigin] = useState(false);
  const [routeNotice, setRouteNotice] = useState<RouteNotice>(initialNotice);

  const updateOrigin = useCallback((point: RoutePoint, label: string, isPrivate = false) => {
    locationGeneration.current++;
    // Reject private coordinates at the shared-state boundary, including legacy callers.
    if (isPrivate) {
      setRouteNotice({ ko: "현재 위치는 기기 안에서만 확인합니다. 지도와 경로에는 직접 선택한 공개 출발지를 사용해 주세요.", en: "Current location stays on this device. Choose a public departure for maps and routes." });
      return;
    }
    setOrigin(point);
    setOriginLabel(label);
    setPrivateOrigin(isPrivate);
    onPrivateOrigin?.();
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
      const distance = localDistanceKilometres(position.coords, origin);
      setRouteNotice({ ko: distance === null ? '위치를 확인하지 못했어요.' : `선택한 출발지까지 직선거리 약 ${distance}km입니다. 이 기기에서만 계산했으며 지도·검색·경로·저장에는 현재 위치를 사용하지 않습니다.`, en: distance === null ? 'Location could not be checked.' : `About ${distance} km in a straight line to the selected departure. Calculated on this device only; current location is not used by maps, searches, routes or storage.` });
    }, () => {
      if (generation !== locationGeneration.current) return;
      setRouteNotice({ ko: "현재 위치를 확인하지 못했습니다. 출발 거점을 선택해 주세요.", en: "Your location could not be obtained. Choose a public departure point." });
    }, {
      enableHighAccuracy: false,
      timeout: 8000,
    });
  }, [locale, origin]);

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
