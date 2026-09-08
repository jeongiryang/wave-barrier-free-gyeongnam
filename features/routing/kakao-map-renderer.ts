import { loadKakaoSdk } from "./kakao-sdk";
import { pickedDestination, type MapRendererContext } from "./map-renderer-context";
import { safeMapImageUrl, summarizeMeasurements } from "./map-utils";

export async function renderKakaoMap(
  key: string,
  context: MapRendererContext,
  isCancelled: () => boolean,
) {
  const {
    containerRef, kakaoMapRef, drawingManagerRef, origin, places, route,
    crowdVisual, crowdPlace, pickModeRef, roadviewSelectModeRef,
    onOriginChangeRef, onDestinationChangeRef, openRoadviewAt, choosePlace,
    setProvider, setProviderDetail, setSelectedMapPlace, setPickMode,
    setMeasureSummary,
  } = context;

  await loadKakaoSdk(key);
  if (isCancelled() || !containerRef.current) return false;
  if (!window.kakao?.maps) throw new Error("Kakao SDK is unavailable for this domain");
  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error("Kakao Maps initialization timed out")), 12000);
    window.kakao!.maps.load(() => {
      window.clearTimeout(timeoutId);
      resolve();
    });
  });
  if (isCancelled() || !containerRef.current || !window.kakao?.maps) return false;

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
      const customPlace = pickedDestination(point);
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
    const lat = Number(place.mapY);
    const lng = Number(place.mapX);
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
    marker.title = `${place.name} · 편의시설과 실제 이동 가능 여부는 방문 전 확인`;
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

  const fallbackGeometry = [
    { lat: origin.lat, lng: origin.lng },
    ...places.map((place) => ({ lat: Number(place.mapY), lng: Number(place.mapX) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
  ];
  const geometry = route?.geometry?.length ? route.geometry : fallbackGeometry;
  if (geometry.length > 1) new K.Polyline({
    map,
    path: geometry.map((point) => new K.LatLng(point.lat, point.lng)),
    strokeWeight: 6,
    strokeColor: route?.configured ? "#0a6baf" : "#5aa3c4",
    strokeOpacity: .82,
    strokeStyle: route?.configured ? "solid" : "shortdash",
  });
  if (places.length) map.setBounds(bounds);
  else {
    map.setCenter(center);
    map.setLevel(9);
  }
  setProvider("kakao");
  setProviderDetail("카카오 지도로 표시 중입니다.");
  return true;
}
