import { facilityDistanceMeters } from './facility-layers.js';

const text = (value, max = 240) => typeof value === 'string' || typeof value === 'number'
  ? String(value).replace(/\s+/g, ' ').trim().slice(0, max)
  : '';
const first = (value, keys, max) => {
  for (const key of keys) { const found = text(value?.[key], max); if (found) return found; }
  return '';
};
const number = (value, keys) => {
  for (const key of keys) { const found = Number(value?.[key]); if (Number.isFinite(found)) return found; }
  return Number.NaN;
};

export function normalizeSanitarySupply(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const name = first(value, ['name', 'placeName', 'fcltyNm', 'insttNm', 'toiletNm'], 120);
  const address = first(value, ['address', 'roadAddress', 'rdnmadr', 'lnmadr', 'adres'], 240);
  const latitude = number(value, ['latitude', 'lat', 'la', 'y']);
  const longitude = number(value, ['longitude', 'lng', 'lon', 'lo', 'x']);
  if (!name || !address || !/^(경상남도|경남)\s/.test(address) || latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132) return null;
  const referenceDate = first(value, ['referenceDate', 'dataStdDe', 'lastUpdated', 'baseDate'], 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) return null;
  const id = first(value, ['id', 'manageNo', 'fcltyId', 'toiletId'], 80) || `${name}-${address}`;
  const availableHours = first(value, ['availableHours', 'openingHours', 'useTime', 'operTime'], 120);
  const usageNote = first(value, ['usageNote', 'useCondition', 'chargeInfo', 'freeYn'], 200);
  const institutionName = first(value, ['institutionName', 'institutionNm', 'manageInsttNm', 'provider'], 120);
  return { id, name, address, destination: { latitude, longitude }, referenceDate,
    ...(availableHours ? { availableHours } : {}), ...(usageNote ? { usageNote } : {}), ...(institutionName ? { institutionName } : {}) };
}

export function rankSanitarySupplies(values, origin, limit = 5) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.flatMap(value => {
    const item = normalizeSanitarySupply(value);
    if (!item) return [];
    const key = `${item.name}|${item.address}`.replace(/\s/g, '').toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    const distanceMeters = facilityDistanceMeters(origin, item.destination);
    return distanceMeters === null ? [] : [{ ...item, distanceMeters }];
  }).sort((a, b) => a.distanceMeters - b.distanceMeters || a.name.localeCompare(b.name, 'ko')).slice(0, Math.max(0, Math.min(5, limit)));
}
