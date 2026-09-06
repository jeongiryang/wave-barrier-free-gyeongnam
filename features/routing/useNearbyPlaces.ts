"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nearbyCategories } from "./constants";
import type { KakaoMap, KakaoMarker, KakaoPlace } from "./kakao-sdk";
import type { MutableRef } from "./map-renderer-context";
import type { MapPlace } from "./types";
import { useSitePreferences } from "../../components/SitePreferences";
import { NEARBY_RADIUS_METRES, nearbyCategoryLabel, parseNearbyPlaces, type NearbySearchArea } from "./nearby-place-data";

interface NearbyPlacesOptions {
  kakaoMapRef: MutableRef<KakaoMap | null>;
  choosePlace: (place: MapPlace) => void;
}

export function useNearbyPlaces({ kakaoMapRef, choosePlace }: NearbyPlacesOptions) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const categoryMarkersRef = useRef<KakaoMarker[]>([]);
  const generation = useRef(0);
  const timeout = useRef<number | null>(null);
  const pending = useRef(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [result, setResult] = useState<{ state: "idle" | "loading" | "success" | "empty" | "error"; places: KakaoPlace[]; omitted: number }>({ state: "idle", places: [], omitted: 0 });

  const clearCategoryMarkers = useCallback(() => {
    generation.current++;
    pending.current = false;
    if (timeout.current !== null) window.clearTimeout(timeout.current);
    timeout.current = null;
    categoryMarkersRef.current.forEach((marker) => { try { marker.setMap(null); } catch { /* A destroyed map may already have detached its markers. */ } });
    categoryMarkersRef.current = [];
  }, []);
  const cancelNearby = useCallback(() => {
    clearCategoryMarkers();
    setActiveCategory(null);
    setResult({ state: "idle", places: [], omitted: 0 });
  }, [clearCategoryMarkers]);
  useEffect(() => clearCategoryMarkers, [clearCategoryMarkers]);

  function searchNearby(category: (typeof nearbyCategories)[number], retry = false) {
    if (retry && pending.current) return;
    if (!retry && activeCategory === category.id) { cancelNearby(); return; }
    clearCategoryMarkers();
    setActiveCategory(category.id);
    setResult({ state: "loading", places: [], omitted: 0 });
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk?.services) { setResult({ state: "error", places: [], omitted: 0 }); return; }
    const id = generation.current;
    pending.current = true;
    let settled = false;
    const current = () => !settled && generation.current === id && kakaoMapRef.current === map;
    const finish = (next: typeof result) => {
      if (!current()) return;
      settled = true;
      pending.current = false;
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      timeout.current = null;
      setResult(next);
    };
    const fail = () => finish({ state: "error", places: [], omitted: 0 });
    timeout.current = window.setTimeout(fail, 10_000);
    let searchArea: NearbySearchArea | null = null;
    const callback = (value: unknown, status: string) => {
      if (!current()) return;
      if (status === sdk.services!.Status.ZERO_RESULT) { finish({ state: "empty", places: [], omitted: 0 }); return; }
      if (status !== sdk.services!.Status.OK) { fail(); return; }
      const parsed = searchArea ? parseNearbyPlaces(value, searchArea) : null;
      if (!parsed || (!parsed.places.length && parsed.omitted)) { fail(); return; }
      const markers: KakaoMarker[] = [];
      try {
        for (const item of parsed.places) markers.push(new sdk.Marker({ map, position: new sdk.LatLng(Number(item.y), Number(item.x)), title: item.place_name }));
        categoryMarkersRef.current = markers;
        finish({ state: parsed.places.length ? "success" : "empty", ...parsed });
      } catch {
        markers.forEach((marker) => { try { marker.setMap(null); } catch { /* Already detached. */ } });
        fail();
      }
    };
    try {
      const location = map.getCenter();
      searchArea = { lat: location.getLat(), lng: location.getLng(), radius: NEARBY_RADIUS_METRES };
      const service = new sdk.services.Places(map);
      const options = { location, radius: NEARBY_RADIUS_METRES, size: 15, sort: sdk.services.SortBy.DISTANCE };
      if ("code" in category) service.categorySearch(category.code, callback, options);
      else service.keywordSearch(category.keyword, callback, options);
    } catch { fail(); }
  }

  function chooseKakaoPlace(place: KakaoPlace) {
    if (!result.places.some((item) => item.id === place.id)) return;
    cancelNearby();
    choosePlace({
      id: place.id,
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      placeUrl: place.place_url?.replace(/^http:\/\//i, "https://"),
      mapX: place.x,
      mapY: place.y,
      score: null,
    });
  }
  const category = nearbyCategories.find((item) => item.id === activeCategory);
  const label = category ? nearbyCategoryLabel(category, english) : (english ? "Places" : "주변 장소");
  const categoryMessage = result.state === "loading" ? (english ? `Searching for ${label.toLowerCase()}…` : `${label} 검색 중`)
    : result.state === "error" ? (english ? "Places could not be loaded. Please try again." : "주변 장소를 불러오지 못했습니다. 다시 시도해 주세요.")
    : result.state === "empty" ? (english ? "No places were found within 10 km of the search centre. Try another category or move the map and search again." : "검색 중심 반경 10km에서 결과를 찾지 못했습니다. 다른 분류를 선택하거나 지도를 옮겨 다시 검색해 주세요.")
    : result.state === "success" ? (english ? `${result.places.length} places shown by distance.${result.omitted ? " Some incomplete results could not be displayed." : ""}` : `${result.places.length}곳을 거리순으로 표시했습니다.${result.omitted ? " 확인할 수 없는 일부 장소는 제외했습니다." : ""}`) : "";

  return {
    activeCategory,
    categoryPlaces: result.places,
    categoryState: result.state,
    categoryMessage,
    clearCategoryMarkers,
    cancelNearby,
    retryNearby: () => { if (category) searchNearby(category, true); },
    searchNearby,
    chooseKakaoPlace,
  };
}
