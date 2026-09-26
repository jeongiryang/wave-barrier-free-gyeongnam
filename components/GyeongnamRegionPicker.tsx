"use client";

import { useId, useRef, useState, useEffect } from 'react';
import { useRegionApiPhotos } from '../features/landing/useRegionApiPhotos';
import { rememberPhotoCredits } from '../features/landing/photo-credit-store';
import { useSitePreferences } from './SitePreferences';
import { regionBoundaries } from '../features/landing/region-boundaries';
import { regionNames } from '../lib/gyeongnam-region-names';
import '../app/styles/region-preview.css';
export { regionNames } from '../lib/gyeongnam-region-names';

export default function GyeongnamRegionPicker({ value, onChange, includeAll = false, compact = false, night = false }: {
  value: string; onChange: (region: string) => void; includeAll?: boolean; compact?: boolean; night?: boolean; showDecliningInfo?: boolean;
}) {
  const clipPrefix = useId().replace(/:/g, '');
  const keyboardHintId = `${clipPrefix}-keyboard-hint`;
  const previewId = `${clipPrefix}-preview`;
  const root = useRef<HTMLDivElement>(null);
  const dismissed = useRef(false);
  const [preview, setPreview] = useState<{ name: string; x: number; y: number; below: boolean; maxHeight: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const photos = useRegionApiPhotos(regionBoundaries.map(region => region.name), visible);
  useEffect(() => {
    rememberPhotoCredits(Object.values(photos).flatMap(entry => entry.photo ? [{ ...entry.photo, source: '한국관광공사 관광사진' }] : []));
  }, [photos]);
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') {
      // Match the observer's asynchronous notification without requiring the API.
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: '200px' });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);
  const { locale } = useSitePreferences();
  const en = locale === 'en';
  const label = (name: string) => en ? regionNames[name] || name : name;
  const orderedNames = Object.keys(regionNames).filter(name => includeAll || name !== '경남 전체');
  const selected = (name: string) => value === '경남 전체' || value === name;
  const showPreview = (name: string, target: Element) => {
    if (dismissed.current) return;
    if (!regionBoundaries.some(region => region.name === name) || !root.current) { setPreview(null); return; }
    const rect = target.getBoundingClientRect(), parent = root.current.getBoundingClientRect();
    const half = Math.min(140, (parent.width - 16) / 2);
    const above = rect.top - 90, belowSpace = window.innerHeight - rect.bottom - 18;
    const below = above < 300 && belowSpace > above;
    setPreview({ name, x: Math.max(half + 8, Math.min(parent.width - half - 8, rect.left + rect.width / 2 - parent.left)), y: (below ? rect.bottom + 10 : rect.top - 10) - parent.top, below, maxHeight: Math.max(80, below ? belowSpace : above) });
  };
  useEffect(() => {
    const close = () => setPreview(null);
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && preview) { dismissed.current = true; close(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape, true);
    window.addEventListener('resize', close);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); window.removeEventListener('resize', close); };
  }, [preview]);
  const photo = preview ? photos[preview.name]?.photo : null;
  const map = <div className="region-picker-visual">
    <span>{en ? 'SOUTH KOREA · SOUTHEAST' : '대한민국 남동쪽, 경상남도'}</span>
    <svg viewBox="0 0 800 814" aria-label={en ? 'Gyeongnam city and county boundaries' : '경상남도 시·군 행정경계'}>
      {night && <defs>{regionBoundaries.map(r => <clipPath id={clipPrefix + r.name} key={r.name}><circle className="region-photo-clip" cx={r.x} cy={r.y - 25} r="25" /></clipPath>)}</defs>}
      {regionBoundaries.map(region => <g key={region.name} aria-hidden="true" onMouseEnter={event => showPreview(region.name, event.currentTarget)} onClick={event => { dismissed.current = false; onChange(region.name); showPreview(region.name, event.currentTarget); }}>
        <path data-region-boundary={region.name} data-selected={selected(region.name)} d={region.path} fillRule="evenodd" />
        {!night && <><circle cx={region.x} cy={region.y} r="5" />{selected(region.name) && <text x={region.x} y={region.y - 14} textAnchor="middle">{label(region.name)}</text>}</>}
      </g>)}
      {night && regionBoundaries.map(r => <g key={r.name} data-region-photo={r.name} aria-hidden="true" onMouseEnter={event => showPreview(r.name, event.currentTarget)} onClick={event => { dismissed.current = false; onChange(r.name); showPreview(r.name, event.currentTarget); }} style={{ cursor: 'pointer' }}>
        {photos[r.name]?.photo && !failedPhotos.includes(photos[r.name].photo!.image) && <image href={photos[r.name].photo!.image} onError={() => setFailedPhotos(previous => [...previous, photos[r.name].photo!.image])} x={r.x - 25} y={r.y - 50} width="50" height="50" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipPrefix + r.name})`} />}
        <circle className="night-map-photo-ring" cx={r.x} cy={r.y - 25} r="26" /><text x={r.x} y={r.y + 19} textAnchor="middle">{label(r.name)}</text>
      </g>)}
    </svg>
  </div>;
  return <div ref={root} className={`region-picker region-picker-preview${compact ? ' region-picker-compact' : ''}`} onMouseLeave={() => { dismissed.current = false; setPreview(null); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { dismissed.current = false; setPreview(null); } }}>
    {!compact && map}
    <div><p className="sr-only" id={keyboardHintId}>{en ? 'Use arrow keys to preview regions, then Enter to choose.' : '방향키로 지역 소개를 확인하고 Enter로 선택할 수 있습니다.'}</p>
      <div className="region-picker-list" role="group" aria-describedby={keyboardHintId} aria-label={en ? 'Choose a region' : '여행 지역 선택'}>{orderedNames.map((name, index) => <button type="button" key={name} tabIndex={value === name || (!orderedNames.includes(value) && index === 0) ? 0 : -1}
        onMouseEnter={event => showPreview(name, event.currentTarget)} onFocus={event => showPreview(name, event.currentTarget)}
        onClick={event => { dismissed.current = false; onChange(name); showPreview(name, event.currentTarget); }} onKeyDown={event => {
          const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? orderedNames.length - 1 : direction ? (index + direction + orderedNames.length) % orderedNames.length : -1;
          if (next < 0) return;
          event.preventDefault(); dismissed.current = false; event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus();
        }} aria-pressed={value === name} aria-describedby={preview?.name === name ? previewId : undefined}><span>{label(name)}{value === name && <span aria-hidden="true"> ✓</span>}</span></button>)}</div>
    </div>
    {compact && <details className="region-map-disclosure"><summary>{en ? 'See regions on the map' : '지도에서 지역 위치 보기'}</summary>{map}</details>}
    <small className="region-map-credit">{en ? 'SGIS 2020 · simplified boundaries / StatGarten' : '통계청 SGIS 2020 · 경계 단순화 / StatGarten'}</small>
    {preview && <div id={previewId} role="tooltip" className="region-photo-preview" data-below={preview.below} style={{ left: preview.x, top: preview.y, maxHeight: preview.maxHeight }}>
      {photo && !failedPhotos.includes(photo.image) && <img src={photo.image} alt={photo.title} onError={() => setFailedPhotos(previous => [...previous, photo.image])} />}
      <div><strong>{label(preview.name)}</strong>{photo ? <><p>{photo.title}</p><span>{photo.location}</span>{photo.description && <span>{photo.description}</span>}{failedPhotos.includes(photo.image) && <small>{en ? 'Photo unavailable' : '사진을 불러오지 못했어요'}</small>}</> : <p>{!photos[preview.name] ? (en ? 'Loading photo…' : '관광사진을 불러오는 중…') : photos[preview.name].state === 'empty' ? (en ? 'No photo provided.' : '제공된 관광사진이 없어요.') : (en ? 'Photo temporarily unavailable.' : '관광사진을 불러오지 못했어요.')}</p>}</div>
    </div>}
  </div>;
}
