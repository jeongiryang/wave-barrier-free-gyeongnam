/**
 * 사진의 촬영 시각과 좌표를 날짜별 방문 후보로 묶는다. 순수 함수이며 네트워크를
 * 쓰지 않는다. 좌표는 이 단계까지만 살아 있고, 서버로 넘어가는 것은 사용자가
 * 확인한 장소 이름과 날짜뿐이다.
 */
import { nearestGyeongnamRegion } from "./gyeongnam-regions.js";

/** 이만큼 떨어졌거나 이만큼 시간이 비면 다른 장소로 본다. */
export const STOP_SPLIT_KM = 1.2;
export const STOP_SPLIT_MINUTES = 90;
export const MAX_DAYS = 14;
export const MAX_STOPS_PER_DAY = 12;

function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const lat = ((a.lat + b.lat) / 2) * toRad;
  const x = dLng * Math.cos(lat);
  return Math.sqrt((dLat * dLat) + (x * x)) * 6371;
}

function clockLabel(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour < 12 ? "오전" : "오후";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${display}:${String(minute).padStart(2, "0")}`;
}

function centroid(points) {
  const usable = points.filter(Boolean);
  if (!usable.length) return null;
  const lat = usable.reduce((sum, point) => sum + point.lat, 0) / usable.length;
  const lng = usable.reduce((sum, point) => sum + point.lng, 0) / usable.length;
  return { lat, lng };
}

/**
 * photos: [{ name, takenAt: { date, minutes } | null, point: { lat, lng } | null }]
 */
export function buildPhotoCourse(photos) {
  const usable = [];
  let withoutDate = 0;
  let withoutPoint = 0;

  for (const photo of Array.isArray(photos) ? photos : []) {
    if (!photo?.takenAt?.date) {
      withoutDate += 1;
      continue;
    }
    if (!photo.point) withoutPoint += 1;
    usable.push(photo);
  }

  const byDate = new Map();
  for (const photo of usable) {
    if (!byDate.has(photo.takenAt.date)) byDate.set(photo.takenAt.date, []);
    byDate.get(photo.takenAt.date).push(photo);
  }

  const days = [...byDate.keys()].sort().slice(0, MAX_DAYS).map((date) => {
    const dayPhotos = byDate.get(date).slice().sort((a, b) => a.takenAt.minutes - b.takenAt.minutes);
    const stops = [];
    for (const photo of dayPhotos) {
      const current = stops[stops.length - 1];
      const gap = current ? photo.takenAt.minutes - current.lastMinutes : Infinity;
      const away = current ? distanceKm(centroid(current.points), photo.point) : Infinity;
      const sameStop = current
        && gap <= STOP_SPLIT_MINUTES
        && (photo.point && current.points.some(Boolean) ? away <= STOP_SPLIT_KM : true);
      if (sameStop) {
        current.points.push(photo.point);
        current.photoCount += 1;
        current.lastMinutes = photo.takenAt.minutes;
      } else {
        stops.push({
          points: [photo.point],
          photoCount: 1,
          firstMinutes: photo.takenAt.minutes,
          lastMinutes: photo.takenAt.minutes,
        });
      }
    }

    const trimmed = stops.slice(0, MAX_STOPS_PER_DAY).map((stop, order) => {
      const point = centroid(stop.points);
      const region = point ? nearestGyeongnamRegion(point) : "";
      return {
        id: `${date}-${order}`,
        order,
        region,
        photoCount: stop.photoCount,
        timeLabel: clockLabel(stop.firstMinutes),
        minutes: stop.firstMinutes,
        hasPoint: Boolean(point),
        // 제안 이름일 뿐이며 사용자가 바꾸는 것을 전제로 한다.
        suggestedName: region ? `${region} 방문지 ${order + 1}` : `방문지 ${order + 1}`,
      };
    });

    const regions = [...new Set(trimmed.map((stop) => stop.region).filter(Boolean))];
    return { date, region: regions[0] || "", regions, stops: trimmed };
  });

  return {
    days,
    regions: [...new Set(days.flatMap((day) => day.regions))],
    skipped: { withoutDate, withoutPoint },
    photoCount: usable.length,
  };
}

/**
 * 서버로 보낼 수 있는 형태로 줄인다. 좌표는 여기에서 완전히 사라지고 사용자가
 * 확인한 이름·날짜·순서만 남는다.
 */
export function courseToSelections(days, names = {}) {
  return (Array.isArray(days) ? days : []).slice(0, MAX_DAYS).map((day) => ({
    date: day.date,
    region: day.region || "",
    stops: (day.stops || []).slice(0, MAX_STOPS_PER_DAY).map((stop) => ({
      order: stop.order,
      name: String(names[stop.id] ?? stop.suggestedName ?? "").trim().slice(0, 80),
    })).filter((stop) => stop.name),
  }));
}
