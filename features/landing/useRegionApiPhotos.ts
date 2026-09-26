import { useEffect, useState } from 'react';

export type RegionApiPhoto = { title: string; image: string; location: string; photographer: string; description: string };
type Entry = { photo: RegionApiPhoto | null; state: 'loading' | 'ready' | 'empty' | 'error' };
const cache = new Map<string, { entry: Entry; expires: number }>();
const requests = new Map<string, Promise<Entry>>();
const text = (value: unknown) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';

async function decoded(url: string) {
  const image = new Image();
  image.src = url;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([image.decode(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Image timeout')), 10000); })]); }
  finally { clearTimeout(timer); }
}
function safeImage(value: string) {
  const image = new URL(value);
  if (image.protocol !== 'https:' || image.hostname !== 'tong.visitkorea.or.kr') throw new Error('Invalid photo');
  return image.href;
}
function load(region: string): Promise<Entry> {
  const saved = cache.get(region);
  if (saved && saved.expires > Date.now()) return Promise.resolve(saved.entry);
  const pending = requests.get(region);
  if (pending) return pending;
  const request = (async (): Promise<Entry> => {
    try {
      const response = await fetch('/api/wave?action=photo&region=' + encodeURIComponent(region), { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('Photo unavailable');
      let { photo } = await response.json();
      if (!photo) return { photo: null, state: 'empty' };
      let image = safeImage(photo.image);
      try { await decoded(image); } catch {
        const fallback = await fetch('/api/wave?action=spot-photo&strict=1&region=' + encodeURIComponent(region) + '&title=' + encodeURIComponent(photo.title), { signal: AbortSignal.timeout(30000) });
        if (!fallback.ok) throw new Error('Photo unavailable');
        const spot = await fallback.json();
        image = safeImage(spot.image);
        await decoded(image);
        photo = { title: spot.matchedTitle, location: spot.address, photographer: '한국관광공사' };
        // Only a confirmed tourist-place ID can be used for its published introduction.
        if (/^[1-9]\d{0,11}$/.test(spot.contentId || '')) {
          try {
            const details = await fetch('/api/wave?action=places&ids=' + spot.contentId, { signal: AbortSignal.timeout(12000) });
            if (details.ok) {
              const { places } = await details.json();
              const place = places?.find((item: { id: string; name: string }) => item.id === spot.contentId && item.name === spot.matchedTitle);
              if (place?.summary && place.summary !== place.address) photo.description = place.summary;
            }
          } catch { /* The decoded photo remains useful without an introduction. */ }
        }
      }
      return { state: 'ready', photo: { title: text(photo.title), image, location: text(photo.location), photographer: text(photo.photographer), description: text(photo.description || photo.overview) } };
    } catch { return { photo: null, state: 'error' }; }
  })().then(entry => {
    cache.set(region, { entry, expires: Date.now() + (entry.state === 'ready' ? 300000 : 15000) });
    requests.delete(region);
    return entry;
  });
  requests.set(region, request);
  return request;
}

// Reuse WAVE's existing KTO endpoint; gallery IDs are never used as tourist-place IDs.
export function useRegionApiPhotos(names: string[], enabled: boolean) {
  const [photos, setPhotos] = useState<Record<string, Entry>>({});
  const key = names.join(',');
  useEffect(() => {
    if (!enabled) return;
    let active = true, cursor = 0;
    const regions = key.split(',');
    const worker = async () => {
      while (active && cursor < regions.length) {
        const region = regions[cursor++];
        let entry = await load(region);
        if (active && entry.state === 'error') {
          await new Promise(resolve => setTimeout(resolve, 1500));
          if (!active) return;
          cache.delete(region);
          entry = await load(region);
        }
        if (active) setPhotos(previous => ({ ...previous, [region]: entry }));
      }
    };
    void Promise.all([worker(), worker(), worker()]);
    return () => { active = false; };
  }, [key, enabled]);
  return photos;
}
