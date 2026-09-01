const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function utcDay(date) {
  return Date.parse(`${date}T00:00:00Z`);
}

function daysBetween(from, to) {
  return Math.round((utcDay(to) - utcDay(from)) / 86_400_000);
}

export function assessTripDatePhase(travelStart, today) {
  if (!DATE_PATTERN.test(travelStart || "")) {
    return { id: "no-date", label: "여행 날짜를 정해 주세요", daysUntil: null };
  }
  const safeToday = DATE_PATTERN.test(today || "") ? today : new Date().toISOString().slice(0, 10);
  const daysUntil = daysBetween(safeToday, travelStart);
  if (daysUntil < 0) return { id: "past", label: "지난 일정", daysUntil };
  if (daysUntil === 0) return { id: "today", label: "오늘 출발", daysUntil };
  if (daysUntil <= 3) return { id: "imminent", label: `출발 D-${daysUntil}`, daysUntil };
  return { id: "planned", label: `${daysUntil}일 뒤 출발`, daysUntil };
}

function weatherReadiness({ travelStart, weather, weatherLoading }) {
  if (weatherLoading) return {
    id: "weather", label: "날씨", state: "recheck", summary: "여행 날짜의 예보를 불러오는 중입니다.",
    source: "기상 정보", checkedAt: "", href: "#layers",
  };
  const day = weather?.days?.find((item) => item.date === travelStart);
  if (!day) return {
    id: "weather", label: "날씨", state: "recheck", summary: "해당 날짜 예보가 없거나 예보 범위 밖입니다.",
    source: weather?.source || "기상 정보", checkedAt: weather?.updatedAt || "", href: "#layers",
  };
  return {
    id: "weather", label: "날씨", state: "confirmed",
    summary: `${day.label} · 강수확률 ${day.rainProbability}% · ${day.min}~${day.max}℃`,
    source: weather.source || "기상 정보", checkedAt: weather.updatedAt || "", href: "#layers",
  };
}

function crowdReadiness(crowd, generatedAt) {
  if (!crowd || typeof crowd.rate !== "number") return {
    id: "crowd", label: "관광 집중률", state: "recheck", summary: "예측값을 확인하지 못했습니다. 현장 혼잡을 따로 확인하세요.",
    source: "한국관광 데이터랩", checkedAt: generatedAt || "", href: "#layers",
  };
  return {
    id: "crowd", label: "관광 집중률", state: "confirmed",
    summary: `${crowd.place || "선택 장소"} ${crowd.rate.toFixed(1)}% · 예측값이며 실시간 방문자 수가 아닙니다.`,
    source: "한국관광 데이터랩 관광집중률 예측", checkedAt: crowd.baseYmd || generatedAt || "", href: "#layers",
  };
}

function transportReadiness(providers) {
  const list = Array.isArray(providers) ? providers : [];
  const connected = list.filter((item) => item.state === "connected");
  const readyOnly = list.filter((item) => item.state === "ready");
  const unavailable = list.filter((item) => item.state === "error" || item.state === "missing" || item.state === "checking");
  if (!list.length || !connected.length) return {
    id: "transport", label: "교통", state: "recheck",
    summary: readyOnly.length
      ? `${readyOnly.length}개 공급자는 사용 승인만 확인됐습니다. 실제 시간은 이동 화면에서 확인하세요.`
      : "직접 확인된 이동시간이 없습니다. 운영기관 또는 외부 길찾기를 확인하세요.",
    source: readyOnly.map((item) => item.name).join(" · ") || "교통 공급자 상태", checkedAt: "", href: "#navigation",
  };
  const allConnected = connected.length === list.length;
  return {
    id: "transport", label: "교통", state: allConnected ? "confirmed" : "partial",
    summary: allConnected
      ? `${connected.length}개 교통 제공기관·데이터 응답을 확인했습니다. 실제 경로와 운행시간은 이동 화면에서 구분해 확인하세요.`
      : `${connected.length}개 제공기관·데이터 응답 확인 · ${readyOnly.length + unavailable.length}개는 승인·오류·미조회 상태입니다. 실제 경로 수와는 다릅니다.`,
    source: connected.map((item) => item.name).join(" · "), checkedAt: "", href: "#navigation",
  };
}

