import { normalizeRestroomAlternative } from './restroom-alternatives.js';

/** Accept only the same public festival's bounded official restroom response. */
export function readFestivalAmenities(value, contentId) {
  const error = { status: 'error', items: [], source: '', checkedAt: '' };
  if (!value || typeof value !== 'object' || value.contentId !== contentId
    || !['available', 'empty'].includes(value.status) || value.radiusKm !== 5
    || !Array.isArray(value.items) || value.items.length > 3
    || typeof value.source !== 'string' || !value.source.trim() || value.source.length > 200
    || typeof value.checkedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value.checkedAt)
    || !Number.isFinite(Date.parse(value.checkedAt))) return error;
  if ((value.status === 'empty') !== (value.items.length === 0)) return error;
  const ids = new Set(), addresses = new Set();
  const items = [];
  for (const raw of value.items) {
    const item = normalizeRestroomAlternative(raw);
    const distance = raw?.distanceFromPlaceMeters;
    const address = item?.address.replace(/\s/g, '');
    if (!item || typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0 || distance > 5000
      || ids.has(item.id) || addresses.has(address)) return error;
    ids.add(item.id); addresses.add(address);
    items.push({ ...item, distanceFromPlaceMeters: distance });
  }
  return { status: value.status, items, source: value.source.trim(), checkedAt: value.checkedAt };
}
