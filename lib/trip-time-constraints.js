import { validTripDate } from "./trip-dates.js";

export const validTripClock = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const record = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const minutes = (value, max) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;

export function sanitizeFixedVisits(value, allowedIds) {
  const ids = allowedIds ? new Set(allowedIds) : null;
  return Object.fromEntries(Object.entries(record(value)).filter(([id, item]) =>
    id && id.length <= 80 && !["__proto__", "constructor", "prototype"].includes(id) && (!ids || ids.has(id)) &&
    ["visit", "stay", "event"].includes(item?.kind) && minutes(item?.position, 99),
  ).slice(0, 100).map(([id, item]) => [id, { kind: item.kind, position: item.position, time: validTripClock(item.time) ? item.time : "" }]));
}

export function sanitizeDayDeadlines(value, allowedDays) {
  const days = allowedDays ? new Set(allowedDays) : null;
  return Object.fromEntries(Object.entries(record(value)).filter(([day, item]) =>
    validTripDate(day) && (!days || days.has(day)) && validTripClock(item?.time) && minutes(item?.bufferMinutes, 120) &&
    (item?.returnMinutes === null || minutes(item?.returnMinutes, 720)),
  ).slice(0, 7).map(([day, item]) => [day, { time: item.time, returnMinutes: item.returnMinutes, bufferMinutes: item.bufferMinutes }]));
}

// Place pins stay in their daily slots. Only the unpinned places are reordered.
export function preserveFixedVisitOrder(ids, fixed = {}, assignments = {}, defaultDay = "") {
  const days = [...new Set(ids.map(id => assignments[id] || defaultDay))];
  const slots = new Map();
  for (const day of days) {
    const current = ids.filter(id => (assignments[id] || defaultDay) === day);
    const result = Array(current.length).fill(null);
    const pins = current.filter(id => fixed[id]).sort((a, b) => fixed[a].position - fixed[b].position || current.indexOf(a) - current.indexOf(b));
    for (const id of pins) {
      let index = Math.min(current.length - 1, fixed[id].position);
      while (index < current.length && result[index]) index++;
      if (index === current.length) index = result.findLastIndex(value => value === null);
      result[index] = id;
    }
    const free = current.filter(id => !fixed[id]);
    slots.set(day, result.map(id => id || free.shift()));
  }
  return ids.map(id => slots.get(assignments[id] || defaultDay).shift());
}

export function assessDayDeadline(entries, deadline) {
  if (!deadline || !entries?.length || !validTripClock(deadline.time)) return null;
  const [hours, mins] = deadline.time.split(":").map(Number);
  const limit = hours * 60 + mins;
  const lastEnd = entries.at(-1).endsAt;
  const returnKnown = minutes(deadline.returnMinutes, 720);
  const projectedEnd = lastEnd + (returnKnown ? deadline.returnMinutes : 0) + deadline.bufferMinutes;
  const remainingMinutes = limit - projectedEnd;
  return { projectedEnd, remainingMinutes, returnKnown,
    state: remainingMinutes < 0 ? "over" : returnKnown ? "within" : "unknown",
    allLegsVerified: entries.every(entry => entry.travelSource === "route") };
}
