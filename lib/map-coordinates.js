/** Same coordinate envelope as the public route API; this is not an administrative boundary. */
/** @param {unknown} lat @param {unknown} lng */
export function isSupportedMapCoordinate(lat, lng) {
  return typeof lat === "number" && Number.isFinite(lat) && lat >= 30 && lat <= 40
    && typeof lng === "number" && Number.isFinite(lng) && lng >= 120 && lng <= 135;
}

/** Public destination envelope shared by storage, restoration and itinerary sinks.
 * It is a coordinate guard, not proof of a regional administrative boundary.
 * @param {unknown} x @param {unknown} y
 */
export function supportedPlacePoint(x, y) {
  if (![x, y].every(value => (typeof value === "string" || typeof value === "number") && String(value).trim() !== "")) return null;
  const lng = Number(x), lat = Number(y);
  return Number.isFinite(lat) && lat >= 33 && lat <= 39 && Number.isFinite(lng) && lng >= 124 && lng <= 132 ? { lat, lng } : null;
}

/** @param {{lat:number,lng:number}} a @param {{lat:number,lng:number}} b */
export function mapDistanceMetres(a, b) {
  const rad = Math.PI / 180;
  const value = Math.sin((b.lat - a.lat) * rad / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
}

