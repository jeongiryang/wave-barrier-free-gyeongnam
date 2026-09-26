export type ViewedPhotoCredit = { title: string; image: string; photographer?: string; location?: string; source: string };
const key = 'wave-viewed-photo-credits-v1';
export function readPhotoCredits(): ViewedPhotoCredit[] {
  try {
    const data: unknown = JSON.parse(sessionStorage.getItem(key) || '[]');
    return Array.isArray(data) ? data.filter((photo): photo is ViewedPhotoCredit => photo && typeof photo.title === 'string' && typeof photo.source === 'string' && typeof photo.image === 'string' && /^https:\/\/tong\.visitkorea\.or\.kr\//.test(photo.image)) : [];
  } catch { return []; }
}
/** Keep attribution for the exact API images shown in this tab, across navigation. */
export function rememberPhotoCredits(photos: ViewedPhotoCredit[]) {
  try {
    const merged = new Map(readPhotoCredits().map(photo => [photo.image, photo]));
    photos.forEach(photo => merged.set(photo.image, photo));
    sessionStorage.setItem(key, JSON.stringify([...merged.values()].slice(-120)));
  } catch { /* Browsers may disable tab storage; current API sources remain available. */ }
}
