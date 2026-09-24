import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type Photo = { id: string; title: string; address: string; image: string; source: string };
const Photos = createContext<Photo[]>([]);

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
      setPhotos(data.awards.filter((p: Photo) => p && typeof p.address === 'string'
        && /경상남도|경남/.test(p.address) && p.source === '관광공모전 수상작'
        && typeof p.image === 'string' && /^https:\/\/tong\.visitkorea\.or\.kr\//.test(p.image)).slice(0, 8));
    }).catch(() => { /* Keep the readable gradient when the provider is unavailable. */ });
    return () => controller.abort();
  }, []);
  return <Photos.Provider value={photos}>{children}</Photos.Provider>;
}

export default function AwardPanorama({ closing = false }: { closing?: boolean }) {
  const photos = useContext(Photos);
  return <PhotoPanorama photos={photos} closing={closing} />;
}

export function PhotoPanorama({ photos, closing = false, credit = true }: { photos: Photo[]; closing?: boolean; credit?: boolean }) {
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
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => { query.removeEventListener('change', update); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (reduced || !visible || available.length < 2) return;
    const timer = setInterval(() => {
      if (!document.hidden && ready.includes(available[(active + 1) % available.length].image)) setIndex(active + 1);
    }, 9000);
    return () => clearInterval(timer);
  }, [reduced, visible, available, active, ready]);
  return <div ref={root} className="award-panorama" data-paused={reduced || !visible}>
    <div className="award-panorama-images" aria-hidden="true">
      {available.map((photo, i) => <img key={photo.image} src={photo.image} alt="" decoding="async"
        loading={closing ? 'lazy' : 'eager'} className={i === active && ready.includes(photo.image) ? 'is-current' : ''}
        onLoad={() => setReady(previous => previous.includes(photo.image) ? previous : [...previous, photo.image])}
        onError={() => setFailed(previous => [...previous, photo.image])} />)}
    </div>
    {credit && current && ready.includes(current.image) && <div className="award-panorama-credit">
      <span><strong>{current.title}</strong><small>{current.address} · 한국관광공사 관광공모전</small></span>
    </div>}
  </div>;
}
