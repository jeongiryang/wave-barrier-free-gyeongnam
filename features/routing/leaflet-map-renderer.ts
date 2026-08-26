import { pickedDestination, type MapRendererContext } from "./map-renderer-context";
import { escapeMapHtml, safeMapImageUrl } from "./map-utils";

export async function renderLeafletMap(
  context: MapRendererContext,
  isCancelled: () => boolean,
) {
  const {
    containerRef, mapRef, kakaoMapRef, drawingManagerRef, origin, places, route,
    crowdVisual, crowdPlace, pickModeRef, roadviewSelectModeRef,
    onOriginChangeRef, onDestinationChangeRef, choosePlace, clearCategoryMarkers,
    setProvider, setProviderDetail, setSelectedMapPlace, setPickMode,
    setRoadviewSelectMode,
  } = context;
  const L = await import("leaflet");
  if (isCancelled() || !containerRef.current) return;

  kakaoMapRef.current = null;
  drawingManagerRef.current = null;
  clearCategoryMarkers();
  mapRef.current?.remove();
  containerRef.current.replaceChildren();

  const map = L.map(containerRef.current, {
    zoomControl: false,
    scrollWheelZoom: true,
    // Markers and map controls remain independently keyboard reachable; the canvas itself
    // must not become a focusable wrapper around those interactive descendants.
    keyboard: false,
    attributionControl: true,
  });
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
      const customPlace = pickedDestination(point);
      setSelectedMapPlace(customPlace);
      onDestinationChangeRef.current?.(customPlace);
    }
    setPickMode(null);
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const bounds: Array<[number, number]> = [];
  const originIcon = L.divIcon({
    className: "wave-map-icon origin",
    html: "<span>출발</span>",
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
  L.marker([origin.lat, origin.lng], { icon: originIcon, title: "출발지" })
    .addTo(map)
    .bindPopup("<strong>출발지</strong>");
  bounds.push([origin.lat, origin.lng]);

  places.forEach((place, index) => {
    const lat = Number(place.mapY);
    const lng = Number(place.mapX);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const image = safeMapImageUrl(place.image);
    const markerHtml = image
      ? `<span class="photo-pin" style="background-image:url('${escapeMapHtml(image)}')"><b>${index + 1}</b></span>`
      : `<span class="number-pin">${index + 1}</span>`;
    const isCrowdPlace = Boolean(crowdVisual && crowdPlace?.id === place.id);
    const icon = L.divIcon({
      className: `wave-map-icon place${image ? " has-photo" : ""}${isCrowdPlace ? ` crowd-aware crowd-${crowdVisual?.level}` : ""}`,
      html: markerHtml,
      iconSize: image ? [84, 92] : [44, 44],
      iconAnchor: image ? [42, 86] : [22, 22],
      popupAnchor: image ? [0, -78] : [0, -24],
    });
    const evidenceLabel = place.score === null ? "접근성 근거 확인 필요" : `편의조건 일치 ${place.score}%`;
    L.marker([lat, lng], { icon, title: place.name })
      .addTo(map)
      .bindPopup(`<strong>${escapeMapHtml(place.name)}</strong><br>${evidenceLabel}`)
      .on("click", () => choosePlace(place));
    if (isCrowdPlace && crowdVisual) L.circle([lat, lng], {
      radius: crowdVisual.radius,
      color: crowdVisual.color,
      weight: 3,
      opacity: .78,
      dashArray: "7 8",
      fillColor: crowdVisual.color,
      fillOpacity: .13,
    }).addTo(map);
    bounds.push([lat, lng]);
  });

  const geometry = route?.geometry?.length
    ? route.geometry
    : bounds.map(([lat, lng]) => ({ lat, lng }));
  if (geometry.length > 1) L.polyline(
    geometry.map((point) => [point.lat, point.lng] as [number, number]),
    {
      color: route?.configured ? "#0a6baf" : "#5aa3c4",
      weight: 6,
      opacity: .82,
      dashArray: route?.configured ? undefined : "9 10",
      lineCap: "round",
    },
  ).addTo(map);
  if (bounds.length) map.fitBounds(bounds, { padding: [46, 46], maxZoom: 13 });
  else map.setView([35.238, 128.692], 9);
  setProvider("osm");
}
