const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dateOf(value) {
  const match = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10).replaceAll("-", "") === match.slice(1).join("") ? date : null;
}

function minutes(hour, minute) {
  const h = Number(hour), m = Number(minute);
  return h >= 0 && h <= 24 && m >= 0 && m < 60 && (h < 24 || m === 0) ? h * 60 + m : null;
}

// Parse only a single, unconditional daily interval. Seasonal schedules, breaks,
// weekday exceptions and overnight opening stay as provider text, never guesses.
export function visitHoursWindow(value) {
  const text = String(value || "").trim();
  if (/^(24시간|상시\s*개방|상시\s*이용|00:00\s*[~～–—-]\s*24:00)$/.test(text)) return { opens: 0, closes: 1440, lastEntry: null };
  const match = /^(?:(?:이용|운영|관람|개방|영업)\s*시간\s*[:：]?\s*|매일\s*)?(\d{1,2}):(\d{2})\s*[~～–—-]\s*(\d{1,2}):(\d{2})(?:\s*\(?입장\s*마감\s*[:：]?\s*(\d{1,2}):(\d{2})\)?)?$/.exec(text);
  if (!match) return null;
  const opens = minutes(match[1], match[2]), closes = minutes(match[3], match[4]);
  const lastEntry = match[5] === undefined ? null : minutes(match[5], match[6]);
  if (opens === null || closes === null || closes <= opens || match[5] !== undefined && (lastEntry === null || lastEntry < opens || lastEntry > closes)) return null;
  return { opens, closes, lastEntry };
}

function holidayAt(value, date) {
  const text = String(value || "").replace(/\s+/g, "");
  if (/^(연중무휴|무휴|휴무없음|없음)$/.test(text)) return false;
  const weekly = /^(?:매주)?([일월화수목금토](?:요일)?(?:[,·/][일월화수목금토](?:요일)?)*)(?:휴무|휴관|정기휴무|정기휴관)?$/.exec(text);
  if (weekly) return weekly[1].replaceAll("요일", "").split(/[,·/]/).includes(WEEKDAYS[date.getUTCDay()]);
  return null;
}

/** The result describes the published record and planned times, not live opening. */
export function assessVisitHours(info, { day, startsAt, endsAt } = {}) {
  const unknown = { state: "unknown", reason: "confirm-hours" };
  if (!info || info.status !== "available") return unknown;
  const date = dateOf(day);
  if (!date || !Number.isInteger(startsAt) || !Number.isInteger(endsAt) || startsAt < 0 || endsAt <= startsAt || endsAt > 1440) return { state: "unknown", reason: "confirm-date" };
  const first = dateOf(info.eventStart), last = dateOf(info.eventEnd);
  if (first && last && first <= last && (date < first || date > last)) return { state: "conflict", reason: "outside-event" };
  const holiday = holidayAt(info.restDays, date);
  if (holiday === true) return { state: "conflict", reason: "closed-day" };
  const hours = visitHoursWindow(info.hours);
  if (!hours) return unknown;
  if (startsAt < hours.opens) return { state: "conflict", reason: "before-opening", opensAt: hours.opens };
  if (startsAt >= hours.closes) return { state: "conflict", reason: "after-closing" };
  if (hours.lastEntry !== null && startsAt > hours.lastEntry) return { state: "conflict", reason: "after-admission" };
  if (endsAt > hours.closes) return { state: "conflict", reason: "visit-overrun" };
  return holiday === false ? { state: "within", reason: "within-hours" } : { state: "unknown", reason: "confirm-holiday" };
}
