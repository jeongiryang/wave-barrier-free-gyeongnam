/** Display envelope around Gyeongnam, including its southern islands; not a jurisdiction check. */
export const GYEONGNAM_MAP_BOUNDS = { south: 34.5, west: 127.55, north: 35.95, east: 129.25 };

/** Keep the visible viewport in the travel area without changing route coordinates.
 * @param {{lat:number,lng:number}} center
 * @param {{lat:number,lng:number}} southWest
 * @param {{lat:number,lng:number}} northEast
 */
export function constrainedGyeongnamViewport(center, southWest, northEast) {
  const b = GYEONGNAM_MAP_BOUNDS;
  const below = Math.max(0, center.lat - southWest.lat), above = Math.max(0, northEast.lat - center.lat);
  const left = Math.max(0, center.lng - southWest.lng), right = Math.max(0, northEast.lng - center.lng);
  const tooWide = below + above > b.north - b.south || left + right > b.east - b.west;
  return {
    tooWide,
    lat: tooWide ? (b.south + b.north) / 2 : Math.max(b.south + below, Math.min(b.north - above, center.lat)),
    lng: tooWide ? (b.west + b.east) / 2 : Math.max(b.west + left, Math.min(b.east - right, center.lng)),
  };
}
