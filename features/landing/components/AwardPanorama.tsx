import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { rememberPhotoCredits } from '../photo-credit-store';

export type Photo = { id: string; title: string; address: string; image: string; source: string };
const Photos = createContext<Photo[]>([]);
export const useAwardPhotos = () => useContext(Photos);

export function AwardPhotoProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    // The existing server calls KTO PhokoAwrdService; no keys or saved photo list in the client.
    fetch('/api/wave?action=enrich&region=' + encodeURIComponent('경남 전체'), {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
    }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (controller.signal.aborted || !Array.isArray(data.awards)) return;
      const seen = new Set<string>();
      const pool: Photo[] = data.awards.filter((p: Photo) => p && typeof p.address === 'string'
        && /경상남도|경남/.test(p.address) && p.source === '관광공모전 수상작'
        && typeof p.image === 'string' && /^https:\/\/tong\.visitkorea\.or\.kr\//.test(p.image)
        && !seen.has(p.image) && seen.add(p.image)).slice(0, 8);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      setPhotos(pool);
      rememberPhotoCredits(pool.map(photo => ({ ...photo, location: photo.address })));
    }).catch(() => { /* Keep the readable gradient when the provider is unavailable. */ });
    return () => controller.abort();
  }, []);
  return <Photos.Provider value={photos}>{children}</Photos.Provider>;
}

export default function AwardPanorama({ closing = false }: { closing?: boolean }) {
  const photos = useContext(Photos);
  return <PhotoPanorama photos={photos} closing={closing} shuffle intervalMs={4500} />;
}

export function PhotoPanorama({ photos, closing = false, credit = true, shuffle = false, intervalMs = 9000 }: { photos: Photo[]; closing?: boolean; credit?: boolean; shuffle?: boolean; intervalMs?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(closing ? 2 : 0);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [ready, setReady] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const available = useMemo(() => photos.filter(photo => !failed.includes(photo.image)), [photos, failed]);
  const active = available.length ? index % available.length : 0;
  const current = available[active];
  useEffect(() => {
    // Cached SSR images may finish before React attaches onLoad.
    const loaded = Array.from(root.current?.querySelectorAll('img') || []).filter(image => image.complete && image.naturalWidth > 0).map(image => image.getAttribute('src') || '');
    setReady(previous => [...new Set([...previous, ...loaded])]);
  }, [photos]);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener('change', update);
    if (!window.IntersectionObserver) {
      // A static, readable photograph is preferable to a crashed page.
      return () => query.removeEventListener('change', update);
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => { query.removeEventListener('change', update); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (reduced || !visible || available.length < 2) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      if (shuffle) {
        const candidates = available.map((photo, i) => ({ photo, i })).filter(({ photo, i }) => i !== active && ready.includes(photo.image));
        if (candidates.length) setIndex(candidates[Math.floor(Math.random() * candidates.length)].i);
      } else if (ready.includes(available[(active + 1) % available.length].image)) setIndex(active + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [reduced, visible, available, active, ready, shuffle, intervalMs]);
  return <div ref={root} className="award-panorama" data-paused={reduced || !visible}>
    <div className="award-panorama-images" aria-hidden="true">
      {available.map((photo, i) => <img key={photo.image} src={photo.image} alt="" decoding="async"
        loading={closing ? 'lazy' : 'eager'} className={i === active && ready.includes(photo.image) ? 'is-current' : ''}
        onLoad={() => setReady(previous => previous.includes(photo.image) ? previous : [...previous, photo.image])}
        onError={() => setFailed(previous => [...previous, photo.image])} />)}
    </div>
    {credit && current && ready.includes(current.image) && <div className="award-panorama-credit">
      <span><strong>{current.title}</strong><small>{current.address}</small></span>
    </div>}
  </div>;
}
