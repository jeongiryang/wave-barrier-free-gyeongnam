/** @param {unknown} value */
export function validTripDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/** Calendar arithmetic in UTC avoids a DST transition changing the selected date. @param {string} start @param {number} days */
export function offsetTripDate(start, days) {
  const date = new Date(`${start}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** @param {string} start @param {string} end */
export function boundedTripEnd(start, end) {
  const maximum = offsetTripDate(start, 6);
  return !validTripDate(end) || end < start ? start : end > maximum ? maximum : end;
}
