import { travelModeLabel } from './trip-travel-mode.js';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function escapeIcsText(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

export function foldIcsLine(line) {
  const encoder = new TextEncoder();
  const segments = [];
  let segment = "";
  let limit = 75;
  for (const character of line) {
    if (encoder.encode(segment + character).length > limit && segment) {
      segments.push(segment);
      segment = character;
      limit = 74;
    } else {
      segment += character;
    }
  }
  if (segment || !segments.length) segments.push(segment);
  return segments.join("\r\n ");
}

function calendarDateTime(date, time) {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

function addWallMinutes(date, time, minutes) {
  const value = new Date(`${date}T${time}:00Z`);
  value.setUTCMinutes(value.getUTCMinutes() + minutes);
  return { date: value.toISOString().slice(0, 10), time: value.toISOString().slice(11, 16) };
}

function stableTextHash(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function utcStamp(value) {
  const date = value instanceof Date && Number.isFinite(value.getTime()) ? value : new Date();
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

export function buildTripCalendarIcs({
  travelStart, travelEnd, dayStartTime = "10:00", travelMode, locale = "ko",
  title = locale === "en" ? "WAVE accessible trip" : "WAVE 무장애 여행",
  region = locale === "en" ? "Gyeongnam" : "경남", placeNames = [], shareUrl, createdAt = new Date(),
} = {}) {
  if (!DATE_PATTERN.test(travelStart || "") || !DATE_PATTERN.test(travelEnd || "") || travelEnd < travelStart) {
    throw new Error("올바른 여행 날짜가 필요합니다.");
  }
  if (!TIME_PATTERN.test(dayStartTime || "") || !shareUrl) throw new Error("여행 시작 시각과 공유 링크가 필요합니다.");
  const parsedShareUrl = new URL(shareUrl);
  if (!/^https?:$/.test(parsedShareUrl.protocol)) throw new Error("공유 링크는 HTTP(S) 주소여야 합니다.");
  const safeShareUrl = parsedShareUrl.href;
  const end = addWallMinutes(travelEnd, dayStartTime, 8 * 60);
  const description = (locale === "en" ? [
    `${region} trip places: ${placeNames.length ? placeNames.join(" → ") : "See the shared itinerary"}`,
    "Place names are shown in their original language.",
    "Before leaving, check weather, visitor forecasts, transport and place accessibility evidence again in WAVE.",
    `Shared itinerary: ${safeShareUrl}`,
  ] : [
    `${region} 여행 장소: ${placeNames.length ? placeNames.join(" → ") : "공유 일정에서 확인"}`,
    "출발 전 WAVE에서 날씨·혼잡 예측·교통·장소 편의근거를 다시 확인하세요.",
    `공유 일정: ${safeShareUrl}`,
  ]).concat(travelMode === undefined ? [] : [locale === "en" ? `Selected transport: ${travelModeLabel(travelMode, locale)}` : `선택한 이동수단: ${travelModeLabel(travelMode)}`]).join("\n");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//WAVE//Barrier Free Trip//${locale === "en" ? "EN" : "KO"}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE", "TZID:Asia/Seoul", "X-LIC-LOCATION:Asia/Seoul", "BEGIN:STANDARD", "TZOFFSETFROM:+0900", "TZOFFSETTO:+0900", "TZNAME:KST", "DTSTART:19700101T000000", "END:STANDARD", "END:VTIMEZONE",
    "BEGIN:VEVENT", `UID:wave-${travelStart}-${travelEnd}-${stableTextHash(safeShareUrl)}@wave-barrier-free-gyeongnam`, `DTSTAMP:${utcStamp(createdAt)}`,
    `DTSTART;TZID=Asia/Seoul:${calendarDateTime(travelStart, dayStartTime)}`,
    `DTEND;TZID=Asia/Seoul:${calendarDateTime(end.date, end.time)}`,
    `SUMMARY:${escapeIcsText(title)}`, `DESCRIPTION:${escapeIcsText(description)}`, `URL:${safeShareUrl}`,
    "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
