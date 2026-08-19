"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { optionalPlannerJson } from "../services/api";
import type { Place, SearchPlace } from "../types";

export function useLocationSearchRequest(region: string) {
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSearchResults, setPlaceSearchResults] = useState<SearchPlace[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const searchRequestRef = useRef<AbortController | null>(null);

  const searchLocations = useCallback(async () => {
    if (placeQuery.trim().length < 2) return;
    searchRequestRef.current?.abort();
    const controller = new AbortController();
    searchRequestRef.current = controller;
    setPlaceSearchLoading(true);
    try {
      const data = await optionalPlannerJson<{ places?: SearchPlace[] }>(`/api/location-search?q=${encodeURIComponent(placeQuery.trim())}`, { signal: controller.signal });
      if (controller.signal.aborted || searchRequestRef.current !== controller) return;
      setPlaceSearchResults(data?.places || []);
    } catch {
      if (!controller.signal.aborted && searchRequestRef.current === controller) setPlaceSearchResults([]);
    } finally {
      if (searchRequestRef.current === controller) {
        searchRequestRef.current = null;
        setPlaceSearchLoading(false);
      }
    }
  }, [placeQuery]);

  const clearSearchRequest = useCallback(() => {
    searchRequestRef.current?.abort();
    searchRequestRef.current = null;
    setPlaceQuery("");
    setPlaceSearchResults([]);
    setPlaceSearchLoading(false);
  }, []);

  const searchableToPlace = useCallback((item: SearchPlace): Place => ({
    id: item.id || `${item.name}-${item.mapX}`,
    contentTypeId: "12",
    city: region,
    name: item.name,
    address: item.address,
    summary: item.category || "사용자가 직접 검색한 장소입니다.",
    image: "",
    mapX: item.mapX,
    mapY: item.mapY,
    score: null,
    features: [],
    details: ["카카오 장소 검색 결과를 기준으로 경로를 계산합니다."],
    source: "사용자 장소 검색",
  }), [region]);

  useEffect(() => () => searchRequestRef.current?.abort(), []);
  return { placeQuery, setPlaceQuery, placeSearchResults, placeSearchLoading, searchLocations, clearSearchRequest, searchableToPlace };
}
