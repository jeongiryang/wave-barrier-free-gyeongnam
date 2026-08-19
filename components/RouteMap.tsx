"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import MapCommandBar from "../features/routing/components/MapCommandBar";
import MapExportPanel from "../features/routing/components/MapExportPanel";
import MapLayerPanel from "../features/routing/components/MapLayerPanel";
import MapPlacePanel from "../features/routing/components/MapPlacePanel";
import { MapCanvasStatusOverlays, RoadviewSelectionOverlays } from "../features/routing/components/MapStatusOverlays";
import NearbyPlacesPanel from "../features/routing/components/NearbyPlacesPanel";
import RoutePointPanel from "../features/routing/components/RoutePointPanel";
import { nearbyCategories, overlayLayers } from "../features/routing/constants";
import { exportRouteImage } from "../features/routing/export-route-image";
import {
  type KakaoDrawingManager,
  type KakaoMap,
  type KakaoMarker,
  type KakaoPlace,
} from "../features/routing/kakao-sdk";
import { describeCrowd } from "../features/routing/map-utils";
import { useMapRenderer } from "../features/routing/useMapRenderer";
import type {
  CrowdSignal,
  MapPickMode,
  MapPlace,
  MapProvider,
  MapToolPanel,
  MeasurementMode,
  RouteAlternative,
  RoutePoint,
} from "../features/routing/types";