function evidenceReadiness(places) {
  const list = Array.isArray(places) ? places : [];
  if (!list.length) return {
    id: "evidence", label: "장소 편의근거", state: "recheck", summary: "일정에 보관한 장소가 없습니다.",
    source: "공식 무장애 여행정보", checkedAt: "", href: "#places",
  };
  const verified = list.filter((place) => Number(place.score) > 0 && Number(place.knownFields) > 0 && place.checkedAt);
  const sources = [...new Set(verified.map((place) => place.source).filter(Boolean))];
  const checkedTimes = verified.map((place) => Date.parse(place.checkedAt)).filter(Number.isFinite);
  const checkedAt = checkedTimes.length ? new Date(Math.min(...checkedTimes)).toISOString() : "";
  if (!verified.length) return {
    id: "evidence", label: "장소 편의근거", state: "recheck",
    summary: `${list.length}곳 모두 공식 편의근거와 갱신 시각을 다시 확인해야 합니다.`,
    source: "공식 무장애 여행정보", checkedAt: "", href: "#places",
  };
  return {
    id: "evidence", label: "장소 편의근거", state: verified.length === list.length ? "confirmed" : "partial",
    summary: `${list.length}곳 중 ${verified.length}곳의 공식 편의근거와 확인 시각이 있습니다.`,
    source: sources.join(" · ") || "공식 무장애 여행정보", checkedAt, href: "#places",
  };
}

export function assessDepartureReadiness({
  travelStart = "", today = "", weather = null, weatherLoading = false,
  crowd = null, generatedAt = "", transportProviders = [], places = [],
} = {}) {
  const phase = assessTripDatePhase(travelStart, today);
  const items = [
    weatherReadiness({ travelStart, weather, weatherLoading }),
    crowdReadiness(crowd, generatedAt),
    transportReadiness(transportProviders),
    evidenceReadiness(places),
  ];
  const hasRecheck = items.some((item) => item.state === "recheck");
  const hasPartial = items.some((item) => item.state === "partial");
  const state = phase.id === "past" || phase.id === "no-date" || hasRecheck
    ? "recheck"
    : hasPartial ? "partial" : "confirmed";
  return { state, phase, items };
}

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
  travelStart, travelEnd, dayStartTime = "10:00", title = "W.A.V.E 무장애 여행",
  region = "경남", placeNames = [], shareUrl, createdAt = new Date(),
} = {}) {
  if (!DATE_PATTERN.test(travelStart || "") || !DATE_PATTERN.test(travelEnd || "") || travelEnd < travelStart) {
    throw new Error("올바른 여행 날짜가 필요합니다.");
  }
  if (!TIME_PATTERN.test(dayStartTime || "") || !shareUrl) throw new Error("여행 시작 시각과 공유 링크가 필요합니다.");
  const parsedShareUrl = new URL(shareUrl);
  if (!/^https?:$/.test(parsedShareUrl.protocol)) throw new Error("공유 링크는 HTTP(S) 주소여야 합니다.");
  const safeShareUrl = parsedShareUrl.href;
  const end = addWallMinutes(travelEnd, dayStartTime, 8 * 60);
  const description = [
    `${region} 여행 장소: ${placeNames.length ? placeNames.join(" → ") : "공유 일정에서 확인"}`,
    "출발 전 W.A.V.E에서 날씨·혼잡 예측·교통·장소 편의근거를 다시 확인하세요.",
    `공유 일정: ${safeShareUrl}`,
  ].join("\n");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//W.A.V.E//Barrier Free Trip//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE", "TZID:Asia/Seoul", "X-LIC-LOCATION:Asia/Seoul", "BEGIN:STANDARD", "TZOFFSETFROM:+0900", "TZOFFSETTO:+0900", "TZNAME:KST", "DTSTART:19700101T000000", "END:STANDARD", "END:VTIMEZONE",
    "BEGIN:VEVENT", `UID:wave-${travelStart}-${travelEnd}-${stableTextHash(safeShareUrl)}@wave-barrier-free-gyeongnam`, `DTSTAMP:${utcStamp(createdAt)}`,
    `DTSTART;TZID=Asia/Seoul:${calendarDateTime(travelStart, dayStartTime)}`,
    `DTEND;TZID=Asia/Seoul:${calendarDateTime(end.date, end.time)}`,
    `SUMMARY:${escapeIcsText(title)}`, `DESCRIPTION:${escapeIcsText(description)}`, `URL:${safeShareUrl}`,
    "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
