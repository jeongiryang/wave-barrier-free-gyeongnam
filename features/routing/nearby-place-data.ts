import type { KakaoPlace } from "./kakao-sdk";

export const NEARBY_RADIUS_METRES = 10_000;
export interface NearbySearchArea { lat: number; lng: number; radius: number }
// Allow at most 50 m for spherical/ellipsoidal distance and provider rounding at the 10 km edge.
const RADIUS_TOLERANCE_METRES = 50;
function metresFrom(area: NearbySearchArea, lat: number, lng: number) {
  const rad = Math.PI / 180;
  const a = Math.sin((lat - area.lat) * rad / 2) ** 2
    + Math.cos(area.lat * rad) * Math.cos(lat * rad) * Math.sin((lng - area.lng) * rad / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

const englishLabels: Record<string, string> = {
  food: "Restaurants", stay: "Accommodation", attraction: "Attractions", bus: "Bus stops", subway: "Subway",
  parking: "Parking", pharmacy: "Pharmacies", hospital: "Hospitals", bank: "Banks and ATMs", cafe: "Cafes",
  store: "Convenience stores", mart: "Supermarkets", fuel: "Fuel and charging", culture: "Culture",
};
export function nearbyCategoryLabel(category: { id: string; label: string }, english: boolean) {
  return english ? englishLabels[category.id] || "Places" : category.label;
}

function coordinate(value: unknown, limit: number) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;
}
function placeLink(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.hostname !== "place.map.kakao.com" || url.username || url.password || url.port || !/^\/\d+$/.test(url.pathname)) return "";
    return `https://place.map.kakao.com${url.pathname}`;
  } catch { return ""; }
}
export function parseNearbyPlaces(value: unknown, area: NearbySearchArea): { places: KakaoPlace[]; omitted: number } | null {
  if (!Array.isArray(value) || !Number.isFinite(area.lat) || Math.abs(area.lat) > 90
    || !Number.isFinite(area.lng) || Math.abs(area.lng) > 180 || !Number.isFinite(area.radius) || area.radius <= 0) return null;
  const places: KakaoPlace[] = [], ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id.trim() || ids.has(item.id)
      || typeof item.place_name !== "string" || !item.place_name.trim() || !coordinate(item.x, 180) || !coordinate(item.y, 90)
      || metresFrom(area, Number(item.y), Number(item.x)) > area.radius + RADIUS_TOLERANCE_METRES) continue;
    ids.add(item.id);
    const distance = typeof item.distance === "string" && item.distance.trim() !== "" && Number.isFinite(Number(item.distance)) && Number(item.distance) >= 0 ? item.distance : "";
    places.push({ id: item.id, place_name: item.place_name.trim(), x: item.x, y: item.y, distance,
      address_name: typeof item.address_name === "string" ? item.address_name : "",
      road_address_name: typeof item.road_address_name === "string" ? item.road_address_name : "", place_url: placeLink(item.place_url) });
  }
  return { places, omitted: value.length - places.length };
}
