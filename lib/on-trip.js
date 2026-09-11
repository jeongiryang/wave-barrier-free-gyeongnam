import { validTripClock } from './trip-time-constraints.js';
import { supportedPlacePoint } from './map-coordinates.js';
import { buildItinerarySchedule } from '../features/planner/optimization/itinerary-schedule.js';

export const ON_TRIP_KEY = 'wave-on-trip-v1';
export function onTripIdentity(places, day) {
  return `${day}|${places.map(place => place.id).sort().join(',')}`;
}
export function cleanOnTrip(value, ids) {
  const allowed = new Set(ids), marks = {};
  if (value && typeof value === 'object' && value.marks && typeof value.marks === 'object') {
    for (const [id, mark] of Object.entries(value.marks)) if (allowed.has(id) && ['done', 'skipped'].includes(mark?.state)) {
      marks[id] = { state: mark.state, at: typeof mark.at === 'string' && Number.isFinite(Date.parse(mark.at)) ? mark.at : '' };
    }
  }
  return { marks, cursorId: allowed.has(value?.cursorId) ? value.cursorId : '',
    clock: validTripClock(value?.clock) ? value.clock : '10:00',
    updatedAt: typeof value?.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : '' };
}
export function readOnTrip(storage, identity, ids) {
  try { const values = JSON.parse(storage.getItem(ON_TRIP_KEY) || '[]');
    return cleanOnTrip(Array.isArray(values) ? values.find(item => item?.identity === identity)?.value : null, ids);
  } catch { return cleanOnTrip(null, ids); }
}
export function saveOnTrip(storage, identity, value, ids) {
  let entries = [];
  try { const old = JSON.parse(storage.getItem(ON_TRIP_KEY) || '[]'); if (Array.isArray(old)) entries = old.filter(item => typeof item?.identity === 'string' && item.identity !== identity).slice(0, 19); } catch { /* Replace invalid progress only, never itinerary storage. */ }
  const clean = cleanOnTrip(value, ids);
  storage.setItem(ON_TRIP_KEY, JSON.stringify([{ identity, value: clean }, ...entries]));
  return clean;
}
export function remainingOnTrip({ places, day, progress, origin, routeMinutesByPlaceId = {}, visitMinutesByPlaceId = {}, breakMinutesByPlaceId = {}, fixedVisits = {} }) {
  const state = cleanOnTrip(progress, places.map(place => place.id));
  const remaining = places.filter(place => !state.marks[place.id]);
  const cursor = places.find(place => place.id === state.cursorId);
  const validRoutes = {};
  // A skipped place changes the leg. Reuse a route only if both endpoints still match.
  for (let index = 0; index < remaining.length; index++) {
    const place = remaining[index], originalIndex = places.findIndex(item => item.id === place.id);
    const previous = index > 0 ? remaining[index - 1]?.id : cursor?.id;
    if (places[originalIndex - 1]?.id === previous) validRoutes[place.id] = routeMinutesByPlaceId[place.id];
  }
  const point = cursor ? supportedPlacePoint(cursor.mapX, cursor.mapY) || {} : origin;
  const schedule = buildItinerarySchedule({ places: remaining, days: [day], startTime: state.clock, origin: point,
    routeMinutesByPlaceId: validRoutes, visitMinutesByPlaceId, breakMinutesByPlaceId, fixedVisits });
  return { entries: schedule[0].entries, next: remaining[0] || null,
    done: places.filter(place => state.marks[place.id]?.state === 'done').length,
    skipped: places.filter(place => state.marks[place.id]?.state === 'skipped').length,
    from: cursor?.name || '기존 출발지', progress: state };
}
