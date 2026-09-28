'use client';
import { useEffect, useRef, useState } from 'react';
import type { Place } from '../types';
import { supportedPlacePoint } from '../../../lib/map-coordinates.js';

/** Local-only, separately labelled mock facilities. Never public evidence or saved observations. */
export default function LocalAmenityPreview({ place, festival = false }: { place: Place; festival?: boolean }) {
  const [enabled, setEnabled] = useState(false), [layer, setLayer] = useState('restroom');
  useEffect(() => { const frame = requestAnimationFrame(() => setEnabled(import.meta.env.DEV && ['localhost','127.0.0.1'].includes(location.hostname))); return () => cancelAnimationFrame(frame); }, []);
  const options = festival ? [['restroom','화장실'],['rest','쉬는 곳']] : [['mobility','휠체어 이동'],['restroom','화장실']];
  if (!enabled) return null;
  return <section className="local-amenity-preview" aria-label="로컬 시설 시연"><h3>시설 지도 시연</h3><p>시연용 임의 위치와 시설입니다. 실제 시설·현재 운영·휠체어 통행을 확인한 정보가 아니며 방문에 사용하지 마세요.</p><div className="travel-book-actions">{options.map(([key,label]) => <button type="button" key={key} aria-pressed={layer === key} onClick={() => setLayer(key)}>{label} 시연</button>)}</div><PreviewMap key={`${place.id}:${layer}`} place={place} label={options.find(([key]) => key === layer)![1]}/><ul>{[1,2].map(index => <li key={index}>[시연] {options.find(([key]) => key === layer)![1]} {index} · 임의 위치 · 실제 정보 아님</li>)}</ul></section>;
}

function PreviewMap({ place, label }: { place: Place; label: string }) {
  const field = useRef<HTMLDivElement>(null), [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false; let map: import('leaflet').Map | null = null;
    const point = supportedPlacePoint(place.mapX, place.mapY) || { lat:35.18, lng:128.1 };
    void import('leaflet').then(L => {
      if (cancelled || !field.current) return;
      map = L.map(field.current, { scrollWheelZoom:false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'&copy; OpenStreetMap contributors', maxZoom:18 }).addTo(map);
      [1,2].forEach(index => {
        const pin = document.createElement('span'); pin.className = 'local-red-location-pin';
        const title = `[시연] ${label} ${index} · 실제 위치 아님`;
        const text = document.createElement('p'); text.textContent = title;
        L.marker([point.lat + index*0.0015, point.lng + index*0.0018], { icon:L.divIcon({html:pin,className:'local-amenity-marker',iconSize:[44,44],iconAnchor:[22,44]}),title,alt:title }).addTo(map!).bindPopup(text);
      });
      map.setView([point.lat + .002,point.lng + .002],15);
      requestAnimationFrame(() => { if (!cancelled) map?.invalidateSize(); });
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; map?.remove(); };
  }, [place.mapX,place.mapY,label]);
  return <><div ref={field} className="local-amenity-map" role="region" aria-label={`${label} 시연 위치 지도`}/>{error && <p role="status">지도를 열지 못했어요. 아래 시연 목록을 확인해 주세요.</p>}</>;
}
