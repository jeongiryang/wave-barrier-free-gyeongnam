import { directDistanceKm } from '../features/planner/optimization/visit-order.js';
const name = value => String(value || '').replace(/\([^)]*\)/g, '').replace(/[^가-힣a-z0-9]/gi, '').toLowerCase();
const fullName = value => String(value || '').replace(/[^가-힣a-z0-9]/gi, '').toLowerCase();
const usableText = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160);/gi, '').trim();
function usableAudio(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
}
/** Keyword overlap alone (e.g. 창원 / 효창원) must not associate an unrelated story. */
export function matchingAudioStories(items, place) {
  const expected = name(place.name);
  if (expected.length < 2 || !Array.isArray(items)) return [];
  return items.filter(item => {
    const title = name(item.title);
    const sameName = title === expected || name(String(item.title || '').split(/\s+[-–—:·]\s+/)[0]) === expected;
    const distance = directDistanceKm(place, item);
    return sameName && (distance === null ? fullName(item.title) === fullName(place.name) : distance <= 3) && (usableAudio(item.audioUrl) || usableText(item.script));
  }).slice(0, 5);
}
