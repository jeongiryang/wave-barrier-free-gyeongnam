import { accountTripPayload } from '../account-travel/model.js';
import { publicTravelBody } from '../kakao-travel.js';
import { sanitizeTemporaryRestroomStops } from '../restroom-temporary-stop.js';
export const LIVE_SHARE_LIFETIME = 30 * 24 * 60 * 60 * 1000;
/** A public projection is rebuilt from an allowlist for every write. */
export function liveSharePayload(value) {
  const s = value?.selections;
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('공유할 일정을 확인해 주세요.');
  const trip = accountTripPayload({ ...s, placeIds: s.selectedPlaceIds, themes: s.themes || String(s.theme || '').split(',') });
  const body = publicTravelBody(trip);
  return { selections: { ...body.selections, temporaryStops: sanitizeTemporaryRestroomStops(s.temporaryStops) }, origin: { label: '' }, placeRefs: trip.placeIds.map((contentId, order) => ({ contentId, order })) };
}
export async function shareSecretHash(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{64}$/.test(value)) return '';
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), item => item.toString(16).padStart(2, '0')).join('');
}
export function shareCookieName(id) { return /^[a-f\d]{12}$/.test(id) ? `wave-share-${id}` : ''; }
export function shareCookie(request, id) {
  const name = shareCookieName(id);
  return name ? (request.headers.get('cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) || '' : '';
}
