"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { supportedPlacePoint } from "../../lib/map-coordinates.js";
import type { Place } from "../planner/types";
import { usePlaceDialogFocus } from "../planner/hooks/usePlaceDialogFocus";
import styles from "./FestivalAmenities.module.css";

type AmenityLayer = "rest" | "restroom";
type Amenity = { id: string; name: string; latitude: number; longitude: number };

const GYEONGNAM_CENTRE = { lat: 35.238, lng: 128.692 };
const AMENITY_NAMES: Record<AmenityLayer, string[]> = {
  rest: ["예시 쉼터 A", "예시 쉼터 B", "예시 쉼터 C"],
  restroom: ["예시 화장실 A", "예시 화장실 B", "예시 화장실 C"],
};
const OFFSETS: Record<AmenityLayer, Array<[number, number]>> = {
  rest: [[0.00135, -0.0016], [-0.0011, 0.00125], [0.0004, 0.0021]],
  restroom: [[0.0018, 0.0008], [-0.00155, -0.0012], [0.00025, -0.00225]],
};

function exampleAmenities(placeId: string, layer: AmenityLayer, centre: { lat: number; lng: number }): Amenity[] {
  const seed = [...placeId].reduce((total, character) => total + character.charCodeAt(0), 0);
  const direction = seed % 2 ? 1 : -1;
  return AMENITY_NAMES[layer].map((name, index) => {
    const [latitude, longitude] = OFFSETS[layer][index];
    return { id: `${layer}-${index + 1}`, name, latitude: centre.lat + latitude * direction, longitude: centre.lng + longitude * direction };
  });
}

function FestivalAmenityMap({ place }: { place: Place }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerGroupRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [layer, setLayer] = useState<AmenityLayer>("rest");
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const descriptionId = useId();
  const officialPoint = useMemo(() => supportedPlacePoint(place.mapX, place.mapY), [place.mapX, place.mapY]);
  const centre = officialPoint || GYEONGNAM_CENTRE;
  const amenities = useMemo(() => exampleAmenities(place.id, layer, centre), [centre, layer, place.id]);

  useEffect(() => {
    let cancelled = false;
    async function initialise() {
      try {
        const L = await import("leaflet");
        if (cancelled || !mapContainerRef.current) return;
        const map = L.map(mapContainerRef.current, { zoomControl: false, scrollWheelZoom: true, keyboard: true, attributionControl: true }).setView([centre.lat, centre.lng], 16, { animate: false });
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
        mapRef.current = map;
        markerGroupRef.current = L.layerGroup().addTo(map);
        leafletRef.current = L;
        setMapReady(true);
        requestAnimationFrame(() => map.invalidateSize({ animate: false }));
      } catch {
        if (!cancelled) setMapError(true);
      }
    }
    void initialise();
    return () => {
      cancelled = true;
      setMapReady(false);
      markerGroupRef.current = null;
      leafletRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [centre.lat, centre.lng]);

  useEffect(() => {
    const L = leafletRef.current;
    const markerGroup = markerGroupRef.current;
    if (!mapReady || !L || !markerGroup) return;
    markerGroup.clearLayers();
    for (const amenity of amenities) {
      const accessibleName = `[시연용 임의 위치] ${amenity.name}`;
      const icon = L.divIcon({
        className: styles.markerIcon,
        html: `<span class="${styles.markerPin}" data-amenity-marker="${layer}" aria-hidden="true"></span>`,
        iconSize: [44, 48], iconAnchor: [22, 46], popupAnchor: [0, -42],
      });
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${amenity.name} · 시연용 임의 위치`;
      popup.append(title);
      const marker = L.marker([amenity.latitude, amenity.longitude], { icon, title: accessibleName, alt: accessibleName, keyboard: true }).addTo(markerGroup).bindPopup(popup);
      const element = marker.getElement();
      element?.setAttribute("role", "button");
      element?.setAttribute("aria-label", accessibleName);
    }
  }, [amenities, layer, mapReady]);

  return <section className={styles.panel} aria-labelledby={descriptionId}>
    <div className={styles.demoNotice} role="note"><strong>[시연용 예시 지도]</strong><span>빨간 마커는 기능 시연을 위한 임의 위치이며 실제 시설 위치가 아닙니다.</span></div>
    <h3 id={descriptionId}>쉬는 곳·화장실 지도 시연</h3>
    <p>축제 현장에서 편의시설 위치를 확인하는 기능을 예시 데이터로 체험할 수 있어요.</p>
    <div className={styles.layerButtons} role="group" aria-label="지도에 표시할 시연 편의시설">
      <button type="button" aria-pressed={layer === "rest"} onClick={() => setLayer("rest")}>예시 쉬는 곳</button>
      <button type="button" aria-pressed={layer === "restroom"} onClick={() => setLayer("restroom")}>예시 화장실</button>
    </div>
    {!officialPoint && <p className={styles.coordinateNotice}>축제 좌표가 없어 경남 중심을 기준으로 시연 지도를 표시합니다.</p>}
    <div className={styles.mapFrame}>
      <div ref={mapContainerRef} className={styles.map} data-testid="festival-amenity-map" role="region" aria-label={`${place.name} ${layer === "rest" ? "쉬는 곳" : "화장실"} 시연용 임의 위치 지도`} />
      <span className={styles.mapDemoBadge} aria-hidden="true">시연 · 임의 위치</span>
      {!mapReady && !mapError && <p className={styles.mapStatus} role="status">지도를 불러오고 있어요.</p>}
      {mapError && <p className={styles.mapStatus} role="alert">지도를 불러오지 못했어요.</p>}
    </div>
    <p className={styles.disclaimer}>실제 방문 전에는 반드시 축제 주최 측의 공식 현장 지도와 편의시설 운영 여부를 확인해 주세요.</p>
  </section>;
}

export default function FestivalAmenities({ place }: { place: Place }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>현장 편의 지도 · 시연</button>
    {open && <FestivalAmenityDialog place={place} onClose={close} />}
  </>;
}

function FestivalAmenityDialog({ place, onClose }: { place: Place; onClose: () => void }) {
  const dialog = usePlaceDialogFocus(true, onClose);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={`festival-amenity-title-${place.id}`} data-testid="festival-amenity-dialog">
    <header className={styles.dialogHeader}>
      <h2 id={`festival-amenity-title-${place.id}`} tabIndex={-1}>[시연] {place.name} 현장 편의 예시 지도</h2>
      <button type="button" aria-label="현장 편의 지도 닫기" onClick={onClose}>×</button>
    </header>
    <FestivalAmenityMap place={place} />
  </dialog>;
}
