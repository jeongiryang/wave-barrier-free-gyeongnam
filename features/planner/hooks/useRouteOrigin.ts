"use client";

import { useCallback, useState } from "react";
import type { RoutePoint } from "../../routing/types";
import { departurePresets } from "../constants";

export function useRouteOrigin(onPrivateOrigin?: () => void) {
  const [origin, setOrigin] = useState<RoutePoint>(departurePresets[0].point);
  const [originLabel, setOriginLabel] = useState(departurePresets[0].name);
  const [privateOrigin, setPrivateOrigin] = useState(false);
  const [routeNotice, setRouteNotice] = useState("여행지를 찾으면 출발지부터의 이동 경로를 비교합니다.");

  const updateOrigin = useCallback((point: RoutePoint, label: string, isPrivate = false) => {
    setOrigin(point);
    setOriginLabel(label);
    setPrivateOrigin(isPrivate);
    if (isPrivate) {
      onPrivateOrigin?.();
      setRouteNotice("현재 위치를 지도에 표시했습니다. 좌표는 서버나 저장소로 전송하지 않습니다.");
    }
  }, [onPrivateOrigin]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setRouteNotice("이 브라우저는 현재 위치를 지원하지 않습니다.");
      return;
    }
    setRouteNotice("현재 위치 권한을 확인하고 있습니다.");
    navigator.geolocation.getCurrentPosition((position) => {
      updateOrigin({ lat: position.coords.latitude, lng: position.coords.longitude }, "현재 위치", true);
    }, () => setRouteNotice("위치 권한이 없어 출발 거점을 선택해 주세요."), {
      enableHighAccuracy: true,
      timeout: 8000,
    });
  }, [updateOrigin]);

  return {
    origin,
    originLabel,
    privateOrigin,
    routeNotice,
    setRouteNotice,
    updateOrigin,
    requestCurrentLocation,
  };
}
