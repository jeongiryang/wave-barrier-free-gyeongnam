import { verifiedCrowdItem } from './crowd-integrity.js';
import { validTripDate } from '../trip-dates.js';

/** Retain only actual, date-specific records for the exact official attraction. */
export function crowdCalendar(items, title, today) {
  if (!validTripDate(today) || !title || !Array.isArray(items)) return [];
  const last = new Date(`${today}T00:00:00Z`); last.setUTCDate(last.getUTCDate() + 30);
  const latest = last.toISOString().slice(0, 10), byDate = new Map();
  for (const item of items.slice(0, 100)) {
    const rawRate = item?.cnctrRate;
    if (typeof rawRate !== 'number' && (typeof rawRate !== 'string' || !/^\d+(?:\.\d+)?$/.test(rawRate.trim()))) continue;
    if (!verifiedCrowdItem(item, title)) continue;
    const value = String(item.baseYmd || ''), date = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : '';
    if (!validTripDate(date) || date < today || date > latest) continue;
    const rate = Number(item.cnctrRate);
    // Conflicting duplicate values are unverified, not averaged into a new forecast.
    if (byDate.has(date) && byDate.get(date) !== rate) byDate.set(date, null);
    else if (!byDate.has(date)) byDate.set(date, rate);
  }
  return [...byDate].filter(([, rate]) => rate !== null).map(([date, rate]) => ({ date, rate })).sort((a, b) => a.date.localeCompare(b.date));
}
