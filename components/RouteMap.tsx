"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Map as LeafletMap } from "leaflet";

export type RoutePoint = { lat: number; lng: number };

export type RouteAlternative = {
  id: string;
  label: string;
  provider?: string;
  mode?: "transit" | "walk" | "bicycle" | "car" | "train" | "bus" | "preview";
  totalTime: number;
  payment: number | null;
  totalWalk: number;
  transfers: number;
  totalDistance: number;
  configured: boolean;
  segments: Array<{ type: "walk" | "bus" | "subway" | "intercity" | "train" | "bicycle" | "car"; name: string; minutes: number }>;
  geometry: RoutePoint[];
};

export type MapPlace = { id: string; name: string; image?: string; address?: string; summary?: string; placeUrl?: string; mapX: string; mapY: string; score: number };
export type CrowdSignal = { rate: number; baseYmd?: string; place?: string };
type KakaoLatLng = { getLat(): number; getLng(): number };
type KakaoMap = {
  setBounds(bounds: unknown): void;
  setCenter(position: unknown): void;
  getCenter(): KakaoLatLng;
  panTo(position: unknown): void;
  setLevel(level: number): void;
  setMapTypeId(type: unknown): void;
  addOverlayMapTypeId(type: unknown): void;
  removeOverlayMapTypeId(type: unknown): void;
  relayout(): void;
};
type KakaoMarker = { setMap(map: KakaoMap | null): void };
type KakaoPlace = { id: string; place_name: string; address_name: string; road_address_name: string; x: string; y: string; distance: string; place_url: string };
type KakaoDrawingManager = {
  cancel(): void;
  select(type: unknown): void;
  getOverlays(): Record<string, unknown[]>;
  remove(overlay: unknown): void;
  getData(): unknown;
  addListener(event: string, callback: () => void): void;
};
type KakaoSdk = {
  maps: {
    load(callback: () => void): void;
    Map: new (node: HTMLElement, options: Record<string, unknown>) => KakaoMap;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => { extend(position: KakaoLatLng): void };
    Marker: new (options: Record<string, unknown>) => KakaoMarker;
    CustomOverlay: new (options: { map: KakaoMap; position: KakaoLatLng; content: HTMLElement; yAnchor?: number; xAnchor?: number }) => { setMap(map: KakaoMap | null): void };
    Polyline: new (options: Record<string, unknown>) => { setMap(map: KakaoMap): void };
    Circle: new (options: Record<string, unknown>) => { setMap(map: KakaoMap | null): void };
    MapTypeId: Record<"ROADMAP" | "SKYVIEW" | "HYBRID" | "TRAFFIC" | "TERRAIN" | "BICYCLE" | "BICYCLE_HYBRID" | "USE_DISTRICT", unknown>;
    Roadview: new (node: HTMLElement) => { setPanoId(panoId: number, position: KakaoLatLng): void; relayout(): void };
    RoadviewClient: new () => { getNearestPanoId(position: KakaoLatLng, radius: number, callback: (panoId: number | null) => void): void };
    services?: {
      Places: new (map: KakaoMap) => {
        categorySearch(code: string, callback: (result: KakaoPlace[], status: string) => void, options: Record<string, unknown>): void;
        keywordSearch(keyword: string, callback: (result: KakaoPlace[], status: string) => void, options: Record<string, unknown>): void;
      };
      Status: { OK: string };
      SortBy: { DISTANCE: unknown };
    };
    drawing?: {
      OverlayType: Record<"POLYLINE" | "CIRCLE" | "POLYGON", unknown>;
      DrawingManager: new (options: Record<string, unknown>) => KakaoDrawingManager;
    };
    event?: { addListener(target: object, event: string, callback: (event: { latLng: KakaoLatLng }) => void): void };
  };
};

declare global { interface Window { kakao?: KakaoSdk } }

let kakaoSdkPromise: Promise<void> | null = null;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function safeImageUrl(value?: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch { return ""; }
}

