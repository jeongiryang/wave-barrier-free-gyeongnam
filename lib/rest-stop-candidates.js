import { directDistanceKm } from "../features/planner/optimization/visit-order.js";
import { travelDurationBetween } from "../features/planner/optimization/itinerary-schedule.js";

export function restStopCandidates({ places, anchor, next, savedIds = [], requiredKeys = [], purpose = "rest", includeUnknown = false, radiusKm = 5 }) {
  if (!anchor) return [];
  const saved = new Set(savedIds), seen = new Set();
  const baseline = next ? directDistanceKm(anchor, next) : 0;
  return places.flatMap(place => {
    if (!place?.id || saved.has(place.id) || seen.has(place.id)) return [];
    seen.add(place.id);
    const distanceKm = directDistanceKm(anchor, place);
    if (distanceKm === null || distanceKm > Math.min(20, Math.max(1, radiusKm))) return [];
    const keys = [...new Set([...requiredKeys, ...(purpose === "restroom" ? ["restroom"] : [])])];
    const evidence = keys.map(key => place.accessibility?.find(item => item.key === key));
    if (evidence.some(item => item?.state === "negative")) return [];
    const unknown = evidence.filter(item => item?.state !== "confirmed").length;
    if (unknown && !includeUnknown) return [];
    const after = next ? directDistanceKm(place, next) : 0;
    const detourKm = baseline === null || after === null ? null : Math.max(0, distanceKm + after - baseline);
    const extraTravelMinutes = detourKm === null ? null : Math.max(0, travelDurationBetween(anchor, place).minutes + (next ? travelDurationBetween(place, next).minutes - travelDurationBetween(anchor, next).minutes : 0));
    return [{ place, distanceKm, detourKm, extraTravelMinutes, unknown, restroom: place.accessibility?.find(item => item.key === "restroom") || null }];
  }).sort((a, b) => a.unknown - b.unknown || (a.detourKm ?? Infinity) - (b.detourKm ?? Infinity) || a.distanceKm - b.distanceKm).slice(0, 6);
}
