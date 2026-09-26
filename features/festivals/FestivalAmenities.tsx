"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supportedPlacePoint } from "../../lib/map-coordinates.js";
import { festivalWebsite } from "../../lib/festival-links.js";
import { readFestivalAmenities, type FestivalAmenitiesResult } from "../../lib/festival-amenities.js";
import { CLIENT_BUDGET_MS } from "../../lib/request-budget.js";
import type { Place } from "../planner/types";
import { plannerJson } from "../planner/services/api";
import { usePlaceDialogFocus } from "../planner/hooks/usePlaceDialogFocus";
import styles from "./FestivalAmenities.module.css";

type FestivalPlace = Place & { websiteUrl?: string; officialUrl?: string; phone?: string };
const distanceText = (metres: number) => metres < 1000 ? `${Math.round(metres)}m` : `${(metres / 1000).toFixed(1)}km`;

function RestroomMap({ point, items, name }: { point: { lat: number; lng: number }; items: FestivalAmenitiesResult['items']; name: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let cancelled = false, frame = 0;
    let map: import('leaflet').Map | null = null;
    void import('leaflet').then(L => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false, keyboard: true, zoomControl: false });
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      for (const item of items) {
        const pin = document.createElement('span');
        pin.className = styles.markerPin;
        pin.dataset.amenityMarker = 'restroom';
        pin.dataset.amenityId = item.id;
        pin.setAttribute('aria-hidden', 'true');
        const popup = document.createElement('div');
        popup.style.color = '#173b50';
        const title = document.createElement('strong');
        title.textContent = item.name;
        const address = document.createElement('p');
        address.textContent = item.address;
        popup.append(title, address);
        const accessibleName = `${item.name} · 등록된 공중화장실`;
        const icon = L.divIcon({ className: styles.markerIcon, html: pin, iconSize: [44, 44], iconAnchor: [22, 22] });
        const marker = L.marker([item.destination.latitude, item.destination.longitude], { icon, title: accessibleName, alt: accessibleName, keyboard: true }).addTo(map).bindPopup(popup);
        marker.getElement()?.setAttribute('role', 'button');
        marker.getElement()?.setAttribute('aria-label', accessibleName);
      }
      map.fitBounds(L.latLngBounds([[point.lat, point.lng], ...items.map(item => [item.destination.latitude, item.destination.longitude] as [number, number])]), { padding: [32, 32], maxZoom: 16, animate: false });
      setState('ready');
      frame = requestAnimationFrame(() => { if (!cancelled) map?.invalidateSize({ animate: false }); });
    }).catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; cancelAnimationFrame(frame); map?.remove(); };
  }, [point, items]);
  return <div className={styles.mapFrame}>
    <div ref={container} className={styles.map} data-testid="festival-amenity-map" role="region" aria-label={`${name} 주변 등록 공중화장실 지도`} />
    {state === 'loading' && <p className={styles.mapStatus} role="status">지도를 불러오고 있어요.</p>}
    {state === 'error' && <p className={styles.mapStatus} role="alert">지도를 불러오지 못했어요. 아래 목록에서 위치를 확인해 주세요.</p>}
  </div>;
}

