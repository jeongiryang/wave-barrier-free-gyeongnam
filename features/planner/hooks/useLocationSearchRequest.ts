"use client";

import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { plannerJson } from "../services/api";
import type { Place, SearchPlace } from "../types";
import { parseLocationResults } from "../location-results";

export function useLocationSearchRequest(region: string, scope: "all" | "gyeongnam" = "all") {
  const [placeQuery, updatePlaceQuery] = useState("");
  const [placeSearchResults, setPlaceSearchResults] = useState<SearchPlace[]>([]);
  const [placeSearchState, setPlaceSearchState] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
  const searchRequestRef = useRef<AbortController | null>(null);

  const setPlaceQuery = useCallback((query: string) => {
    searchRequestRef.current?.abort();
    searchRequestRef.current = null;
    updatePlaceQuery(query);
    setPlaceSearchResults([]);
    setPlaceSearchState("idle");
  }, []);

  const searchLocations = useCallback(async () => {
    if (placeQuery.trim().length < 2 || searchRequestRef.current) return;
    const controller = new AbortController();
    searchRequestRef.current = controller;
    setPlaceSearchResults([]);
    setPlaceSearchState("loading");
    try {
      const data = await plannerJson<unknown>(`/api/location-search?q=${encodeURIComponent(placeQuery.trim())}${scope === "gyeongnam" ? "&scope=gyeongnam" : ""}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.location });
      if (controller.signal.aborted || searchRequestRef.current !== controller) return;
      const places = parseLocationResults(data);
      setPlaceSearchResults(places);
      setPlaceSearchState(places.length ? "success" : "empty");
    } catch {
      if (!controller.signal.aborted && searchRequestRef.current === controller) {
        setPlaceSearchResults([]);
        setPlaceSearchState("error");
      }
    } finally {
      if (searchRequestRef.current === controller) {
        searchRequestRef.current = null;
      }
    }
  }, [placeQuery, scope]);

  const clearSearchRequest = useCallback(() => {
    searchRequestRef.current?.abort();
    searchRequestRef.current = null;
    updatePlaceQuery("");
    setPlaceSearchResults([]);
    setPlaceSearchState("idle");
  }, []);

  const searchableToPlace = useCallback((item: SearchPlace): Place => ({
    id: item.id || `${item.name}-${item.mapX}`,
    contentTypeId: "12",
    city: item.region || region,
    name: item.name,
    address: item.address,
    summary: item.summary || item.category || "직접 검색한 장소",
    image: "",
    mapX: item.mapX,
    mapY: item.mapY,
    score: null,
    features: [],
    details: ["카카오 장소 검색 결과", "운영시간·이동·편의정보는 방문 전에 확인해 주세요"],
    source: "사용자 장소 검색",
  }), [region]);

  useEffect(() => () => searchRequestRef.current?.abort(), []);
  return { placeQuery, setPlaceQuery, placeSearchResults, placeSearchState, placeSearchLoading: placeSearchState === "loading", searchLocations, clearSearchRequest, searchableToPlace };
}
