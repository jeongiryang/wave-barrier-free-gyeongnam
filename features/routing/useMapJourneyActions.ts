"use client";

import { useCallback, type RefObject } from "react";
import { exportRouteImage } from "./export-route-image";
import type { KakaoMap } from "./kakao-sdk";
import type { MapPickMode, RouteMapProps } from "./types";

type JourneyActionOptions = Pick<RouteMapProps, "origin" | "places" | "route" | "onOriginChange" | "onSavePlaces"> & {
  kakaoMapRef: RefObject<KakaoMap | null>;
  setPickMode: (mode: MapPickMode) => void;
  setProviderDetail: (message: string) => void;
};

export function useMapJourneyActions({
  origin,
  places,
  route,
  onOriginChange,
  onSavePlaces,
  kakaoMapRef,
  setPickMode,
  setProviderDetail,
}: JourneyActionOptions) {
  const moveToCurrentLocation = useCallback(() => {
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!navigator.geolocation) {
      setProviderDetail("현재 브라우저에서 위치 기능을 사용할 수 없습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (map && sdk) {
        const position = new sdk.LatLng(coords.latitude, coords.longitude);
        map.panTo(position);
        map.setLevel(5);
        new sdk.Marker({ map, position, title: "내 위치" });
      }
      onOriginChange?.({ lat: coords.latitude, lng: coords.longitude }, "현재 위치");
      setPickMode(null);
      setProviderDetail("현재 위치로 지도를 이동했습니다.");
    }, () => setProviderDetail("위치 권한을 허용하면 현재 위치로 이동할 수 있습니다."), {
      enableHighAccuracy: false,
      timeout: 7000,
    });
  }, [kakaoMapRef, onOriginChange, setPickMode, setProviderDetail]);

  // 예전에는 아무도 읽지 않는 저장소 키에 써 놓고 "저장했습니다"라고만 알렸다.
  // 현재 지도에 노출한 장소만 내 일정으로 넘기며, 위치 좌표 자체는 저장하지 않는다.
  const saveRoute = useCallback(() => {
    if (!places.length) {
      setProviderDetail("지도에 담을 여행지가 아직 없습니다.");
      return;
    }
    const visiblePlaces = places.slice(0, 12);
    const added = onSavePlaces?.(visiblePlaces) ?? 0;
    setProviderDetail(added > 0
      ? `지도에 표시된 ${added}곳을 내 일정에 추가했습니다.`
      : "지도에 표시된 여행지는 이미 내 일정에 있습니다.");
  }, [onSavePlaces, places, setProviderDetail]);

  const shareRoute = useCallback(async () => {
    const data = {
      title: "W.A.V.E 여행 경로",
      text: places.map((place) => place.name).join(" → ") || "경남 무장애 여행 경로",
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        setProviderDetail("현재 주소를 복사했습니다.");
      }
    } catch { /* share sheet dismissed */ }
  }, [places, setProviderDetail]);

  const exportRoute = useCallback((format: "png" | "jpeg") => {
    if (exportRouteImage({ origin, places, route, format })) {
      setProviderDetail(`${format === "png" ? "PNG" : "JPG"} 경로 지도를 저장했습니다.`);
    }
  }, [origin, places, route, setProviderDetail]);

  return { moveToCurrentLocation, saveRoute, shareRoute, exportRoute };
}
