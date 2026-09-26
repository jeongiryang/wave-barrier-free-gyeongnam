'use client';
import { useEffect, useRef, useState } from 'react';
import { regionNames } from '../../../lib/gyeongnam-region-names';
import { safeTourismImageUrl } from '../../tourism/image-url';

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
      if (!response.ok) return null;
      const result = await response.json();
      const image = safeTourismImageUrl(result.image);
      // Never dress a statistical candidate with a different attraction's photo.
      if (!image || typeof result.matchedTitle !== 'string' || normalize(result.matchedTitle) !== normalize(title)) return null;
      return { image, source: '한국관광공사' };
    } catch { return null; }
    finally { active--; waiting.shift()?.(); }
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
  useEffect(() => {
    let mounted = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void loadPhoto(title, region).then(value => { if (mounted) setPhoto(value); });
    }, { rootMargin: '100px' });
    if (root.current) observer.observe(root.current);
    return () => { mounted = false; observer.disconnect(); };
  }, [title, region]);
  return <span ref={root} className="official-exploration-photo" data-loaded={loaded}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo && <img src={photo.image} alt="" loading="lazy" decoding="async" onLoad={() => setLoaded(true)} onError={() => { setPhoto(null); setLoaded(false); }} />}
    {photo && loaded && <small className="official-photo-credit">사진 · {photo.source}</small>}
  </span>;
}
