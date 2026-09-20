"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { supportedPlacePoint } from "../../lib/map-coordinates.js";
import type { Place } from "../planner/types";
import styles from "./FestivalAmenities.module.css";

type AmenityLayer = "rest" | "restroom";
type Amenity = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const GYEONGNAM_CENTRE = { lat: 35.238, lng: 128.692 };
const AMENITY_NAMES: Record<AmenityLayer, string[]> = {
  rest: ["입구 벤치", "행사장 벤치", "휴게 편의시설"],
  restroom: ["컨테이너 화장실", "공중화장실", "장애인 이용 화장실"],
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
    return {
      id: `${layer}-${index + 1}`,
      name,
      latitude: centre.lat + latitude * direction,
      longitude: centre.lng + longitude * direction,
    };
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
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          scrollWheelZoom: true,
          keyboard: true,
          attributionControl: true,
        }).setView([centre.lat, centre.lng], 16, { animate: false });
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        mapRef.current = map;
        markerGroupRef.current = L.layerGroup().addTo(map);
        leafletRef.current = L;
        setMapReady(true);
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
      const accessibleName = `${layer === "rest" ? "쉬는 곳" : "화장실"} ${amenity.name}`;
      const icon = L.divIcon({
        className: styles.markerIcon,
        html: `<span class="${styles.markerPin}" data-amenity-marker="${layer}" aria-hidden="true"></span>`,
        iconSize: [44, 48],
        iconAnchor: [22, 46],
        popupAnchor: [0, -42],
      });
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = amenity.name;
      popup.append(title);
      const marker = L.marker([amenity.latitude, amenity.longitude], {
        icon,
        title: accessibleName,
        alt: accessibleName,
        keyboard: true,
      }).addTo(markerGroup).bindPopup(popup);
      const element = marker.getElement();
      element?.setAttribute("role", "button");
      element?.setAttribute("aria-label", accessibleName);
    }
  }, [amenities, layer, mapReady]);

  return <section className={styles.panel} aria-labelledby={descriptionId}>
    <h3 id={descriptionId}>감각지도·지금 현장</h3>
    <p>축제장 주변의 쉬는 곳과 화장실 예시를 지도에서 확인해 보세요.</p>
    <div className={styles.layerButtons} role="group" aria-label="지도에 표시할 편의시설">
      <button type="button" aria-pressed={layer === "rest"} onClick={() => setLayer("rest")}>쉬는 곳</button>
      <button type="button" aria-pressed={layer === "restroom"} onClick={() => setLayer("restroom")}>화장실</button>
    </div>
    {!officialPoint && <p className={styles.coordinateNotice}>축제 좌표를 확인하지 못해 경남 중심의 예시 지도를 보여드려요.</p>}
    <div className={styles.mapFrame}>
      <div
        ref={mapContainerRef}
        className={styles.map}
        data-testid="festival-amenity-map"
        role="region"
        aria-label={`${place.name} 주변 ${layer === "rest" ? "쉬는 곳" : "화장실"} 예시 지도`}
      />
      {!mapReady && !mapError && <p className={styles.mapStatus} role="status">지도를 불러오고 있어요.</p>}
      {mapError && <p className={styles.mapStatus} role="alert">지도를 불러오지 못했어요.</p>}
    </div>
    <p className={styles.disclaimer}>임의의 데이터를 사용하여 표시한 마크입니다. 실제 지도를 확인해 주세요.</p>
  </section>;
}

export default function FestivalAmenities({ place }: { place: Place }) {
  const [open, setOpen] = useState(false);
  return <details className="place-evidence" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>지금 현장·감각 정보</summary>
    {open && <FestivalAmenityMap place={place} />}
  </details>;
}
