import { nearestGyeongnamRegion } from "./gyeongnam-regions.js";

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
  return {
    lat: usable.reduce((sum, point) => sum + point.lat, 0) / usable.length,
    lng: usable.reduce((sum, point) => sum + point.lng, 0) / usable.length,
  };
}

function normalizedDay(day) {
  const stops = (day.stops || []).slice(0, MAX_STOPS_PER_DAY).map((stop, order) => ({ ...stop, order }));
  const regions = [...new Set(stops.map((stop) => stop.region).filter(Boolean))];
  return { ...day, region: regions[0] || "", regions, stops };
}

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
    const groups = [];
    for (const photo of dayPhotos) {
      const current = groups[groups.length - 1];
      const gap = current ? photo.takenAt.minutes - current.lastMinutes : Infinity;
      const away = current ? distanceKm(centroid(current.points), photo.point) : Infinity;
      const sameStop = current && gap <= STOP_SPLIT_MINUTES && (photo.point && current.points.some(Boolean) ? away <= STOP_SPLIT_KM : true);
      if (sameStop) {
        current.points.push(photo.point);
        current.photoCount += 1;
        current.lastMinutes = photo.takenAt.minutes;
      } else {
        groups.push({ points: [photo.point], photoCount: 1, firstMinutes: photo.takenAt.minutes, lastMinutes: photo.takenAt.minutes });
      }
    }

    const stops = groups.slice(0, MAX_STOPS_PER_DAY).map((stop, order) => {
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
        suggestedName: region ? `${region} 방문지 ${order + 1}` : `방문지 ${order + 1}`,
      };
    });
    return normalizedDay({ date, region: "", regions: [], stops });
  });

  return {
    days,
    regions: [...new Set(days.flatMap((day) => day.regions))],
    skipped: { withoutDate, withoutPoint },
    photoCount: usable.length,
  };
}

export function movePhotoCourseStop(days, dayIndex, stopIndex, direction) {
  const next = (Array.isArray(days) ? days : []).map((day) => ({ ...day, stops: [...(day.stops || [])] }));
  const stops = next[dayIndex]?.stops;
  if (!stops) return next;
  const target = stopIndex + direction;
  if (target < 0 || target >= stops.length) return next;
  [stops[stopIndex], stops[target]] = [stops[target], stops[stopIndex]];
  next[dayIndex] = normalizedDay(next[dayIndex]);
  return next;
}

export function changePhotoCourseDayDate(days, dayIndex, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return days;
  const next = (Array.isArray(days) ? days : []).map((day, index) => index === dayIndex ? { ...day, date } : { ...day });
  return next.sort((a, b) => a.date.localeCompare(b.date)).slice(0, MAX_DAYS).map(normalizedDay);
}

/** 좌표를 포함하지 않는 서버/공유 가능 형태. */
export function courseToSelections(days, names = {}, enrichments = {}) {
  return (Array.isArray(days) ? days : []).slice(0, MAX_DAYS).map((day) => ({
    date: day.date,
    region: day.region || "",
    stops: (day.stops || []).slice(0, MAX_STOPS_PER_DAY).map((stop, order) => {
      const enrichment = enrichments[stop.id] || {};
      return {
        order,
        name: String(names[stop.id] ?? stop.suggestedName ?? "").trim().slice(0, 80),
        contentId: /^\d{3,}$/.test(String(enrichment.contentId || "")) ? String(enrichment.contentId) : "",
      };
    }).filter((stop) => stop.name),
  }));
}

export function portablePhotoCourseExport(days, names = {}, enrichments = {}) {
  return {
    schemaVersion: 1,
    source: "W.A.V.E 사진 코스 복원",
    privacy: "원본 사진과 GPS 좌표는 포함하지 않습니다.",
    generatedAt: new Date().toISOString(),
    days: courseToSelections(days, names, enrichments),
  };
}

export function photoCourseShareText(days, names = {}, enrichments = {}) {
  const selections = courseToSelections(days, names, enrichments);
  const lines = ["W.A.V.E에서 복원한 여행 코스", "원본 사진·GPS 좌표는 포함하지 않습니다."];
  for (const day of selections) {
    lines.push(`\n${day.date}${day.region ? ` · ${day.region}` : ""}`);
    for (const stop of day.stops) lines.push(`${stop.order + 1}. ${stop.name}${stop.contentId ? ` · 한국관광공사 contentId ${stop.contentId}` : ""}`);
  }
  return lines.join("\n");
}