export default function RouteMap({ origin, places, route, crowd, crowdPlaceId, onOriginChange, onDestinationChange }: { origin: RoutePoint; places: MapPlace[]; route: RouteAlternative | null; crowd?: CrowdSignal | null; crowdPlaceId?: string; onOriginChange?: (point: RoutePoint, label: string) => void; onDestinationChange?: (place: MapPlace) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const drawingManagerRef = useRef<KakaoDrawingManager | null>(null);
  const categoryMarkersRef = useRef<KakaoMarker[]>([]);
  const [provider, setProvider] = useState<MapProvider>("loading");
  const [providerDetail, setProviderDetail] = useState("카카오 지도를 연결하고 있습니다.");
  const [retryNonce, setRetryNonce] = useState(0);
  const [baseMap, setBaseMap] = useState<"roadmap" | "skyview">("roadmap");
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const shellRef = useRef<HTMLDivElement>(null);
  const [toolPanel, setToolPanel] = useState<MapToolPanel>(null);
  const [expanded, setExpanded] = useState(false);
  const [pickMode, setPickMode] = useState<MapPickMode>(null);
  const pickModeRef = useRef<MapPickMode>(null);
  const onOriginChangeRef = useRef(onOriginChange);
  const onDestinationChangeRef = useRef(onDestinationChange);
  const [selectedMapPlace, setSelectedMapPlace] = useState<MapPlace | null>(places[0] || null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryPlaces, setCategoryPlaces] = useState<KakaoPlace[]>([]);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [roadviewOpen, setRoadviewOpen] = useState(false);
  const [roadviewMessage, setRoadviewMessage] = useState("");
  const [roadviewSelectMode, setRoadviewSelectMode] = useState(false);
  const roadviewSelectModeRef = useRef(false);
  const [roadviewPreviewOpen, setRoadviewPreviewOpen] = useState(false);
  const [measureMode, setMeasureMode] = useState<MeasurementMode | null>(null);
  const [measureSummary, setMeasureSummary] = useState("");
  const crowdVisual = useMemo(() => crowd && Number.isFinite(crowd.rate) ? describeCrowd(crowd.rate) : null, [crowd]);
  const crowdPlace = useMemo(() => crowdVisual ? (places.find((place) => place.id === crowdPlaceId) || places.find((place) => place.name === crowd?.place) || places[0]) : undefined, [crowd?.place, crowdPlaceId, crowdVisual, places]);

  useEffect(() => { pickModeRef.current = pickMode; }, [pickMode]);
  useEffect(() => { roadviewSelectModeRef.current = roadviewSelectMode; }, [roadviewSelectMode]);
  useEffect(() => { onOriginChangeRef.current = onOriginChange; }, [onOriginChange]);
  useEffect(() => { onDestinationChangeRef.current = onDestinationChange; }, [onDestinationChange]);

  const clearCategoryMarkers = useCallback(() => {
    categoryMarkersRef.current.forEach((marker) => marker.setMap(null));
    categoryMarkersRef.current = [];
  }, []);

  function changeBaseMap(next: "roadmap" | "skyview") {
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk) return;
    map.setMapTypeId(next === "skyview" ? sdk.MapTypeId.HYBRID : sdk.MapTypeId.ROADMAP);
    setBaseMap(next);
  }

  function toggleLayer(id: (typeof overlayLayers)[number]["id"]) {
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk) return;
    setActiveLayers((current) => {
      if (current.includes(id)) {
        map.removeOverlayMapTypeId(sdk.MapTypeId[id]);
        return current.filter((item) => item !== id);
      }
      map.addOverlayMapTypeId(sdk.MapTypeId[id]);
      return [...current, id];
    });
  }

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
      const markers = valid.map((item) => new sdk.Marker({ map, position: new sdk.LatLng(Number(item.y), Number(item.x)), title: item.place_name }));
      categoryMarkersRef.current = markers;
      setCategoryPlaces(valid);
      setCategoryMessage(`${valid.length}곳을 거리순으로 표시했습니다.`);
    };
    const options = { location: map.getCenter(), radius: 10000, size: 15, sort: sdk.services.SortBy.DISTANCE };
    if ("code" in category) service.categorySearch(category.code, callback, options);
    else service.keywordSearch(category.keyword, callback, options);
  }

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
    const lat = Number(place.mapY); const lng = Number(place.mapX);
    if (map && sdk && Number.isFinite(lat) && Number.isFinite(lng)) map.panTo(new sdk.LatLng(lat, lng));
  }, [setToolPanel]);

  function chooseKakaoPlace(place: KakaoPlace) {
    choosePlace({ id: place.id, name: place.place_name, address: place.road_address_name || place.address_name, placeUrl: place.place_url?.replace(/^http:\/\//i, "https://"), mapX: place.x, mapY: place.y, score: null });
  }

  function setMapPointMode(mode: "origin" | "destination") {
    setPickMode(mode);
    setToolPanel("route");
    setProviderDetail(mode === "origin" ? "지도에서 새 출발지를 클릭하세요." : "지도에서 새 목적지를 클릭하세요.");
  }

  const openRoadviewAt = useCallback((point: RoutePoint) => {
    const sdk = window.kakao?.maps;
    if (!sdk) return;
    setRoadviewSelectMode(false);
    setRoadviewPreviewOpen(false);
    setToolPanel(null);
    setRoadviewOpen(true);
    setRoadviewMessage("가까운 로드뷰를 찾고 있습니다.");
    window.requestAnimationFrame(() => {
      if (!roadviewRef.current) return;
      const position = new sdk.LatLng(point.lat, point.lng);
      const roadview = new sdk.Roadview(roadviewRef.current);
      new sdk.RoadviewClient().getNearestPanoId(position, 1000, (panoId) => {
        if (!panoId) {
          setRoadviewMessage("반경 1km 안에 제공되는 로드뷰가 없습니다.");
          return;
        }
        roadview.setPanoId(panoId, position);
        roadview.relayout();
        setRoadviewMessage("");
      });
    });
  }, [setRoadviewOpen, setToolPanel]);

  function beginRoadviewSelection() {
    if (provider !== "kakao") return;
    setRoadviewPreviewOpen(false);
    setPickMode(null);
    setToolPanel(null);
    setRoadviewSelectMode((current) => {
      const next = !current;
      setProviderDetail(next ? "로드뷰로 확인할 위치를 지도에서 클릭하세요." : "로드뷰 위치 선택을 취소했습니다.");
      return next;
    });
  }

  function selectMeasure(mode: MeasurementMode) {
    const sdk = window.kakao?.maps;
    const manager = drawingManagerRef.current;
    if (!manager || !sdk?.drawing) return;
    manager.cancel();
    manager.select(sdk.drawing.OverlayType[mode]);
    setMeasureMode(mode);
    setProviderDetail(mode === "POLYLINE" ? "지도를 클릭해 거리를 그리세요." : mode === "CIRCLE" ? "지도를 드래그해 반경을 그리세요." : "지도를 클릭해 면적을 그리세요.");
  }

  function clearMeasurements() {
    const manager = drawingManagerRef.current;
    if (!manager) return;
    manager.cancel();
    const overlays = manager.getOverlays();
    Object.values(overlays).forEach((items) => items.forEach((item) => manager.remove(item)));
    setMeasureMode(null);
    setMeasureSummary("");
    setProviderDetail("지도 위 측정 도형을 지웠습니다.");
  }

  function saveRoute() {
    try {
      // 현재 위치·경로 좌표는 기기 저장소에도 남기지 않는다. 재구성에 필요한 식별자와 요약만 보관한다.
      window.localStorage.setItem("wave-saved-map", JSON.stringify({
        places: places.slice(0, 12).map((place, order) => ({ id: place.id, name: place.name, order })),
        route: route ? { id: route.id, label: route.label, provider: route.provider, totalTime: route.totalTime, totalDistance: route.totalDistance } : null,
        savedAt: new Date().toISOString(),
      }));
      setProviderDetail("현재 여행 경로를 이 기기에 저장했습니다.");
    } catch { setProviderDetail("브라우저 저장 공간을 사용할 수 없습니다."); }
  }

  async function shareRoute() {
    const data = { title: "W.A.V.E 여행 경로", text: places.map((place) => place.name).join(" → ") || "경남 무장애 여행 경로", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); setProviderDetail("현재 주소를 복사했습니다."); }
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
    return () => { document.removeEventListener("fullscreenchange", onFullscreen); document.removeEventListener("keydown", onKeyDown); };
  }, [expanded]);

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

  const drawerOpen = toolPanel !== null;
  return <div ref={shellRef} className={`route-map-shell${drawerOpen ? " drawer-open" : ""}${expanded ? " expanded" : ""}`}>
    <MapCommandBar
      provider={provider}
      providerDetail={providerDetail}
      baseMap={baseMap}
      toolPanel={toolPanel}
      roadviewSelectMode={roadviewSelectMode}
      expanded={expanded}
      onRetry={() => setRetryNonce((value) => value + 1)}
      onBaseMapChange={changeBaseMap}
      onToolPanelChange={setToolPanel}
      onRoadviewSelection={beginRoadviewSelection}
      onRoadviewPreviewChange={setRoadviewPreviewOpen}
      onCurrentLocation={moveToCurrentLocation}
      onShare={() => void shareRoute()}
      onToggleExpanded={() => void toggleExpanded()}
    />

    <RoadviewSelectionOverlays
      provider={provider}
      roadviewSelectMode={roadviewSelectMode}
      roadviewPreviewOpen={roadviewPreviewOpen}
      roadviewOpen={roadviewOpen}
      selectedMapPlace={selectedMapPlace}
      places={places}
      onCancelRoadviewSelection={() => {
        setRoadviewSelectMode(false);
        setProviderDetail("로드뷰 위치 선택을 취소했습니다.");
      }}
    />

    {toolPanel === "nearby" && <NearbyPlacesPanel
      activeCategory={activeCategory}
      categoryMessage={categoryMessage}
      categoryPlaces={categoryPlaces}
      onClose={() => setToolPanel(null)}
      onSearch={searchNearby}
      onChoosePlace={chooseKakaoPlace}
    />}

    {toolPanel === "route" && <RoutePointPanel
      origin={origin}
      pickMode={pickMode}
      onClose={() => { setToolPanel(null); setPickMode(null); }}
      onCurrentLocation={moveToCurrentLocation}
      onSelectMode={setMapPointMode}
    />}

    {toolPanel === "place" && selectedMapPlace && <MapPlacePanel
      place={selectedMapPlace}
      onClose={() => setToolPanel(null)}
      onSetOrigin={(place) => {
        onOriginChange?.({ lat: Number(place.mapY), lng: Number(place.mapX) }, place.name);
        setProviderDetail(`${place.name}을 출발지로 설정했습니다.`);
      }}
      onSetDestination={(place) => {
        onDestinationChange?.(place);
        setProviderDetail(`${place.name}을 목적지로 설정했습니다.`);
      }}
    />}

    {toolPanel === "layers" && <MapLayerPanel
      activeLayers={activeLayers}
      measureMode={measureMode}
      measureSummary={measureSummary}
      onClose={() => setToolPanel(null)}
      onToggleLayer={toggleLayer}
      onSelectMeasure={selectMeasure}
      onClearMeasurements={clearMeasurements}
      onSave={saveRoute}
      onShare={() => void shareRoute()}
    />}

    {toolPanel === "export" && <MapExportPanel
      onClose={() => setToolPanel(null)}
      onExport={(format) => {
        if (exportRouteImage({ origin, places, route, format })) setProviderDetail(`${format === "png" ? "PNG" : "JPG"} 경로 지도를 저장했습니다.`);
      }}
      onShare={() => void shareRoute()}
    />}

    <div className="route-map-canvas" ref={containerRef} role="img" aria-label="출발지와 추천 여행지를 표시한 경로 지도" />
    <MapCanvasStatusOverlays
      provider={provider}
      roadviewOpen={roadviewOpen}
      roadviewMessage={roadviewMessage}
      roadviewRef={roadviewRef}
      crowd={crowd}
      crowdPlace={crowdPlace}
      crowdVisual={crowdVisual}
      onCloseRoadview={() => setRoadviewOpen(false)}
    />
  </div>;
}
