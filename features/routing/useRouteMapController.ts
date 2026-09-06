"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { KakaoDrawingManager, KakaoMap } from "./kakao-sdk";
import { describeCrowd } from "./map-utils";
import type { MapPickMode, MapPlace, MapProvider, MapToolPanel, RouteMapProps } from "./types";
import { useMapDrawingTools } from "./useMapDrawingTools";
import { useMapLayers } from "./useMapLayers";
import { useMapJourneyActions } from "./useMapJourneyActions";
import { useMapRenderer } from "./useMapRenderer";
import { useMapShell } from "./useMapShell";
import { useNearbyPlaces } from "./useNearbyPlaces";
import { useRoadviewController } from "./useRoadviewController";

export function useRouteMapController({ origin, places, route, crowd, crowdPlaceId, onOriginChange, onDestinationChange, onSavePlaces }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const drawingManagerRef = useRef<KakaoDrawingManager | null>(null);
  const pickModeRef = useRef<MapPickMode>(null);
  const onOriginChangeRef = useRef(onOriginChange);
  const onDestinationChangeRef = useRef(onDestinationChange);

  const [provider, setProvider] = useState<MapProvider>("loading");
  const providerRef = useRef<MapProvider>("loading");
  const isMapAvailable = useCallback(() => providerRef.current !== "error", []);
  const [providerDetail, setProviderDetail] = useState("카카오 지도를 연결하고 있습니다.");
  const [retryNonce, setRetryNonce] = useState(0);
  const [toolPanel, setToolPanel] = useState<MapToolPanel>(null);
  const [pickMode, setPickMode] = useState<MapPickMode>(null);
  const [selectedMapPlace, setSelectedMapPlace] = useState<MapPlace | null>(places[0] || null);

  const crowdVisual = useMemo(() => crowd && Number.isFinite(crowd.rate) ? describeCrowd(crowd.rate) : null, [crowd]);
  const crowdPlace = useMemo(() => crowdVisual ? (places.find((place) => place.id === crowdPlaceId) || places.find((place) => place.name === crowd?.place) || places[0]) : undefined, [crowd?.place, crowdPlaceId, crowdVisual, places]);

  useEffect(() => { pickModeRef.current = pickMode; }, [pickMode]);
  useEffect(() => { onOriginChangeRef.current = (point, label) => { if (isMapAvailable()) onOriginChange?.(point, label); }; }, [isMapAvailable, onOriginChange]);
  useEffect(() => { onDestinationChangeRef.current = (place) => { if (isMapAvailable()) onDestinationChange?.(place); }; }, [isMapAvailable, onDestinationChange]);

  const choosePlace = useCallback((place: MapPlace) => {
    if (!isMapAvailable()) return;
    setSelectedMapPlace(place);
    setToolPanel("place");
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    const lat = Number(place.mapY);
    const lng = Number(place.mapX);
    if (map && sdk && Number.isFinite(lat) && Number.isFinite(lng)) map.panTo(new sdk.LatLng(lat, lng));
  }, [isMapAvailable]);

  const { baseMap, activeLayers, changeBaseMap, toggleLayer } = useMapLayers(kakaoMapRef);
  const {
    activeCategory,
    categoryPlaces,
    categoryMessage,
    clearCategoryMarkers,
    searchNearby,
    chooseKakaoPlace,
  } = useNearbyPlaces({ kakaoMapRef, choosePlace });
  const {
    measureMode,
    measureSummary,
    setMeasureSummary,
    selectMeasure,
    clearMeasurements,
  } = useMapDrawingTools({ drawingManagerRef, setProviderDetail });
  const {
    roadviewRef,
    roadviewSelectModeRef,
    roadviewOpen,
    roadviewMessage,
    roadviewSelectMode,
    roadviewPreviewOpen,
    setRoadviewSelectMode,
    setRoadviewPreviewOpen,
    openRoadviewAt,
    beginRoadviewSelection,
    cancelRoadviewSelection,
    closeRoadview,
  } = useRoadviewController({ provider, setProviderDetail, setPickMode, setToolPanel });

  function setMapPointMode(mode: "origin" | "destination") {
    if (!isMapAvailable()) return;
    setPickMode(mode);
    setToolPanel("route");
    setProviderDetail(mode === "origin" ? "지도에서 새 출발지를 클릭하세요." : "지도에서 새 목적지를 클릭하세요.");
  }

  const { moveToCurrentLocation, saveRoute, shareRoute, exportRoute } = useMapJourneyActions({
    origin, places, route, onOriginChange, onSavePlaces, kakaoMapRef, setPickMode, setProviderDetail, isMapAvailable,
  });
  const { shellRef, expanded, toggleExpanded } = useMapShell({
    kakaoMapRef,
    mapRef,
    pickModeRef,
    roadviewSelectModeRef,
    setPickMode,
    setRoadviewSelectMode,
    layoutKey: `${toolPanel || "closed"}:${categoryPlaces.length}`,
  });

  const updateProvider = useCallback((next: MapProvider) => {
    providerRef.current = next;
    if (next === "error") {
      const focused = document.activeElement;
      const affectedFocus = focused instanceof HTMLElement && shellRef.current?.contains(focused)
        && Boolean(focused.closest(".map-tool-panel:not(#map-panel-export),.map-roadview-panel,.roadview-pick-banner"));
      pickModeRef.current = null;
      roadviewSelectModeRef.current = false;
      setPickMode(null);
      setRoadviewSelectMode(false);
      setRoadviewPreviewOpen(false);
      closeRoadview();
      setToolPanel((current) => current === "export" ? current : null);
      mapRef.current?.remove();
      mapRef.current = null;
      kakaoMapRef.current = null;
      drawingManagerRef.current = null;
      clearCategoryMarkers();
      if (affectedFocus) window.requestAnimationFrame(() => {
        if (document.activeElement === focused || document.activeElement === document.body) {
          shellRef.current?.querySelector<HTMLButtonElement>(".map-unavailable button")?.focus();
        }
      });
    }
    setProvider(next);
  }, [clearCategoryMarkers, closeRoadview, roadviewSelectModeRef, setRoadviewPreviewOpen, setRoadviewSelectMode, shellRef]);

  useMapRenderer({
    containerRef,
    mapRef,
    kakaoMapRef,
    drawingManagerRef,
    origin,
    places,
    route,
    retryNonce,
    crowdVisual,
    crowdPlace,
    pickModeRef,
    roadviewSelectModeRef,
    onOriginChangeRef,
    onDestinationChangeRef,
    openRoadviewAt,
    choosePlace,
    clearCategoryMarkers,
    setProvider: updateProvider,
    setProviderDetail,
    setSelectedMapPlace,
    setPickMode,
    setRoadviewSelectMode,
    setMeasureSummary,
  });

  return {
    containerRef,
    roadviewRef,
    shellRef,
    provider,
    providerDetail,
    baseMap,
    activeLayers,
    toolPanel,
    expanded,
    pickMode,
    selectedMapPlace,
    activeCategory,
    categoryPlaces,
    categoryMessage,
    roadviewOpen,
    roadviewMessage,
    roadviewSelectMode,
    roadviewPreviewOpen,
    measureMode,
    measureSummary,
    crowdVisual,
    crowdPlace,
    retryProvider: () => setRetryNonce((value) => value + 1),
    changeBaseMap,
    setToolPanel,
    beginRoadviewSelection,
    setRoadviewPreviewOpen,
    moveToCurrentLocation,
    shareRoute,
    toggleExpanded,
    cancelRoadviewSelection,
    searchNearby,
    chooseKakaoPlace,
    closeRoutePanel: () => {
      setToolPanel(null);
      setPickMode(null);
    },
    setMapPointMode,
    setPlaceAsOrigin: (place: MapPlace) => {
      if (!isMapAvailable()) return;
      onOriginChange?.({ lat: Number(place.mapY), lng: Number(place.mapX) }, place.name);
      setProviderDetail(`${place.name}을 출발지로 설정했습니다.`);
    },
    setPlaceAsDestination: (place: MapPlace) => {
      if (!isMapAvailable()) return;
      onDestinationChange?.(place);
      setProviderDetail(`${place.name}을 목적지로 설정했습니다.`);
    },
    toggleLayer,
    selectMeasure,
    clearMeasurements,
    saveRoute,
    exportRoute,
    closeRoadview,
  };
}
