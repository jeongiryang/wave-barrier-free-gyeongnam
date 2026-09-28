/** Keep provider lines separate: never invent links across missing route legs. */
export function mapRouteLines(selected, itinerary = []) {
  const lines = [];
  const seen = new Set();
  for (const route of [...itinerary, selected]) {
    if (!route?.configured || !Array.isArray(route.geometry) || route.geometry.length < 2) continue;
    if (route.geometry.some(point => !Number.isFinite(point.lat) || !Number.isFinite(point.lng))) continue;
    const key = JSON.stringify(route.geometry);
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push({ geometry: route.geometry, road: route.mode === 'car' && route.provider === 'Kakao Mobility' });
  }
  return lines;
}
