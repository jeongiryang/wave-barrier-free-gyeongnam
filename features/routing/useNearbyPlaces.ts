"use client";

import { useCallback, useRef, useState } from "react";
import { nearbyCategories } from "./constants";
import type { KakaoMap, KakaoMarker, KakaoPlace } from "./kakao-sdk";
import type { MutableRef } from "./map-renderer-context";
import type { MapPlace } from "./types";

interface NearbyPlacesOptions {
  kakaoMapRef: MutableRef<KakaoMap | null>;
  choosePlace: (place: MapPlace) => void;
}

export function useNearbyPlaces({ kakaoMapRef, choosePlace }: NearbyPlacesOptions) {
  const categoryMarkersRef = useRef<KakaoMarker[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryPlaces, setCategoryPlaces] = useState<KakaoPlace[]>([]);
  const [categoryMessage, setCategoryMessage] = useState("");

  const clearCategoryMarkers = useCallback(() => {
    categoryMarkersRef.current.forEach((marker) => marker.setMap(null));
    categoryMarkersRef.current = [];
  }, []);

  function searchNearby(category: (typeof nearbyCategories)[number]) {
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk?.services) return;
    if (activeCategory === category.id) {
      clearCategoryMarkers();
      setActiveCategory(null);
      setCategoryPlaces([]);
      setCategoryMessage("");
      return;
    }
    clearCategoryMarkers();
    setActiveCategory(category.id);
    setCategoryPlaces([]);
    setCategoryMessage(`${category.label} 검색 중`);
    const service = new sdk.services.Places(map);
    const callback = (result: KakaoPlace[], status: string) => {
      if (status !== sdk.services!.Status.OK) {
        setCategoryMessage("현재 지도 범위에서 결과를 찾지 못했습니다.");
        return;
      }
      const valid = result.filter((item) => Number.isFinite(Number(item.y)) && Number.isFinite(Number(item.x)));
      categoryMarkersRef.current = valid.map((item) => new sdk.Marker({
        map,
        position: new sdk.LatLng(Number(item.y), Number(item.x)),
        title: item.place_name,
      }));
      setCategoryPlaces(valid);
      setCategoryMessage(`${valid.length}곳을 거리순으로 표시했습니다.`);
    };
    const options = {
      location: map.getCenter(),
      radius: 10000,
      size: 15,
      sort: sdk.services.SortBy.DISTANCE,
    };
    if ("code" in category) service.categorySearch(category.code, callback, options);
    else service.keywordSearch(category.keyword, callback, options);
  }

  function chooseKakaoPlace(place: KakaoPlace) {
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

  return {
    activeCategory,
    categoryPlaces,
    categoryMessage,
    clearCategoryMarkers,
    searchNearby,
    chooseKakaoPlace,
  };
}
