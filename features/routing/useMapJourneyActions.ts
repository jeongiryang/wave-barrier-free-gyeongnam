"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { exportRouteImage } from "./export-route-image";
import { confirmMapLocationUse } from "../../lib/location-consent.js";
import type { KakaoMap } from "./kakao-sdk";
import type { MapPickMode, RouteMapProps } from "./types";
import { useSitePreferences } from "../../components/SitePreferences";

const actionCopy = {
  "image-pending": ["이미지를 준비하고 있습니다.", "Preparing the image."],
  "image-started": ["이미지 다운로드를 시작했습니다. 브라우저의 다운로드 목록을 확인하세요.", "The image download has started. Check your browser downloads."],
  "image-error": ["이미지를 만들지 못했습니다. 다시 시도하거나 일정의 텍스트 정보를 확인하세요.", "The image could not be created. Try again or use the itinerary text."],
  "share-pending": ["페이지 링크를 준비하고 있습니다.", "Preparing the page link."],
  "share-started": ["브라우저에서 페이지 링크 공유를 처리했습니다. 일정은 이 링크에 포함되지 않습니다.", "The browser handled the page link share. Your itinerary is not included."],
  copied: ["페이지 주소를 복사했습니다. 일정 공유는 내 일정의 공유 기능을 이용하세요.", "The page link was copied. Use itinerary sharing to share your saved trip."],
  cancelled: ["페이지 링크 공유를 취소했습니다.", "Page link sharing was cancelled."],
  "share-error": ["페이지 링크를 공유하지 못했습니다. 다시 시도하거나 브라우저 주소를 직접 복사하세요.", "The page link could not be shared. Try again or copy the browser address."],
} as const;

type JourneyActionOptions = Pick<RouteMapProps, "origin" | "places" | "route" | "onOriginChange" | "onSavePlaces"> & {
  kakaoMapRef: RefObject<KakaoMap | null>;
  setPickMode: (mode: MapPickMode) => void;
  setProviderDetail: (message: string) => void;
  isMapAvailable?: () => boolean;
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
  isMapAvailable,
}: JourneyActionOptions) {
  const { locale } = useSitePreferences();
  const busy = useRef(false);
  const locationGeneration = useRef(0);
  const locationContext = `${origin.lat},${origin.lng}|${places.map(place => place.id).join("|")}`;
  useEffect(() => {
    return () => { locationGeneration.current++; };
  }, [locationContext]);
  const [actionStatus, setActionStatus] = useState<keyof typeof actionCopy | null>(null);
  const actionNotice = actionStatus ? actionCopy[actionStatus][locale === "en" ? 1 : 0] : "";
  const actionPending = actionStatus === "image-pending" || actionStatus === "share-pending";
  const moveToCurrentLocation = useCallback(() => {
    if (isMapAvailable && !isMapAvailable()) return;
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!navigator.geolocation) {
      setProviderDetail("현재 브라우저에서 위치 기능을 사용할 수 없습니다.");
      return;
    }
    if (!confirmMapLocationUse(locale)) return;
    const generation = ++locationGeneration.current;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (generation !== locationGeneration.current) return;
      if (isMapAvailable && !isMapAvailable()) return;
      if (map && sdk) {
        const position = new sdk.LatLng(coords.latitude, coords.longitude);
        map.panTo(position);
        map.setLevel(5);
        new sdk.Marker({ map, position, title: "내 위치" });
      }
      onOriginChange?.({ lat: coords.latitude, lng: coords.longitude }, "현재 위치");
      setPickMode(null);
      setProviderDetail("현재 위치로 지도를 이동했습니다.");
    }, () => { if (generation === locationGeneration.current && (!isMapAvailable || isMapAvailable())) setProviderDetail("위치 권한을 허용하면 현재 위치로 이동할 수 있습니다."); }, {
      enableHighAccuracy: false,
      timeout: 7000,
    });
  }, [isMapAvailable, kakaoMapRef, locale, onOriginChange, setPickMode, setProviderDetail]);

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
      ? `지도에 표시된 ${added}곳을 내 일정에 추가했어요.`
      : "지도에 표시된 여행지는 이미 내 일정에 있어요.");
  }, [onSavePlaces, places, setProviderDetail]);

  const shareRoute = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setActionStatus("share-pending");
    const data = {
      title: locale === "en" ? "WAVE travel planner" : "WAVE 여행 계획",
      text: locale === "en" ? "Open the travel planner. This link does not include a saved itinerary." : "여행 계획 페이지를 엽니다. 저장한 일정은 이 링크에 포함되지 않습니다.",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        setActionStatus("share-started");
      }
      else {
        await navigator.clipboard.writeText(data.url);
        setActionStatus("copied");
      }
    } catch (error) {
      setActionStatus(error instanceof Error && error.name === "AbortError" ? "cancelled" : "share-error");
    } finally { busy.current = false; }
  }, [locale]);

  const exportRoute = useCallback(async (format: "png" | "jpeg") => {
    if (busy.current) return;
    busy.current = true;
    setActionStatus("image-pending");
    try {
      setActionStatus(await exportRouteImage({ origin, places, route, format, locale }) ? "image-started" : "image-error");
    } catch { setActionStatus("image-error"); }
    finally { busy.current = false; }
  }, [origin, places, route, locale]);

  return { moveToCurrentLocation, saveRoute, shareRoute, exportRoute, actionNotice, actionPending };
}
