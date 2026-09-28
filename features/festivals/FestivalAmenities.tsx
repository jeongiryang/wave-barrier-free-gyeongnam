"use client";
import { evidenceDate } from '../../lib/evidence-date.js';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supportedPlacePoint } from "../../lib/map-coordinates.js";
import { festivalWebsite } from "../../lib/festival-links.js";
import { readFestivalAmenities, type FestivalAmenitiesResult } from "../../lib/festival-amenities.js";
import { CLIENT_BUDGET_MS } from "../../lib/request-budget.js";
import type { Place } from "../planner/types";
import { plannerJson } from "../planner/services/api";
import { usePlaceDialogFocus } from "../planner/hooks/usePlaceDialogFocus";
import NightIcon from "../../components/NightIcon";
import LocalAmenityPreview from '../planner/components/LocalAmenityPreview';
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
      const festivalPin = document.createElement('span');
      festivalPin.className = styles.festivalPin;
      festivalPin.setAttribute('aria-hidden', 'true');
      const festivalIcon = L.divIcon({ className: styles.markerIcon, html: festivalPin, iconSize: [44, 44], iconAnchor: [22, 22] });
      const festivalName = `${name} · 축제 위치`;
      const festivalMarker = L.marker([point.lat, point.lng], { icon: festivalIcon, title: festivalName, alt: festivalName }).addTo(map);
      const festivalLabel = document.createElement('strong');
      festivalLabel.textContent = name;
      festivalMarker.bindPopup(festivalLabel);
      festivalMarker.getElement()?.setAttribute('role', 'button');
      festivalMarker.getElement()?.setAttribute('aria-label', festivalName);
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
  }, [point, items, name]);
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
    <LocalAmenityPreview place={place} festival/>
    <div className={styles.intro}><span className={styles.eyebrow}>방문 전에 살펴보세요</span><h3>가까운 편의시설 찾기</h3><p>축제 장소 주변 5km의 등록 정보를 모았어요. 축제장 내부 시설과 현재 운영 여부는 별도로 확인해 주세요.</p></div>
    <div className={styles.layerButtons} role="group" aria-label="확인할 편의시설">
      <button type="button" aria-pressed={layer === 'restroom'} onClick={() => setLayer('restroom')}>화장실</button>
      <button type="button" aria-pressed={layer === 'rest'} onClick={() => setLayer('rest')}>쉬는 곳</button>
    </div>
    {layer === 'rest' ? <div className={styles.emptyState} role="status"><NightIcon name="map" size={32}/><strong>쉬는 곳은 주최 측 안내가 필요해요</strong><p>쉼터의 공식 위치는 확인되지 않았어요. 축제 주최 측에 쉬는 곳과 이용 조건을 문의해 주세요.</p></div> : <>
      <div className={styles.resultHeading}><h3>주변 공중화장실</h3>{result?.status === 'available' && <span>확인된 후보 {result.items.length}곳</span>}</div>
      {!canLocate ? <div className={styles.emptyState} role="status"><NightIcon name="map" size={32}/><strong>축제 위치를 먼저 확인해 주세요</strong><p>축제의 공식 위치를 확인할 수 없어 주변 화장실 지도를 표시하지 않아요. 축제 주최 측에 위치를 문의해 주세요.</p></div>
        : !result ? <div className={styles.emptyState} role="status"><NightIcon name="map" size={32}/><strong>주변 편의시설을 찾고 있어요</strong><p>등록된 주변 화장실을 확인하고 있어요.</p></div>
        : result.status === 'error' ? <div className={styles.emptyState} role="alert"><NightIcon name="map" size={32}/><strong>지금은 정보를 불러오지 못했어요</strong><p>주변 화장실 정보를 확인하지 못했어요. 조회 실패는 시설이 없다는 뜻이 아닙니다.</p><button className={styles.retry} type="button" onClick={() => { setResult(null); setRetry(value => value + 1); }}>다시 확인</button></div>
        : <>
          <p className={styles.evidence}>{result.source} · 자료 확인일 {evidenceDate(result.checkedAt)}</p>
          {result.status === 'empty' ? <div className={styles.emptyState} role="status"><NightIcon name="map" size={32}/><strong>공식 현장 안내를 확인해 주세요</strong><p>5km 안에 확인된 화장실 기록이 없어요. 주변에 화장실이 없다는 뜻은 아닙니다.</p></div> : <>
            {point && <RestroomMap point={point} items={result.items} name={place.name} />}
            <p className={styles.legend}><span>◆ 축제 위치</span><span>● 등록 공중화장실</span></p>
            <ul className={styles.facilities} aria-label="지도와 같은 공중화장실 목록">
              {result.items.map(item => <li key={item.id} data-amenity-list-id={item.id}>
                <div className={styles.resultHeading}><h4>{item.name}</h4><span>직선거리 {distanceText(item.distanceFromPlaceMeters)}</span></div><p>{item.address}</p>
                <p>장애인 화장실 등록 · 현재 운영 여부는 방문 전에 확인해 주세요.</p>
                {item.openingHours && <p>등록 운영시간: {item.openingHours}</p>}
                {item.phoneNumber && <a href={`tel:${item.phoneNumber}`}>문의 전화 · {item.phoneNumber}</a>}
                <details className={styles.recordDetails}><summary>출처와 이용 전 확인사항</summary><p>실제 이동 경로와 입구·문·이동 공간 등 상세 조건은 별도로 확인해 주세요.</p>{item.sources.filter(source => source.type === 'official').map((source, index) => <small key={index}>{source.provider} · 기준일 {source.referenceDate}</small>)}</details>
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
    <button type="button" className="festival-icon-action" aria-label="현장 편의 지도" onClick={() => setOpen(true)}><NightIcon name="map"/></button>
    {open && <FestivalAmenityDialog place={place} onClose={close} />}
  </>;
}

function FestivalAmenityDialog({ place, onClose }: { place: FestivalPlace; onClose: () => void }) {
  const dialog = usePlaceDialogFocus(true, onClose);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={`festival-amenity-title-${place.id}`} data-testid="festival-amenity-dialog">
    <header className={styles.dialogHeader}>
      <h2 id={`festival-amenity-title-${place.id}`} tabIndex={-1}>{place.name} 현장 편의 정보</h2>
      <button type="button" aria-label="현장 편의 지도 닫기" onClick={onClose} data-icon-action="" title="닫기"><NightIcon name="close" size={20}/><span className="sr-only">닫기</span></button>
    </header>
    <FestivalAmenityDetails key={`${place.id}:${place.mapX}:${place.mapY}`} place={place} onClose={onClose} />
  </dialog>;
}