function FestivalAmenityDetails({ place, onClose }: { place: FestivalPlace; onClose: () => void }) {
  const [layer, setLayer] = useState<'restroom' | 'rest'>('restroom');
  const [result, setResult] = useState<FestivalAmenitiesResult | null>(null);
  const [retry, setRetry] = useState(0);
  const point = useMemo(() => supportedPlacePoint(place.mapX, place.mapY), [place.mapX, place.mapY]);
  const canLocate = Boolean(point && /^[1-9]\d{0,11}$/.test(place.id));
  const officialLink = festivalWebsite(place.websiteUrl) || festivalWebsite(place.officialUrl);
  useEffect(() => {
    if (!canLocate) return;
    const controller = new AbortController();
    void plannerJson<unknown>(`/api/wave?action=restroom-alternatives&contentId=${encodeURIComponent(place.id)}&radiusKm=5`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.restroomAlternatives })
      .then(body => { if (!controller.signal.aborted) setResult(readFestivalAmenities(body, place.id)); })
      .catch(() => { if (!controller.signal.aborted) setResult({ status: 'error', items: [], source: '', checkedAt: '' }); });
    return () => controller.abort();
  }, [canLocate, place.id, retry]);
  return <section className={styles.panel} aria-label="축제 주변 편의 정보">
    <p>축제 장소 주변 5km 안에서 확인한 공중화장실입니다. 축제장 내부 시설이나 현재 운영 여부를 뜻하지 않습니다.</p>
    <div className={styles.layerButtons} role="group" aria-label="확인할 편의시설">
      <button type="button" aria-pressed={layer === 'restroom'} onClick={() => setLayer('restroom')}>화장실</button>
      <button type="button" aria-pressed={layer === 'rest'} onClick={() => setLayer('rest')}>쉬는 곳</button>
    </div>
    {layer === 'rest' ? <p role="status">쉼터의 공식 위치는 확인되지 않았어요. 축제 주최 측에 쉬는 곳과 이용 조건을 문의해 주세요.</p> : <>
      <h3>주변 공중화장실</h3>
      {!canLocate ? <p role="status">축제의 공식 위치를 확인할 수 없어 주변 화장실 지도를 표시하지 않아요. 축제 주최 측에 위치를 문의해 주세요.</p>
        : !result ? <p role="status">등록된 주변 화장실을 확인하고 있어요.</p>
        : result.status === 'error' ? <div role="alert"><p>주변 화장실 정보를 확인하지 못했어요. 조회 실패는 시설이 없다는 뜻이 아닙니다.</p><button className={styles.retry} type="button" onClick={() => { setResult(null); setRetry(value => value + 1); }}>다시 확인</button></div>
        : <>
          <p className={styles.evidence}>{result.source} · 자료 확인일 {result.checkedAt.slice(0, 10)}</p>
          {result.status === 'empty' ? <p role="status">5km 안에 확인된 화장실 기록이 없어요. 주변에 화장실이 없다는 뜻은 아닙니다.</p> : <>
            {point && <RestroomMap point={point} items={result.items} name={place.name} />}
            <ul className={styles.facilities} aria-label="지도와 같은 공중화장실 목록">
              {result.items.map(item => <li key={item.id} data-amenity-list-id={item.id}>
                <h4>{item.name}</h4><p>{item.address}</p>
                <p>축제 장소에서 직선거리 {distanceText(item.distanceFromPlaceMeters)} · 실제 이동 경로는 별도 확인</p>
                {item.sources.filter(source => source.type === 'official').map((source, index) => <small key={index}>{source.provider} · 기준일 {source.referenceDate}</small>)}
                <p>장애인 화장실 등록 정보가 있어요. 입구·문·이동 공간 등 상세 조건과 현재 운영 여부는 방문 전에 확인해 주세요.</p>
                {item.openingHours && <p>등록 운영시간: {item.openingHours}</p>}
                {item.phoneNumber && <a href={`tel:${item.phoneNumber}`}>문의 전화 · {item.phoneNumber}</a>}
              </li>)}
            </ul>
          </>}
        </>}
    </>}
    <aside className={styles.official} aria-label="축제 공식 안내">
      <p>실제 방문 전에는 축제 주최 측의 공식 현장 지도와 편의시설 운영 여부를 확인해 주세요.</p>
      {officialLink && <a href={officialLink} target="_blank" rel="noopener noreferrer">축제 공식 안내 열기</a>}
      {place.phone && <p>행사 문의: {place.phone}</p>}
      <button type="button" onClick={onClose}>축제 정보로 돌아가기</button>
    </aside>
  </section>;
}

export default function FestivalAmenities({ place }: { place: FestivalPlace }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>현장 편의 지도</button>
    {open && <FestivalAmenityDialog place={place} onClose={close} />}
  </>;
}

function FestivalAmenityDialog({ place, onClose }: { place: FestivalPlace; onClose: () => void }) {
  const dialog = usePlaceDialogFocus(true, onClose);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={`festival-amenity-title-${place.id}`} data-testid="festival-amenity-dialog">
    <header className={styles.dialogHeader}>
      <h2 id={`festival-amenity-title-${place.id}`} tabIndex={-1}>{place.name} 현장 편의 정보</h2>
      <button type="button" aria-label="현장 편의 지도 닫기" onClick={onClose}>×</button>
    </header>
    <FestivalAmenityDetails key={`${place.id}:${place.mapX}:${place.mapY}`} place={place} onClose={onClose} />
  </dialog>;
}
