'use client';
import { useEffect, useRef, useState } from 'react';
import { rememberPhotoCredits } from '../../landing/photo-credit-store';
import { regionNames } from '../../../lib/gyeongnam-region-names';
import { safeTourismImageUrl } from '../../tourism/image-url';
import NightIcon from '../../../components/NightIcon';

type Photo = { image: string; source: string };
const cache = new Map<string, { value: Promise<Photo | null>; expires: number }>();
let active = 0;
const waiting: Array<() => void> = [];
const normalize = (value: string) => value.toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}]/gu, '');
async function loadPhoto(title: string, scope: string) {
  const region = scope.replace(/^(경상남도|경남)\s*/, '').split(/\s/)[0].replace(/[시군]$/, '');
  if (!regionNames[region]) return null;
  const key = `${region}:${title}`;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.value;
  const value = (async () => {
    if (active >= 3) await new Promise<void>(resolve => waiting.push(resolve));
    active++;
    try {
      const params = new URLSearchParams({ action: 'spot-photo', strict: '1', title, region });
      const response = await fetch(`/api/wave?${params}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Photo lookup unavailable');
      const result = await response.json();
      const image = safeTourismImageUrl(result.image);
      // Never dress a statistical candidate with a different attraction's photo.
      if (!image || typeof result.matchedTitle !== 'string' || normalize(result.matchedTitle) !== normalize(title)) return null;
      return { image, source: '한국관광공사' };
    } finally { active--; waiting.shift()?.(); }
  })();
  cache.set(key, { value, expires: Date.now() + 300000 });
  return value;
}
export default function OfficialExplorationPhoto({ title, region }: { title: string; region: string }) {
  return <PhotoFrame key={`${region}:${title}`} title={title} region={region} />;
}
function PhotoFrame({ title, region }: { title: string; region: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const [photo, setPhoto] = useState<Photo | null>(null), [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading');
  useEffect(() => {
    let mounted = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void loadPhoto(title, region).then(value => { if (mounted) { setPhoto(value); if (value) rememberPhotoCredits([{ ...value, title, location: region }]); else setStatus('empty'); } }).catch(() => { if (mounted) setStatus('error'); });
    }, { rootMargin: '100px' });
    if (root.current) observer.observe(root.current);
    return () => { mounted = false; observer.disconnect(); };
  }, [title, region]);
  return <span ref={root} className="official-exploration-photo" data-loaded={loaded} data-status={status}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo && <img src={photo.image} alt={`${title} 관광사진`} loading="lazy" decoding="async" onLoad={() => { setLoaded(true); setStatus('ready'); }} onError={() => { setPhoto(null); setLoaded(false); setStatus('error'); }} />}
    {status !== 'ready' && <span className="official-photo-status" role="status"><NightIcon name={status === 'loading' ? 'refresh' : 'photo-off'} size={28}/><span>{status === 'loading' ? '사진 확인 중' : status === 'empty' ? '등록된 사진 없음' : '사진을 불러오지 못했어요'}</span></span>}
  </span>;
}
