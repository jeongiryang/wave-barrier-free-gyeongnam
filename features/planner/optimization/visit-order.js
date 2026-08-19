const EARTH_RADIUS_KM = 6371;

function coordinates(place) {
  const lat = Number(place.mapY ?? place.lat);
  const lng = Number(place.mapX ?? place.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function directDistanceKm(from, to) {
  const start = coordinates(from);
  const end = coordinates(to);
  if (!start || !end) return null;
  const radians = (value) => value * Math.PI / 180;
  const deltaLat = radians(end.lat - start.lat);
  const deltaLng = radians(end.lng - start.lng);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(start.lat)) * Math.cos(radians(end.lat)) * Math.sin(deltaLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function placeCost(from, place, options = {}) {
  const distance = directDistanceKm(from, place);
  if (distance === null) return Number.POSITIVE_INFINITY;
  const accessibilityWeight = Math.max(0, Number(options.accessibilityWeight ?? 0.12));
  const confidence = Math.max(0, Math.min(100, Number(place.confidence ?? 50)));
  const negativeFields = Math.max(0, Number(place.negativeFields ?? 0));
  const accessibilityPenalty = accessibilityWeight * ((100 - confidence) / 20 + negativeFields * 2);
  const arrivalMinutes = Number(options.arrivalMinutes ?? 0);
  const closesAt = Number(place.closesAt);
  const visitMinutes = Math.max(0, Number(place.visitMinutes ?? options.defaultVisitMinutes ?? 90));
  const schedulePenalty = Number.isFinite(closesAt) && arrivalMinutes + visitMinutes > closesAt ? 10000 : 0;
  return distance + accessibilityPenalty + schedulePenalty;
}

export function optimizeVisitOrder(places, options = {}) {
  if (!Array.isArray(places) || places.length < 2) return Array.isArray(places) ? [...places] : [];
  const remaining = [...places];
  const ordered = [];
  let cursor = options.origin || remaining[0];
  let elapsed = Number(options.startMinutes ?? 0);
  while (remaining.length) {
    let bestIndex = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const cost = placeCost(cursor, remaining[index], { ...options, arrivalMinutes: elapsed });
      if (cost < bestCost) { bestCost = cost; bestIndex = index; }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    const distance = directDistanceKm(cursor, next);
    elapsed += (distance === null ? 0 : distance / Math.max(1, Number(options.assumedSpeedKmh ?? 30)) * 60) + Math.max(0, Number(next.visitMinutes ?? options.defaultVisitMinutes ?? 90));
    cursor = next;
  }
  return ordered;
}

export function explainVisitOrder(ordered, origin) {
  const withCoordinates = ordered.filter((place) => coordinates(place)).length;
  if (ordered.length < 2) return "장소를 더 담으면 이동 부담을 고려한 방문 순서를 제안합니다.";
  if (!withCoordinates) return "좌표 정보가 없어 추천 결과 순서를 유지했습니다.";
  const startLabel = coordinates(origin) ? "출발지부터 " : "";
  return `${startLabel}${withCoordinates}개 장소의 좌표 거리와 접근성 정보 확인률을 함께 고려한 방문 순서입니다. 실제 이동시간은 경로 화면에서 다시 확인합니다.`;
}
