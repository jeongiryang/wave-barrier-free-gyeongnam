import type { SearchPlace } from "./types";

/** An invalid response must not look like a successful search with no places. */
export function parseLocationResults(data: unknown): SearchPlace[] {
  if (!data || typeof data !== "object" || !("places" in data) || !Array.isArray(data.places)) throw new Error("Invalid place response");
  return data.places.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid place");
    const place = value as Record<string, unknown>;
    if (typeof place.id !== "string" || typeof place.name !== "string" || !place.name.trim()
      || typeof place.mapX !== "string" || !place.mapX.trim() || typeof place.mapY !== "string" || !place.mapY.trim()
      || !Number.isFinite(Number(place.mapX)) || Math.abs(Number(place.mapX)) > 180
      || !Number.isFinite(Number(place.mapY)) || Math.abs(Number(place.mapY)) > 90) throw new Error("Invalid place coordinates");
    return {
      id: place.id, name: place.name, mapX: place.mapX, mapY: place.mapY,
      address: typeof place.address === "string" ? place.address : "",
      category: typeof place.category === "string" ? place.category : "",
      ...(typeof place.placeUrl === "string" && place.placeUrl.startsWith("https://") ? { placeUrl: place.placeUrl } : {}),
    };
  });
}
