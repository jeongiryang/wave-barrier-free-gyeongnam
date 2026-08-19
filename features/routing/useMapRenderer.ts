import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Map as LeafletMap } from "leaflet";
import {
  loadKakaoSdk,
  type KakaoDrawingManager,
  type KakaoMap,
} from "./kakao-sdk";
import { describeCrowd, escapeMapHtml, safeMapImageUrl, summarizeMeasurements } from "./map-utils";
import type { MapPickMode, MapPlace, MapProvider, RouteAlternative, RoutePoint } from "./types";

type MutableRef<T> = { current: T };

interface UseMapRendererOptions {
  containerRef: MutableRef<HTMLDivElement | null>;
  mapRef: MutableRef<LeafletMap | null>;
  kakaoMapRef: MutableRef<KakaoMap | null>;
  drawingManagerRef: MutableRef<KakaoDrawingManager | null>;
  origin: RoutePoint;
  places: MapPlace[];
  route: RouteAlternative | null;
  retryNonce: number;
  crowdVisual: ReturnType<typeof describeCrowd> | null;
  crowdPlace?: MapPlace;
  pickModeRef: MutableRef<MapPickMode>;
  roadviewSelectModeRef: MutableRef<boolean>;
  onOriginChangeRef: MutableRef<((point: RoutePoint, label: string) => void) | undefined>;
  onDestinationChangeRef: MutableRef<((place: MapPlace) => void) | undefined>;
  openRoadviewAt: (point: RoutePoint) => void;
  choosePlace: (place: MapPlace) => void;
  clearCategoryMarkers: () => void;
  setProvider: Dispatch<SetStateAction<MapProvider>>;
  setProviderDetail: Dispatch<SetStateAction<string>>;
  setSelectedMapPlace: Dispatch<SetStateAction<MapPlace | null>>;
  setPickMode: Dispatch<SetStateAction<MapPickMode>>;
  setRoadviewSelectMode: Dispatch<SetStateAction<boolean>>;
  setMeasureSummary: Dispatch<SetStateAction<string>>;
}

export function useMapRenderer({
  containerRef, mapRef, kakaoMapRef, drawingManagerRef,
  origin, places, route, retryNonce, crowdVisual, crowdPlace,
  pickModeRef, roadviewSelectModeRef, onOriginChangeRef, onDestinationChangeRef,
  openRoadviewAt, choosePlace, clearCategoryMarkers,
  setProvider, setProviderDetail, setSelectedMapPlace, setPickMode,
  setRoadviewSelectMode, setMeasureSummary,
}: UseMapRendererOptions) {
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
            await loadKakaoSdk(key);
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
                const customPlace = { id: `map-${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`, name: "지도에서 선택한 목적지", address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, mapX: String(point.lng), mapY: String(point.lat), score: null };
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
                polylineOptions: { draggable: true, removable: true, editable: true, strokeWeight: 4, strokeOpacity: .9, strokeColor: "#0a6baf", hintStrokeStyle: "dash", hintStrokeOpacity: .45 },
                circleOptions: { draggable: true, removable: true, editable: true, strokeWeight: 3, strokeOpacity: .9, strokeColor: "#0a6baf", fillColor: "#6fe3d0", fillOpacity: .2 },
                polygonOptions: { draggable: true, removable: true, editable: true, strokeWeight: 3, strokeOpacity: .9, strokeColor: "#0a6baf", fillColor: "#6fe3d0", fillOpacity: .22, hintStrokeStyle: "dash", hintStrokeOpacity: .45 },
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
              const image = safeMapImageUrl(place.image);
              const marker = document.createElement("button");
              marker.type = "button";
              const isCrowdPlace = Boolean(crowdVisual && crowdPlace?.id === place.id);
              marker.className = `${image ? "wave-map-icon place has-photo kakao-photo-marker" : "wave-map-icon place kakao-number-marker"}${isCrowdPlace ? ` crowd-aware crowd-${crowdVisual?.level}` : ""}`;
              if (isCrowdPlace && crowdVisual) {
                marker.style.setProperty("--crowd-color", crowdVisual.color);
                marker.style.setProperty("--crowd-soft", crowdVisual.soft);
              }
              marker.title = place.score === null ? `${place.name} · 접근성 근거 확인 필요` : `${place.name} · 편의조건 일치 ${place.score}%`;
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
            if (geometry.length > 1) new K.Polyline({ map, path: geometry.map((point) => new K.LatLng(point.lat, point.lng)), strokeWeight: 6, strokeColor: route?.configured ? "#0a6baf" : "#5aa3c4", strokeOpacity: .82, strokeStyle: route?.configured ? "solid" : "shortdash" });
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
            const customPlace = { id: `map-${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`, name: "지도에서 선택한 목적지", address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, mapX: String(point.lng), mapY: String(point.lat), score: null };
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
          const image = safeMapImageUrl(place.image);
          const markerHtml = image
            ? `<span class="photo-pin" style="background-image:url('${escapeMapHtml(image)}')"><b>${index + 1}</b></span>`
            : `<span class="number-pin">${index + 1}</span>`;
          const isCrowdPlace = Boolean(crowdVisual && crowdPlace?.id === place.id);
          const icon = L.divIcon({ className: `wave-map-icon place${image ? " has-photo" : ""}${isCrowdPlace ? ` crowd-aware crowd-${crowdVisual?.level}` : ""}`, html: markerHtml, iconSize: image ? [84, 92] : [44, 44], iconAnchor: image ? [42, 86] : [22, 22], popupAnchor: image ? [0, -78] : [0, -24] });
          const evidenceLabel = place.score === null ? "접근성 근거 확인 필요" : `편의조건 일치 ${place.score}%`;
          L.marker([lat, lng], { icon, title: place.name }).addTo(map).bindPopup(`<strong>${escapeMapHtml(place.name)}</strong><br>${evidenceLabel}`).on("click", () => choosePlace(place));
          if (isCrowdPlace && crowdVisual) L.circle([lat, lng], { radius: crowdVisual.radius, color: crowdVisual.color, weight: 3, opacity: .78, dashArray: "7 8", fillColor: crowdVisual.color, fillOpacity: .13 }).addTo(map);
          bounds.push([lat, lng]);
        });
        const geometry = route?.geometry?.length ? route.geometry : bounds.map(([lat, lng]) => ({ lat, lng }));
        if (geometry.length > 1) L.polyline(geometry.map((point) => [point.lat, point.lng] as [number, number]), { color: route?.configured ? "#0a6baf" : "#5aa3c4", weight: 6, opacity: .82, dashArray: route?.configured ? undefined : "9 10", lineCap: "round" }).addTo(map);
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
    }, [
      origin.lat,
      origin.lng,
      places,
      route,
      retryNonce,
      crowdVisual,
      crowdPlace?.id,
      clearCategoryMarkers,
      choosePlace,
      containerRef,
      drawingManagerRef,
      kakaoMapRef,
      mapRef,
      onDestinationChangeRef,
      onOriginChangeRef,
      openRoadviewAt,
      pickModeRef,
      roadviewSelectModeRef,
      setMeasureSummary,
      setPickMode,
      setProvider,
      setProviderDetail,
      setRoadviewSelectMode,
      setSelectedMapPlace,
    ]);
}
