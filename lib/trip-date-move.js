import { validTripDate, offsetTripDate } from './trip-dates.js';

/** Preserve the current period; a single-place move can only expand it to seven days. */
export function periodForDate(start, end, date) {
  if (![start, end, date].every(validTripDate) || end < start) return null;
  const nextStart = date < start ? date : start, nextEnd = date > end ? date : end;
  return nextEnd <= offsetTripDate(nextStart, 6) ? { start: nextStart, end: nextEnd } : null;
}

/** Removing a visit before a later pinned slot would move that fixed position. */
export function canMoveVisitDate({ id, date, order = [], assignments = {}, fixed = {}, start, end }) {
  if (!id || !order.includes(id) || fixed[id] || !periodForDate(start, end, date)) return false;
  const currentDay = assignments[id] || start;
  if (currentDay === date) return false;
  const day = order.filter(key => (assignments[key] || start) === currentDay), at = day.indexOf(id);
  return !day.slice(at + 1).some(key => fixed[key]);
}