function summarizeMeasurements(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const data = value as Record<string, Array<Record<string, unknown>>>;
  const toPoints = (item: Record<string, unknown>) => Array.isArray(item.points) ? item.points.filter((point): point is { x: number; y: number } => Boolean(point) && typeof point === "object" && Number.isFinite(Number((point as { x?: unknown }).x)) && Number.isFinite(Number((point as { y?: unknown }).y))).map((point) => ({ x: Number(point.x), y: Number(point.y) })) : [];
  const distance = (points: Array<{ x: number; y: number }>) => points.slice(1).reduce((sum, point, index) => {
    const previous = points[index];
    const dLat = (point.y - previous.y) * Math.PI / 180;
    const dLng = (point.x - previous.x) * Math.PI / 180;
    const lat1 = previous.y * Math.PI / 180;
    const lat2 = point.y * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return sum + 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);
  const formatDistance = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(2)}km` : `${Math.round(meters)}m`;
  const lines = (data.polyline || []).map(toPoints).filter((points) => points.length > 1);
  if (lines.length) return `거리 ${formatDistance(lines.reduce((sum, points) => sum + distance(points), 0))}`;
  const circles = data.circle || [];
  if (circles.length) {
    const radius = circles.reduce((sum, item) => sum + Number(item.radius || 0), 0);
    return `반경 ${formatDistance(radius)}`;
  }
  const polygons = (data.polygon || []).map(toPoints).filter((points) => points.length > 2);
  if (polygons.length) {
    const area = polygons.reduce((total, points) => {
      const meanLat = points.reduce((sum, point) => sum + point.y, 0) / points.length * Math.PI / 180;
      const projected = points.map((point) => ({ x: point.x * Math.PI / 180 * 6371000 * Math.cos(meanLat), y: point.y * Math.PI / 180 * 6371000 }));
      return total + Math.abs(projected.reduce((sum, point, index) => { const next = projected[(index + 1) % projected.length]; return sum + point.x * next.y - next.x * point.y; }, 0)) / 2;
    }, 0);
    return area >= 1000000 ? `면적 ${(area / 1000000).toFixed(2)}km²` : `면적 ${Math.round(area).toLocaleString()}m²`;
  }
  return "";
}

function appendKakaoScript(key: string) {
  if (window.kakao?.maps?.services) return Promise.resolve();
  if (kakaoSdkPromise) return kakaoSdkPromise;

  kakaoSdkPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (error) reject(error); else resolve();
    };
    const timeoutId = window.setTimeout(() => finish(new Error("Kakao SDK load timed out")), 12000);
    let existing = document.querySelector<HTMLScriptElement>('script[data-wave-kakao="true"]');
    if (existing && !window.kakao?.maps && (existing.dataset.loaded === "true" || existing.dataset.failed === "true")) {
      existing.remove();
      existing = null;
    }
    if (existing) {
      if (existing.dataset.loaded === "true") {
        finish(window.kakao?.maps ? undefined : new Error("Kakao SDK is unavailable for this domain"));
        return;
      }
      if (existing.dataset.failed === "true") {
        finish(new Error("Kakao SDK load failed"));
        return;
      }
      existing.addEventListener("load", () => finish(), { once: true });
      existing.addEventListener("error", () => finish(new Error("Kakao SDK load failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.dataset.waveKakao = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services,drawing`;
    script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; finish(); };
    script.onerror = () => { script.dataset.failed = "true"; finish(new Error("Kakao SDK load failed")); };
    document.head.appendChild(script);
  });
  void kakaoSdkPromise.catch(() => { kakaoSdkPromise = null; });
  return kakaoSdkPromise;
}

const nearbyCategories = [
  { id: "food", label: "음식점", icon: "🍴", code: "FD6" },
  { id: "stay", label: "숙박", icon: "🛏", code: "AD5" },
  { id: "attraction", label: "관광명소", icon: "✦", code: "AT4" },
  { id: "bus", label: "버스", icon: "▣", keyword: "버스정류장" },
  { id: "subway", label: "지하철", icon: "▤", code: "SW8" },
  { id: "parking", label: "주차장", icon: "P", code: "PK6" },
  { id: "pharmacy", label: "약국", icon: "✚", code: "PM9" },
  { id: "hospital", label: "병원", icon: "H", code: "HP8" },
  { id: "bank", label: "은행·ATM", icon: "₩", code: "BK9" },
  { id: "cafe", label: "카페", icon: "☕", code: "CE7" },
  { id: "store", label: "편의점", icon: "24", code: "CS2" },
  { id: "mart", label: "대형마트", icon: "▦", code: "MT1" },
  { id: "fuel", label: "주유·충전", icon: "⛽", code: "OL7" },
  { id: "culture", label: "문화시설", icon: "▥", code: "CT1" },
] as const;

const overlayLayers = [
  { id: "TRAFFIC", label: "교통정보", icon: "🚦" },
  { id: "BICYCLE", label: "자전거", icon: "🚲" },
  { id: "TERRAIN", label: "지형도", icon: "⛰" },
  { id: "USE_DISTRICT", label: "지적편집도", icon: "◇" },
] as const;

function describeCrowd(rate: number) {
  if (rate < 25) return { level: "low", label: "여유", color: "#18a974", soft: "rgba(24,169,116,.2)", radius: 950, message: "비교적 한적해 여유로운 관람이 예상돼요." };
  if (rate < 50) return { level: "moderate", label: "보통", color: "#e5a11a", soft: "rgba(229,161,26,.21)", radius: 1350, message: "일반적인 방문 흐름입니다. 인기 시간대만 확인해 주세요." };
  if (rate < 75) return { level: "busy", label: "붐빔", color: "#ee6b3b", soft: "rgba(238,107,59,.22)", radius: 1850, message: "방문객이 몰릴 수 있어 이른 시간 방문을 권해요." };
  return { level: "very-busy", label: "매우 붐빔", color: "#d93d55", soft: "rgba(217,61,85,.23)", radius: 2400, message: "혼잡이 예상됩니다. 주변 대체 장소나 시간 변경을 권해요." };
}

