// Permission applies to the exact exploration record the person inspected.
// Neither a score of zero nor a missing provider response proves a mismatch.
export function explorationPlaceAction({ place, plan, current, region, criteriaKey }) {
  const blocked = { kind: "blocked", key: "", providerError: false };
  if (!current || !plan || !place || !Object.hasOwn(GYEONGNAM_REGION_POINTS, region) || !/^[1-9]\d{0,19}$/.test(place.id)) return blocked;
  const matches = (plan.explorationPlaces || []).filter(candidate => candidate.id === place.id);
  const inRegion = region === "경남 전체" ? place.city === "경남" || Object.hasOwn(GYEONGNAM_REGION_POINTS, place.city) : place.city === region;
  if (matches.length !== 1 || matches[0] !== place || !inRegion) return blocked;
  const required = plan.criteria?.facilityKeys || [];
  const items = place.accessibility || [];
  if (items.some(item => item.state === "negative" && (!required.length || required.includes(item.key))) || (!items.length && place.negativeFields > 0)) {
    return { ...blocked, kind: "mismatch" };
  }
  if (!required.length || required.every(key => items.some(item => item.key === key && item.state === "confirmed"))) return blocked;
  return {
    kind: "acknowledge",
    key: JSON.stringify([criteriaKey, plan.generatedAt, place]),
    providerError: place.facilityLookupState === "error" || (plan.statuses || []).some(status => status.id === "barrierfree" && (status.state === "error" || status.partial)),
  };
}
import { GYEONGNAM_REGION_POINTS } from "./gyeongnam-regions.js";
