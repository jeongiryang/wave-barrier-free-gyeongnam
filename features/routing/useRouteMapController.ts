"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { exportRouteImage } from "./export-route-image";
import type { KakaoDrawingManager, KakaoMap } from "./kakao-sdk";
import { describeCrowd } from "./map-utils";
import type { MapPickMode, MapPlace, MapProvider, MapToolPanel, RouteMapProps } from "./types";
import { useMapDrawingTools } from "./useMapDrawingTools";
import { useMapLayers } from "./useMapLayers";
import { useMapRenderer } from "./useMapRenderer";
import { useNearbyPlaces } from "./useNearbyPlaces";
import { useRoadviewController } from "./useRoadviewController";

export function useRouteMapController({ origin, places, route, crowd, crowdPlaceId, onOriginChange, onDestinationChange }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const drawingManagerRef = useRef<KakaoDrawingManager | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const pickModeRef = useRef<MapPickMode>(null);
  const onOriginChangeRef = useRef(onOriginChange);
  const onDestinationChangeRef = useRef(onDestinationChange);

  const [provider, setProvider] = useState<MapProvider>("loading");
  const [providerDetail, setProviderDetail] = useState("카카오 지도를 연결하고 있습니다.");
  const [retryNonce, setRetryNonce] = useState(0);
  const [toolPanel, setToolPanel] = useState<MapToolPanel>(null);
  const [expanded, setExpanded] = useState(false);
  const [pickMode, setPickMode] = useState<MapPickMode>(null);
  const [selectedMapPlace, setSelectedMapPlace] = useState<MapPlace | null>(places[0] || null);

  const crowdVisual = useMemo(() => crowd && Number.isFinite(crowd.rate) ? describeCrowd(crowd.rate) : null, [crowd]);
  const crowdPlace = useMemo(() => crowdVisual ? (places.find((place) => place.id === crowdPlaceId) || places.find((place) => place.name === crowd?.place) || places[0]) : undefined, [crowd?.place, crowdPlaceId, crowdVisual, places]);

  useEffect(() => { pickModeRef.current = pickMode; }, [pickMode]);
  useEffect(() => { onOriginChangeRef.current = onOriginChange; }, [onOriginChange]);
  useEffect(() => { onDestinationChangeRef.current = onDestinationChange; }, [onDestinationChange]);

  function moveToCurrentLocation() {
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
    }, () => setProviderDetail("위치 권한을 허용하면 현재 위치로 이동할 수 있습니다."), { enableHighAccuracy: false, timeout: 7000 });
  }

  const choosePlace = useCallback((place: MapPlace) => {
    setSelectedMapPlace(place);
    setToolPanel("place");
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    const lat = Number(place.mapY);
    const lng = Number(place.mapX);
    if (map && sdk && Number.isFinite(lat) && Number.isFinite(lng)) map.panTo(new sdk.LatLng(lat, lng));
  }, []);

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
    setPickMode(mode);
    setToolPanel("route");
    setProviderDetail(mode === "origin" ? "지도에서 새 출발지를 클릭하세요." : "지도에서 새 목적지를 클릭하세요.");
  }

  function saveRoute() {
    try {
      window.localStorage.setItem("wave-saved-map", JSON.stringify({
        places: places.slice(0, 12).map((place, order) => ({ id: place.id, name: place.name, order })),
        route: route ? { id: route.id, label: route.label, provider: route.provider, totalTime: route.totalTime, totalDistance: route.totalDistance } : null,
        savedAt: new Date().toISOString(),
      }));
      setProviderDetail("현재 여행 경로를 이 기기에 저장했습니다.");
    } catch {
      setProviderDetail("브라우저 저장 공간을 사용할 수 없습니다.");
    }
  }

  async function shareRoute() {
    const data = { title: "W.A.V.E 여행 경로", text: places.map((place) => place.name).join(" → ") || "경남 무장애 여행 경로", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        setProviderDetail("현재 주소를 복사했습니다.");
      }
    } catch { /* share sheet dismissed */ }
  }

  async function toggleExpanded() {
    const shell = shellRef.current;
    if (!shell) return;
    if (expanded && !document.fullscreenElement) {
      setExpanded(false);
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      setExpanded((value) => !value);
    }
  }

  useEffect(() => {
    const onFullscreen = () => setExpanded(document.fullscreenElement === shellRef.current);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pickModeRef.current) setPickMode(null);
      if (roadviewSelectModeRef.current) setRoadviewSelectMode(false);
      if (expanded) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, roadviewSelectModeRef, setRoadviewSelectMode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      kakaoMapRef.current?.relayout();
      mapRef.current?.invalidateSize();
    }, 260);
    return () => window.clearTimeout(timeoutId);
  }, [toolPanel, expanded, categoryPlaces.length]);

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
    setProvider,
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
      onOriginChange?.({ lat: Number(place.mapY), lng: Number(place.mapX) }, place.name);
      setProviderDetail(`${place.name}을 출발지로 설정했습니다.`);
    },
    setPlaceAsDestination: (place: MapPlace) => {
      onDestinationChange?.(place);
      setProviderDetail(`${place.name}을 목적지로 설정했습니다.`);
    },
    toggleLayer,
    selectMeasure,
    clearMeasurements,
    saveRoute,
    exportRoute: (format: "png" | "jpeg") => {
      if (exportRouteImage({ origin, places, route, format })) setProviderDetail(`${format === "png" ? "PNG" : "JPG"} 경로 지도를 저장했습니다.`);
    },
    closeRoadview,
  };
}