export default function RouteMap({ origin, places, route, crowd, crowdPlaceId, onOriginChange, onDestinationChange }: { origin: RoutePoint; places: MapPlace[]; route: RouteAlternative | null; crowd?: CrowdSignal | null; crowdPlaceId?: string; onOriginChange?: (point: RoutePoint, label: string) => void; onDestinationChange?: (place: MapPlace) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const drawingManagerRef = useRef<KakaoDrawingManager | null>(null);
  const categoryMarkersRef = useRef<KakaoMarker[]>([]);
  const [provider, setProvider] = useState<"kakao" | "osm" | "loading">("loading");
  const [providerDetail, setProviderDetail] = useState("카카오 지도를 연결하고 있습니다.");
  const [retryNonce, setRetryNonce] = useState(0);
  const [baseMap, setBaseMap] = useState<"roadmap" | "skyview">("roadmap");
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const shellRef = useRef<HTMLDivElement>(null);
  const [toolPanel, setToolPanel] = useState<"nearby" | "layers" | "export" | "route" | "place" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pickMode, setPickMode] = useState<"origin" | "destination" | null>(null);
  const pickModeRef = useRef<"origin" | "destination" | null>(null);
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
  const [measureMode, setMeasureMode] = useState<"POLYLINE" | "CIRCLE" | "POLYGON" | null>(null);
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

  function choosePlace(place: MapPlace) {
    setSelectedMapPlace(place);
    setToolPanel("place");
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    const lat = Number(place.mapY); const lng = Number(place.mapX);
    if (map && sdk && Number.isFinite(lat) && Number.isFinite(lng)) map.panTo(new sdk.LatLng(lat, lng));
  }

  function chooseKakaoPlace(place: KakaoPlace) {
    choosePlace({ id: place.id, name: place.place_name, address: place.road_address_name || place.address_name, placeUrl: place.place_url, mapX: place.x, mapY: place.y, score: 0 });
  }

  function setMapPointMode(mode: "origin" | "destination") {
    setPickMode(mode);
    setToolPanel("route");
    setProviderDetail(mode === "origin" ? "지도에서 새 출발지를 클릭하세요." : "지도에서 새 목적지를 클릭하세요.");
  }

  function openRoadviewAt(point: RoutePoint) {
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
  }

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

  function selectMeasure(mode: "POLYLINE" | "CIRCLE" | "POLYGON") {
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

  function exportRouteImage(format: "png" | "jpeg") {
    const validPlaces = places.filter((place) => Number.isFinite(Number(place.mapX)) && Number.isFinite(Number(place.mapY)));
    const geometry = route?.geometry?.length
      ? route.geometry
      : [{ lat: origin.lat, lng: origin.lng }, ...validPlaces.map((place) => ({ lat: Number(place.mapY), lng: Number(place.mapX) }))];
    const points = geometry.length > 1 ? geometry : [{ lat: origin.lat, lng: origin.lng }, { lat: origin.lat + .02, lng: origin.lng + .02 }];
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext("2d");
    if (!context) return;
    const dark = format === "jpeg" ? "#f7fbfe" : "#eef5fa";
    context.fillStyle = dark;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(23,105,255,.16)");
    gradient.addColorStop(.55, "rgba(128,232,199,.12)");
    gradient.addColorStop(1, "rgba(7,31,53,.04)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(48,92,121,.11)";
    context.lineWidth = 1;
    for (let x = 80; x < canvas.width; x += 80) { context.beginPath(); context.moveTo(x, 150); context.lineTo(x, 900); context.stroke(); }
    for (let y = 180; y < 900; y += 80) { context.beginPath(); context.moveTo(80, y); context.lineTo(1520, y); context.stroke(); }

    const allPoints = [...points, ...validPlaces.map((place) => ({ lat: Number(place.mapY), lng: Number(place.mapX) }))];
    const minLat = Math.min(...allPoints.map((point) => point.lat));
    const maxLat = Math.max(...allPoints.map((point) => point.lat));
    const minLng = Math.min(...allPoints.map((point) => point.lng));
    const maxLng = Math.max(...allPoints.map((point) => point.lng));
    const latSpan = Math.max(maxLat - minLat, .008);
    const lngSpan = Math.max(maxLng - minLng, .008);
    const project = (point: RoutePoint) => ({
      x: 140 + ((point.lng - minLng) / lngSpan) * 1320,
      y: 210 + (1 - (point.lat - minLat) / latSpan) * 610,
    });
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(7,31,53,.18)";
    context.lineWidth = 20;
    context.beginPath();
    points.forEach((point, index) => { const p = project(point); if (index) context.lineTo(p.x, p.y); else context.moveTo(p.x, p.y); });
    context.stroke();
    context.strokeStyle = "#1769ff";
    context.lineWidth = 11;
    context.beginPath();
    points.forEach((point, index) => { const p = project(point); if (index) context.lineTo(p.x, p.y); else context.moveTo(p.x, p.y); });
    context.stroke();

    const drawPin = (point: RoutePoint, label: string, rank: string, primary = false) => {
      const p = project(point);
      context.beginPath(); context.arc(p.x, p.y, primary ? 28 : 24, 0, Math.PI * 2);
      context.fillStyle = primary ? "#071f35" : "#1769ff"; context.fill();
      context.lineWidth = 8; context.strokeStyle = "#ffffff"; context.stroke();
      context.fillStyle = "#ffffff"; context.font = "800 22px system-ui, sans-serif"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(rank, p.x, p.y + 1);
      const width = Math.min(340, Math.max(150, context.measureText(label).width + 42));
      const boxX = Math.min(1510 - width, Math.max(90, p.x - width / 2));
      const boxY = p.y < 300 ? p.y + 42 : p.y - 76;
      context.fillStyle = "rgba(255,255,255,.96)"; context.beginPath(); context.roundRect(boxX, boxY, width, 43, 13); context.fill();
      context.fillStyle = "#12324b"; context.font = "750 18px system-ui, sans-serif"; context.fillText(label, boxX + width / 2, boxY + 22);
    };
    drawPin({ lat: origin.lat, lng: origin.lng }, "출발지", "S", true);
    validPlaces.slice(0, 6).forEach((place, index) => drawPin({ lat: Number(place.mapY), lng: Number(place.mapX) }, place.name, String(index + 1)));

    context.textAlign = "left"; context.textBaseline = "alphabetic";
    context.fillStyle = "#1769ff"; context.font = "900 22px system-ui, sans-serif"; context.fillText("W.A.V.E ROUTE MAP", 86, 70);
    context.fillStyle = "#071f35"; context.font = "850 46px system-ui, sans-serif"; context.fillText("경남 무장애 여행 경로", 86, 124);
    context.fillStyle = "#5e7587"; context.font = "650 20px system-ui, sans-serif";
    const summary = [route?.label || "추천 경로", route?.totalTime ? `${route.totalTime}분` : null, route?.totalDistance ? `${(route.totalDistance / 1000).toFixed(1)}km` : null].filter(Boolean).join(" · ");
    context.fillText(summary, 86, 160);
    context.fillStyle = "rgba(7,31,53,.82)"; context.fillRect(80, 884, 1440, 70);
    context.fillStyle = "#ffffff"; context.font = "700 18px system-ui, sans-serif"; context.fillText(`${validPlaces.length}개 여행지 · ${route?.provider || "W.A.V.E 추천 경로"}`, 112, 927);
    context.textAlign = "right"; context.fillStyle = "#b9d2e5"; context.font = "600 16px system-ui, sans-serif"; context.fillText("지도 배경 미포함 · 경로와 장소를 시각화한 공유용 이미지", 1480, 927);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `wave-route-map.${format === "jpeg" ? "jpg" : "png"}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, `image/${format}`, .94);
    setProviderDetail(`${format === "jpeg" ? "JPG" : "PNG"} 경로 지도를 저장했습니다.`);
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

  useEffect(() => {
    let cancelled = false;
    async function render() {
      setProvider("loading");
      setProviderDetail("카카오 지도를 연결하고 있습니다.");
      let key = "";
      try {
        const response = await fetch("/api/map-config", { headers: { Accept: "application/json" } });
        if (response.ok) key = ((await response.json()) as { javascriptKey?: string }).javascriptKey || "";
      } catch { /* OpenStreetMap fallback below */ }

      if (key && containerRef.current) {
        try {
          await appendKakaoScript(key);
          if (cancelled || !containerRef.current) return;
          if (!window.kakao?.maps) throw new Error("Kakao SDK is unavailable for this domain");
          await new Promise<void>((resolve, reject) => {
            const timeoutId = window.setTimeout(() => reject(new Error("Kakao Maps initialization timed out")), 12000);
            window.kakao!.maps.load(() => {
              window.clearTimeout(timeoutId);
              resolve();
            });
          });
          if (cancelled || !containerRef.current || !window.kakao?.maps) return;
          const K = window.kakao.maps;
          containerRef.current.replaceChildren();
          const center = new K.LatLng(origin.lat, origin.lng);
          const map = new K.Map(containerRef.current, { center, level: 9 });
          kakaoMapRef.current = map;
          K.event?.addListener(map, "click", (event) => {
            const point = { lat: event.latLng.getLat(), lng: event.latLng.getLng() };
            if (roadviewSelectModeRef.current) {
              openRoadviewAt(point);
              return;
            }
            const mode = pickModeRef.current;
            if (!mode) return;
            if (mode === "origin") onOriginChangeRef.current?.(point, "지도에서 선택한 출발지");
            else {
              const customPlace = { id: `map-${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`, name: "지도에서 선택한 목적지", address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, mapX: String(point.lng), mapY: String(point.lat), score: 0 };
              setSelectedMapPlace(customPlace);
              onDestinationChangeRef.current?.(customPlace);
            }
            setPickMode(null);
            setProviderDetail(mode === "origin" ? "새 출발지를 설정했습니다." : "새 목적지를 설정했습니다.");
          });
          if (K.drawing) {
            const manager = new K.drawing.DrawingManager({
              map,
              drawingMode: [K.drawing.OverlayType.POLYLINE, K.drawing.OverlayType.CIRCLE, K.drawing.OverlayType.POLYGON],
              polylineOptions: { draggable: true, removable: true, editable: true, strokeWeight: 4, strokeOpacity: .9, strokeColor: "#1769ff", hintStrokeStyle: "dash", hintStrokeOpacity: .45 },
              circleOptions: { draggable: true, removable: true, editable: true, strokeWeight: 3, strokeOpacity: .9, strokeColor: "#1769ff", fillColor: "#80e8c7", fillOpacity: .2 },
              polygonOptions: { draggable: true, removable: true, editable: true, strokeWeight: 3, strokeOpacity: .9, strokeColor: "#1769ff", fillColor: "#80e8c7", fillOpacity: .22, hintStrokeStyle: "dash", hintStrokeOpacity: .45 },
            });
            manager.addListener("state_changed", () => setMeasureSummary(summarizeMeasurements(manager.getData())));
            drawingManagerRef.current = manager;
          }
          const bounds = new K.LatLngBounds();
          const addPoint = (lat: number, lng: number, title: string) => {
            const position = new K.LatLng(lat, lng);
            bounds.extend(position);
            new K.Marker({ map, position, title });
          };
          addPoint(origin.lat, origin.lng, "출발지");
          places.forEach((place, index) => {
            const lat = Number(place.mapY); const lng = Number(place.mapX);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            const position = new K.LatLng(lat, lng);
            bounds.extend(position);
            const image = safeImageUrl(place.image);
            const marker = document.createElement("button");
            marker.type = "button";
            const isCrowdPlace = Boolean(crowdVisual && crowdPlace?.id === place.id);
            marker.className = `${image ? "wave-map-icon place has-photo kakao-photo-marker" : "wave-map-icon place kakao-number-marker"}${isCrowdPlace ? ` crowd-aware crowd-${crowdVisual?.level}` : ""}`;
            if (isCrowdPlace && crowdVisual) {
              marker.style.setProperty("--crowd-color", crowdVisual.color);
              marker.style.setProperty("--crowd-soft", crowdVisual.soft);
            }
            marker.title = `${place.name} · W.A.V.E ${place.score}`;
            marker.setAttribute("aria-label", marker.title);
            if (image) {
              const photo = document.createElement("span");
              photo.className = "photo-pin";
              photo.style.backgroundImage = `url("${image.replace(/["\\]/g, "")}")`;
              const rank = document.createElement("b");
              rank.textContent = String(index + 1);
              photo.appendChild(rank);
              marker.appendChild(photo);
            } else marker.textContent = String(index + 1);
            marker.addEventListener("click", () => choosePlace(place));
            new K.CustomOverlay({ map, position, content: marker, yAnchor: 1, xAnchor: .5 });
            if (isCrowdPlace && crowdVisual) new K.Circle({
              map,
              center: position,
              radius: crowdVisual.radius,
              strokeWeight: 3,
              strokeColor: crowdVisual.color,
              strokeOpacity: .78,
              strokeStyle: "shortdash",
              fillColor: crowdVisual.color,
              fillOpacity: .13,
            });
          });
          const geometry = route?.geometry?.length ? route.geometry : [{ lat: origin.lat, lng: origin.lng }, ...places.map((p) => ({ lat: Number(p.mapY), lng: Number(p.mapX) })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))];
          if (geometry.length > 1) new K.Polyline({ map, path: geometry.map((point) => new K.LatLng(point.lat, point.lng)), strokeWeight: 6, strokeColor: route?.configured ? "#1769ff" : "#4a88c7", strokeOpacity: .82, strokeStyle: route?.configured ? "solid" : "shortdash" });
          if (places.length) map.setBounds(bounds); else { map.setCenter(center); map.setLevel(9); }
          setProvider("kakao");
          setProviderDetail("Kakao Maps JavaScript SDK로 표시 중입니다.");
          return;
        } catch (error) {
          setProviderDetail(error instanceof Error && error.message.includes("domain")
            ? "Kakao JavaScript SDK 도메인 등록을 확인해 주세요. 대체 지도를 표시합니다."
            : "Kakao 지도 연결이 지연되어 대체 지도를 표시합니다.");
        }
      } else if (!key) {
        setProviderDetail("Kakao JavaScript 키가 없어 대체 지도를 표시합니다.");
      }

      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      kakaoMapRef.current = null;
      drawingManagerRef.current = null;
      clearCategoryMarkers();
      if (mapRef.current) mapRef.current.remove();
      containerRef.current.replaceChildren();
      const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: true, attributionControl: true });
      mapRef.current = map;
      map.on("click", (event) => {
        if (roadviewSelectModeRef.current) {
          setRoadviewSelectMode(false);
          setProviderDetail("로드뷰는 카카오 지도 연결 상태에서만 제공됩니다.");
          return;
        }
        const mode = pickModeRef.current;
        if (!mode) return;
        const point = { lat: event.latlng.lat, lng: event.latlng.lng };
        if (mode === "origin") onOriginChangeRef.current?.(point, "지도에서 선택한 출발지");
        else {
          const customPlace = { id: `map-${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`, name: "지도에서 선택한 목적지", address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, mapX: String(point.lng), mapY: String(point.lat), score: 0 };
          setSelectedMapPlace(customPlace);
          onDestinationChangeRef.current?.(customPlace);
        }
        setPickMode(null);
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
      const bounds: Array<[number, number]> = [];
      const originIcon = L.divIcon({ className: "wave-map-icon origin", html: "<span>출발</span>", iconSize: [46, 46], iconAnchor: [23, 23] });
      L.marker([origin.lat, origin.lng], { icon: originIcon, title: "출발지" }).addTo(map).bindPopup("<strong>출발지</strong>");
      bounds.push([origin.lat, origin.lng]);
      places.forEach((place, index) => {
        const lat = Number(place.mapY); const lng = Number(place.mapX);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const image = safeImageUrl(place.image);
        const markerHtml = image
          ? `<span class="photo-pin" style="background-image:url('${escapeHtml(image)}')"><b>${index + 1}</b></span>`
          : `<span class="number-pin">${index + 1}</span>`;
        const isCrowdPlace = Boolean(crowdVisual && crowdPlace?.id === place.id);
        const icon = L.divIcon({ className: `wave-map-icon place${image ? " has-photo" : ""}${isCrowdPlace ? ` crowd-aware crowd-${crowdVisual?.level}` : ""}`, html: markerHtml, iconSize: image ? [84, 92] : [44, 44], iconAnchor: image ? [42, 86] : [22, 22], popupAnchor: image ? [0, -78] : [0, -24] });
        L.marker([lat, lng], { icon, title: place.name }).addTo(map).bindPopup(`<strong>${escapeHtml(place.name)}</strong><br>접근성 평점 ★ ${(place.score / 20).toFixed(1)}`).on("click", () => choosePlace(place));
        if (isCrowdPlace && crowdVisual) L.circle([lat, lng], { radius: crowdVisual.radius, color: crowdVisual.color, weight: 3, opacity: .78, dashArray: "7 8", fillColor: crowdVisual.color, fillOpacity: .13 }).addTo(map);
        bounds.push([lat, lng]);
      });
      const geometry = route?.geometry?.length ? route.geometry : bounds.map(([lat, lng]) => ({ lat, lng }));
      if (geometry.length > 1) L.polyline(geometry.map((point) => [point.lat, point.lng] as [number, number]), { color: route?.configured ? "#1769ff" : "#4a88c7", weight: 6, opacity: .82, dashArray: route?.configured ? undefined : "9 10", lineCap: "round" }).addTo(map);
      if (bounds.length) map.fitBounds(bounds, { padding: [46, 46], maxZoom: 13 }); else map.setView([35.238, 128.692], 9);
      setProvider("osm");
    }
    void render();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      kakaoMapRef.current = null;
      drawingManagerRef.current = null;
      clearCategoryMarkers();
    };
  }, [origin.lat, origin.lng, places, route, retryNonce, crowdVisual, crowdPlace?.id, clearCategoryMarkers]);

  const drawerOpen = toolPanel !== null;
  return <div ref={shellRef} className={`route-map-shell${drawerOpen ? " drawer-open" : ""}${expanded ? " expanded" : ""}`}>
    <div className={`map-provider-badge ${provider}`} title={providerDetail}><span />{provider === "kakao" ? "Kakao Map" : provider === "osm" ? "대체 지도" : "지도 연결 중"}{provider === "osm" && <button type="button" onClick={() => setRetryNonce((value) => value + 1)}>Kakao 재연결</button>}</div>
    <nav className="map-command-bar" aria-label="지도 기능">
      <div className="map-type-switch" aria-label="지도 유형">
        <button type="button" className={baseMap === "roadmap" ? "active" : ""} onClick={() => changeBaseMap("roadmap")} disabled={provider !== "kakao"}>지도</button>
        <button type="button" className={baseMap === "skyview" ? "active" : ""} onClick={() => changeBaseMap("skyview")} disabled={provider !== "kakao"}>스카이뷰</button>
      </div>
      <button type="button" className={toolPanel === "nearby" ? "active" : ""} onClick={() => setToolPanel((value) => value === "nearby" ? null : "nearby")} disabled={provider !== "kakao"}>⌖ 주변</button>
      <button type="button" className={toolPanel === "route" ? "active" : ""} onClick={() => setToolPanel((value) => value === "route" ? null : "route")}>⇄ 출발·도착</button>
      <button type="button" className={toolPanel === "layers" ? "active" : ""} onClick={() => setToolPanel((value) => value === "layers" ? null : "layers")} disabled={provider !== "kakao"}>▱ 레이어·측정</button>
      <button type="button" className={roadviewSelectMode ? "active" : ""} onClick={beginRoadviewSelection} onMouseEnter={() => setRoadviewPreviewOpen(true)} onMouseLeave={() => setRoadviewPreviewOpen(false)} onFocus={() => setRoadviewPreviewOpen(true)} onBlur={() => setRoadviewPreviewOpen(false)} disabled={provider !== "kakao"}>◉ 로드뷰</button>
      <button type="button" onClick={moveToCurrentLocation}>◎ 내 위치</button>
      <button type="button" className={toolPanel === "export" ? "active" : ""} onClick={() => setToolPanel((value) => value === "export" ? null : "export")}>⇩ 이미지</button>
      <button type="button" onClick={() => void shareRoute()}>↗ 공유</button>
      <button type="button" className="map-expand-button" onClick={() => void toggleExpanded()}>{expanded ? "× 닫기" : "⛶ 큰 지도"}</button>
    </nav>

    {roadviewSelectMode && <div className="roadview-pick-banner" role="status"><div><strong>로드뷰 위치 선택</strong><span>지도에서 확인할 도로나 장소를 클릭하세요.</span></div><button type="button" onClick={() => { setRoadviewSelectMode(false); setProviderDetail("로드뷰 위치 선택을 취소했습니다."); }} aria-label="로드뷰 위치 선택 취소">×</button></div>}
    {roadviewPreviewOpen && !roadviewSelectMode && !roadviewOpen && provider === "kakao" && <aside className="roadview-hover-preview" aria-label="로드뷰 위치 선택 미리보기">
      {safeImageUrl(selectedMapPlace?.image || places[0]?.image) && <div style={{ backgroundImage: `url("${safeImageUrl(selectedMapPlace?.image || places[0]?.image).replace(/["\\]/g, "")}")` }} />}
      <small>관광사진 미리보기</small><strong>{selectedMapPlace?.name || places[0]?.name || "지도에서 위치 선택"}</strong><span>버튼을 누른 뒤 지도에서 로드뷰 위치를 선택합니다.</span>
    </aside>}

    {toolPanel === "nearby" && <section className="map-tool-panel map-side-drawer map-nearby-panel" aria-label="주변 장소 찾기">
      <header><div><strong>주변 장소</strong><span>지도 중심 반경 10km · 거리순</span></div><button type="button" onClick={() => setToolPanel(null)} aria-label="주변 장소 닫기">×</button></header>
      <div className="map-tool-grid">{nearbyCategories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? "active" : ""} onClick={() => searchNearby(category)}><i>{category.icon}</i>{category.label}</button>)}</div>
      {(categoryMessage || categoryPlaces.length > 0) && <div className="map-poi-results" aria-live="polite">
        <div className="map-results-heading"><strong>{nearbyCategories.find((item) => item.id === activeCategory)?.label || "검색 결과"}</strong><span>{categoryMessage}</span></div>
        <div className="map-poi-list">{categoryPlaces.slice(0, 12).map((place) => <article key={place.id}>
          <div><strong>{place.place_name}</strong><span>{place.road_address_name || place.address_name}</span></div>
          <small>{place.distance ? `${Number(place.distance).toLocaleString()}m` : "거리 정보 없음"}</small>
          <button type="button" onClick={() => chooseKakaoPlace(place)}>지도에서 보기</button>
          {place.place_url && <a href={place.place_url} target="_blank" rel="noreferrer">장소 상세·후기 ↗</a>}
        </article>)}</div>
      </div>}
    </section>}

    {toolPanel === "route" && <section className="map-tool-panel map-side-drawer map-route-panel" aria-label="출발지와 목적지 설정">
      <header><div><strong>출발지 · 목적지</strong><span>현재 위치 또는 지도 클릭으로 바로 설정</span></div><button type="button" onClick={() => { setToolPanel(null); setPickMode(null); }} aria-label="출발지 목적지 설정 닫기">×</button></header>
      <div className="map-route-status"><span><b>S</b> 출발지</span><strong>{origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}</strong></div>
      <div className="map-route-actions">
        <button type="button" onClick={moveToCurrentLocation}><i>◎</i><strong>현재 위치에서 출발</strong><small>위치 권한을 허용하면 지도에 표시</small></button>
        <button type="button" className={pickMode === "origin" ? "active" : ""} onClick={() => setMapPointMode("origin")}><i>S</i><strong>지도에서 출발지 선택</strong><small>지도 위 원하는 지점을 클릭</small></button>
        <button type="button" className={pickMode === "destination" ? "active" : ""} onClick={() => setMapPointMode("destination")}><i>G</i><strong>지도에서 목적지 선택</strong><small>관광지 마커도 바로 선택 가능</small></button>
      </div>
      {pickMode && <p className="map-pick-notice">지도의 원하는 지점을 클릭하세요. ESC 또는 닫기로 취소할 수 있습니다.</p>}
    </section>}

    {toolPanel === "place" && selectedMapPlace && <section className="map-tool-panel map-side-drawer map-place-panel" aria-label={`${selectedMapPlace.name} 상세 정보`}>
      <header><div><strong>관광지 정보</strong><span>마커를 누르면 바로 확인</span></div><button type="button" onClick={() => setToolPanel(null)} aria-label="관광지 정보 닫기">×</button></header>
      {safeImageUrl(selectedMapPlace.image) && <div className="map-place-photo" style={{ backgroundImage: `url("${safeImageUrl(selectedMapPlace.image)?.replace(/["\\]/g, "")}")` }} />}
      <div className="map-place-copy"><small>{selectedMapPlace.address || "경상남도 관광지"}</small><h3>{selectedMapPlace.name}</h3>{selectedMapPlace.summary && <p>{selectedMapPlace.summary}</p>}</div>
      {selectedMapPlace.score > 0 ? <div className="map-place-rating"><strong>★ {(selectedMapPlace.score / 20).toFixed(1)}</strong><span>W.A.V.E 접근성 평점 · {selectedMapPlace.score}점</span></div> : <div className="map-place-rating unavailable"><strong>후기 확인</strong><span>공식 별점은 카카오 장소 페이지에서 확인</span></div>}
      <div className="map-place-actions">
        <button type="button" onClick={() => { const point = { lat: Number(selectedMapPlace.mapY), lng: Number(selectedMapPlace.mapX) }; onOriginChange?.(point, selectedMapPlace.name); setProviderDetail(`${selectedMapPlace.name}을 출발지로 설정했습니다.`); }}>출발지로</button>
        <button type="button" onClick={() => { onDestinationChange?.(selectedMapPlace); setProviderDetail(`${selectedMapPlace.name}을 목적지로 설정했습니다.`); }}>목적지로</button>
      </div>
      <a className="map-place-review-link" href={selectedMapPlace.placeUrl || `https://map.kakao.com/link/search/${encodeURIComponent(selectedMapPlace.name)}`} target="_blank" rel="noreferrer">카카오 장소 상세·후기 보기 ↗</a>
    </section>}

    {toolPanel === "layers" && <section className="map-tool-panel map-side-drawer map-layer-panel" aria-label="지도 레이어와 측정 도구">
      <header><div><strong>지도 설정</strong><span>카카오 공식 지도 레이어</span></div><button type="button" onClick={() => setToolPanel(null)} aria-label="지도 설정 닫기">×</button></header>
      <h4>레이어</h4>
      <div className="map-tool-grid">{overlayLayers.map((layer) => <button type="button" key={layer.id} className={activeLayers.includes(layer.id) ? "active" : ""} onClick={() => toggleLayer(layer.id)}><i>{layer.icon}</i>{layer.label}</button>)}</div>
      <h4>측정</h4>
      <div className="map-tool-grid">
        <button type="button" className={measureMode === "POLYLINE" ? "active" : ""} onClick={() => selectMeasure("POLYLINE")}><i>╱</i>거리</button>
        <button type="button" className={measureMode === "CIRCLE" ? "active" : ""} onClick={() => selectMeasure("CIRCLE")}><i>○</i>반경</button>
        <button type="button" className={measureMode === "POLYGON" ? "active" : ""} onClick={() => selectMeasure("POLYGON")}><i>△</i>면적</button>
        <button type="button" onClick={clearMeasurements}><i>×</i>지우기</button>
      </div>
      {measureSummary && <p className="map-measure-summary">{measureSummary}</p>}
      <h4>경로 도구</h4>
      <div className="map-utility-actions">
        <button type="button" onClick={saveRoute}><i>☆</i>저장</button>
        <button type="button" onClick={() => window.print()}><i>▣</i>인쇄</button>
        <button type="button" onClick={() => void shareRoute()}><i>↗</i>공유</button>
      </div>
    </section>}

    {toolPanel === "export" && <section className="map-tool-panel map-side-drawer map-export-panel" aria-label="지도 이미지 저장">
      <header><div><strong>지도 이미지 저장</strong><span>경로·장소·시간을 담은 고해상도 이미지</span></div><button type="button" onClick={() => setToolPanel(null)} aria-label="이미지 저장 닫기">×</button></header>
      <div className="map-export-preview"><span>W.A.V.E</span><strong>여행 경로 지도</strong><small>1600 × 1000px</small></div>
      <p>브라우저 보안과 지도 저작권을 지키기 위해 카카오 배경 타일은 제외하고, 현재 경로와 장소를 읽기 쉬운 공유용 지도 이미지로 만듭니다.</p>
      <div className="map-export-actions">
        <button type="button" onClick={() => exportRouteImage("png")}><i>PNG</i>투명도 없는 선명한 이미지</button>
        <button type="button" onClick={() => exportRouteImage("jpeg")}><i>JPG</i>용량이 작은 공유용 이미지</button>
      </div>
      <button type="button" className="map-share-wide" onClick={() => void shareRoute()}>현재 경로 공유하기 ↗</button>
    </section>}

    <div className="route-map-canvas" ref={containerRef} role="img" aria-label="출발지와 추천 여행지를 표시한 경로 지도" />
    {crowdVisual && crowd && crowdPlace && !roadviewOpen && <aside className={`map-crowd-legend crowd-${crowdVisual.level}`} style={{ "--crowd-color": crowdVisual.color, "--crowd-soft": crowdVisual.soft } as CSSProperties} aria-label={`${crowdPlace.name} 혼잡 예측 ${crowdVisual.label}`}>
      <span className="crowd-visual"><i /></span>
      <div><small>30일 혼잡 예측 · {crowdPlace.name}</small><strong>{crowdVisual.label}</strong><p>{crowdVisual.message}</p></div>
      <em>{crowd.rate.toFixed(1)}%</em>
    </aside>}
    {provider === "loading" && <div className="map-loading-skeleton" role="status" aria-label="지도 연결 중"><div><i /><i /><i /><span /></div><p><b />카카오 지도를 안전하게 연결하고 있습니다.</p></div>}
    {roadviewOpen && <section className="map-roadview-panel" aria-label="카카오 로드뷰">
      <header><strong>로드뷰</strong><button type="button" onClick={() => setRoadviewOpen(false)} aria-label="로드뷰 닫기">×</button></header>
      <div ref={roadviewRef} />
      {roadviewMessage && <p>{roadviewMessage}</p>}
    </section>}
  </div>;
}
