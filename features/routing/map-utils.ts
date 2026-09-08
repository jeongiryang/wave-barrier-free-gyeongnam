export function escapeMapHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

export function safeMapImageUrl(value?: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

export function summarizeMeasurements(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const data = value as Record<string, Array<Record<string, unknown>>>;
  const toPoints = (item: Record<string, unknown>) => Array.isArray(item.points)
    ? item.points
      .filter((point): point is { x: number; y: number } => Boolean(point) && typeof point === "object" && Number.isFinite(Number((point as { x?: unknown }).x)) && Number.isFinite(Number((point as { y?: unknown }).y)))
      .map((point) => ({ x: Number(point.x), y: Number(point.y) }))
    : [];
  const distance = (points: Array<{ x: number; y: number }>) => points.slice(1).reduce((sum, point, index) => {
    const previous = points[index];
    const dLat = (point.y - previous.y) * Math.PI / 180;
    const dLng = (point.x - previous.x) * Math.PI / 180;
    const lat1 = previous.y * Math.PI / 180;
    const lat2 = point.y * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return sum + 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);
  const formatDistance = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(2)}km` : `${Math.round(meters)}m`;
  const lines = (data.polyline || []).map(toPoints).filter((points) => points.length > 1);
  if (lines.length) return `거리 ${formatDistance(lines.reduce((sum, points) => sum + distance(points), 0))}`;
  const circles = data.circle || [];
  if (circles.length) {
    const radius = circles.reduce((sum, item) => sum + Number(item.radius || 0), 0);
    return `반경 ${formatDistance(radius)}`;
  }
  const polygons = (data.polygon || []).map(toPoints).filter((points) => points.length > 2);
  if (polygons.length) {
    const area = polygons.reduce((total, points) => {
      const meanLat = points.reduce((sum, point) => sum + point.y, 0) / points.length * Math.PI / 180;
      const projected = points.map((point) => ({
        x: point.x * Math.PI / 180 * 6371000 * Math.cos(meanLat),
        y: point.y * Math.PI / 180 * 6371000,
      }));
      return total + Math.abs(projected.reduce((sum, point, index) => {
        const next = projected[(index + 1) % projected.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0)) / 2;
    }, 0);
    return area >= 1000000 ? `면적 ${(area / 1000000).toFixed(2)}km²` : `면적 ${Math.round(area).toLocaleString()}m²`;
  }
  return "";
}

export function describeCrowd(rate: number) {
  if (rate < 25) return { level: "low", label: "여유", color: "#18a974", soft: "rgba(24,169,116,.2)", radius: 950, message: "비교적 한적해 여유로운 관람이 예상돼요." };
  if (rate < 50) return { level: "moderate", label: "보통", color: "#e5a11a", soft: "rgba(229,161,26,.21)", radius: 1350, message: "일반적인 방문 흐름입니다. 인기 시간대만 확인해 주세요." };
  if (rate < 75) return { level: "busy", label: "붐빔", color: "#ee6b3b", soft: "rgba(238,107,59,.22)", radius: 1850, message: "방문객이 몰릴 수 있어 이른 시간 방문을 권해요." };
  return { level: "very-busy", label: "매우 붐빔", color: "#d93d55", soft: "rgba(217,61,85,.23)", radius: 2400, message: "혼잡이 예상됩니다. 주변 대체 장소나 시간 변경을 권해요." };
}

// Kakao's documented default gutter is 32px. Add actual UI/photo geometry,
// rather than assuming one toolbar height or one photo size at every viewport.
export function mapFitPadding(canvas: HTMLElement): [number, number, number, number] {
  const box = canvas.getBoundingClientRect();
  let top = 0, photoHeight = 0, side = 0;
  for (const control of canvas.parentElement?.querySelectorAll<HTMLElement>(".map-command-bar, .map-provider-badge") || []) {
    const rect = control.getBoundingClientRect();
    if (rect.width && rect.height && rect.right > box.left && rect.left < box.right && rect.bottom > box.top && rect.top < box.bottom) {
      top = Math.max(top, rect.bottom - box.top);
    }
  }
  for (const marker of canvas.querySelectorAll<HTMLElement>(".wave-map-icon.place")) {
    const rect = marker.getBoundingClientRect();
    let minY = rect.top, maxY = rect.bottom;
    const centerX = rect.left + rect.width / 2;
    side = Math.max(side, rect.width / 2);
    // The crowd photo/rank can overflow the fixed-size SDK marker element.
    for (const child of marker.querySelectorAll<HTMLElement>(".photo-pin, .photo-pin b")) {
      const part = child.getBoundingClientRect();
      minY = Math.min(minY, part.top); maxY = Math.max(maxY, part.bottom);
      side = Math.max(side, centerX - part.left, part.right - centerX);
    }
    photoHeight = Math.max(photoHeight, maxY - minY);
  }
  // Full measured height is conservative for both bottom-anchored photos and
  // centered numbered pins. Default gutter covers the existing tip/focus halo.
  return [Math.ceil(32 + top + photoHeight), Math.ceil(32 + side), 32, Math.ceil(32 + side)];
}
