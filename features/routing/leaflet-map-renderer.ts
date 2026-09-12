import { pickedDestination, type MapRendererContext } from "./map-renderer-context";
import { escapeMapHtml, mapFitPadding, safeMapImageUrl } from "./map-utils";
import { GYEONGNAM_MAP_BOUNDS } from "../../lib/gyeongnam-map-viewport.js";

export async function renderLeafletMap(
  context: MapRendererContext,
  isCancelled: () => boolean,
) {
  const {
    containerRef, mapRef, kakaoMapRef, drawingManagerRef, fitMapRef, origin, places, route,
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
    minZoom: 9,
    maxBounds: [[GYEONGNAM_MAP_BOUNDS.south, GYEONGNAM_MAP_BOUNDS.west], [GYEONGNAM_MAP_BOUNDS.north, GYEONGNAM_MAP_BOUNDS.east]],
    maxBoundsViscosity: 1,
    bounceAtZoomLimits: false,
  });
  const travelBounds = L.latLngBounds([GYEONGNAM_MAP_BOUNDS.south, GYEONGNAM_MAP_BOUNDS.west], [GYEONGNAM_MAP_BOUNDS.north, GYEONGNAM_MAP_BOUNDS.east]);
  const constrainZoom = () => map.setMinZoom(Math.max(9, map.getBoundsZoom(travelBounds, true)));
  map.on("resize", constrainZoom);
  constrainZoom();
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
  const venueMarkers: Array<{ marker: import("leaflet").Marker; id: string }> = [];
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
    const evidenceLabel = "편의시설과 실제 이동 가능 여부는 방문 전 확인";
    const venueMarker = L.marker([lat, lng], { icon, title: place.name })
      .addTo(map)
      .bindPopup(`<strong>${escapeMapHtml(place.name)}</strong><br>${evidenceLabel}`)
      .on("click", () => choosePlace(place));
    venueMarkers.push({ marker: venueMarker, id: place.id });
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
  const fit = () => {
    const canvas = containerRef.current;
    if (isCancelled() || mapRef.current !== map || !canvas) return;
    const [top, right, bottom, left] = mapFitPadding(canvas);
    if (canvas.clientWidth <= left + right || canvas.clientHeight <= top + bottom) return;
    // Automatic fitting must finish before a date/crowd update replaces this
    // map. Leaflet's zoom-transition timer can otherwise outlive remove().
    // Keep animation available for the user's own zoom and pan controls.
    map.fitBounds(bounds, { paddingTopLeft: [left, top], paddingBottomRight: [right, bottom], maxZoom: 13, animate: false });
  };
  fitMapRef.current = fit;
  if (bounds.length) fit();
  else map.setView([35.238, 128.692], 9);
  // Leaflet queues marker layers until its first view. Measure again once
  // those DOM pins exist, also when a new day has the same shell dimensions.
  // This is synchronous for an initialized map and does not wait on a timer.
  map.whenReady(() => {
    for (const { marker, id } of venueMarkers) {
      const element = marker.getElement();
      if (element) element.dataset.placeId = id;
    }
    fit();
  });
  setProvider("osm");
}
