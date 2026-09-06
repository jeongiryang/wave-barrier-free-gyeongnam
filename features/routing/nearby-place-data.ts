import type { KakaoPlace } from "./kakao-sdk";

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
export function parseNearbyPlaces(value: unknown): { places: KakaoPlace[]; omitted: number } | null {
  if (!Array.isArray(value)) return null;
  const places: KakaoPlace[] = [], ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id.trim() || ids.has(item.id)
      || typeof item.place_name !== "string" || !item.place_name.trim() || !coordinate(item.x, 180) || !coordinate(item.y, 90)) continue;
    ids.add(item.id);
    const distance = typeof item.distance === "string" && item.distance.trim() !== "" && Number.isFinite(Number(item.distance)) && Number(item.distance) >= 0 ? item.distance : "";
    places.push({ id: item.id, place_name: item.place_name.trim(), x: item.x, y: item.y, distance,
      address_name: typeof item.address_name === "string" ? item.address_name : "",
      road_address_name: typeof item.road_address_name === "string" ? item.road_address_name : "", place_url: placeLink(item.place_url) });
  }
  return { places, omitted: value.length - places.length };
}
