import { directDistanceKm } from '../features/planner/optimization/visit-order.js';
import { travelDurationBetween, visitDurationFor } from '../features/planner/optimization/itinerary-schedule.js';

const reasons = ['distance', 'visited', 'rest', 'indoor', 'discover'];
export function alternativeCandidates({ places = [], original, before, after, savedIds = [], requiredKeys = [], reason = 'distance', visitedIds = [], indoorById = {}, originalVisitMinutes, includeUnknown = false, limit = 3 }) {
  if (!original || !reasons.includes(reason)) return [];
  const saved = new Set(savedIds), visited = new Set(visitedIds), seen = new Set();
  const baselineKnown = directDistanceKm(before, original) !== null && (!after || directDistanceKm(original, after) !== null);
  const originalTravel = baselineKnown ? travelDurationBetween(before, original).minutes + (after ? travelDurationBetween(original, after).minutes : 0) : null;
  return places.flatMap(place => {
    if (!place?.id || place.id === original.id || saved.has(place.id) || seen.has(place.id)) return [];
    seen.add(place.id);
    const distance = directDistanceKm(original, place);
    if (distance === null) return [];
    const fields = requiredKeys.map(key => place.accessibility?.find(field => field.key === key));
    if (fields.some(field => field?.state === 'negative')) return [];
    const unknownKeys = requiredKeys.filter((key, index) => fields[index]?.state !== 'confirmed');
    if (unknownKeys.length && !includeUnknown) return [];
    const from = directDistanceKm(before, place), to = after ? directDistanceKm(place, after) : 0;
    const travel = from === null || to === null ? null : travelDurationBetween(before, place).minutes + (after ? travelDurationBetween(place, after).minutes : 0);
    const minutes = visitDurationFor(place), baselineVisit = Number.isInteger(originalVisitMinutes) && originalVisitMinutes >= 15 && originalVisitMinutes <= 720 ? originalVisitMinutes : visitDurationFor(original);
    const indoor = indoorById[place.id]?.state === 'indoor-space' ? indoorById[place.id] : null;
    if (reason === 'distance' && (travel === null || originalTravel === null || travel >= originalTravel)) return [];
    if ((reason === 'visited' || reason === 'discover') && visited.has(place.id)) return [];
    if (reason === 'rest' && minutes >= baselineVisit) return [];
    if (reason === 'indoor' && !indoor) return [];
    return [{ place, unknownKeys, distanceKm: distance, travelMinutes: travel, travelDelta: travel === null || originalTravel === null ? null : travel - originalTravel, visitMinutes: minutes, visitDelta: minutes - baselineVisit, indoor, seen: visited.has(place.id) }];
  }).sort((a, b) => a.unknownKeys.length - b.unknownKeys.length || (reason === 'rest' ? a.visitMinutes - b.visitMinutes : 0) || (a.travelMinutes ?? Infinity) - (b.travelMinutes ?? Infinity) || a.distanceKm - b.distanceKm).slice(0, Math.min(3, Math.max(1, limit)));
}
