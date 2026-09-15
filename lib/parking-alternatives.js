const EARTH_RADIUS_METERS = 6371000;

const text = (value, limit = 200) => String(value ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
const coordinate = (value, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};

export function parkingDistanceMeters(from, to) {
  const radians = value => value * Math.PI / 180;
  const lat1 = radians(from.latitude), lat2 = radians(to.latitude);
  const deltaLat = lat2 - lat1, deltaLng = radians(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function operatingHours(record) {
  const groups = [
    ['평일', record.weekdayOperOpenHhmm, record.weekdayOperColseHhmm],
    ['토요일', record.satOperOperOpenHhmm, record.satOperCloseHhmm],
    ['공휴일', record.holidayOperOpenHhmm, record.holidayCloseOpenHhmm],
  ].map(([label, open, close]) => {
    const start = text(open, 10), end = text(close, 10);
    return start && end ? `${label} ${start}–${end}` : '';
  }).filter(Boolean);
  const days = text(record.operDay, 60);
  return [days, ...groups].filter(Boolean).join(' · ') || undefined;
}

export function normalizeParkingRecord(record, placePoint) {
  if (!record || typeof record !== 'object' || text(record.pwdbsPpkZoneYn, 4).toUpperCase() !== 'Y') return null;
  const name = text(record.prkplceNm, 100);
  const road = text(record.rdnmadr, 180), lot = text(record.lnmadr, 180);
  const address = road || lot;
  const referenceDate = text(record.referenceDate, 20);
  const latitude = coordinate(record.latitude, -90, 90), longitude = coordinate(record.longitude, -180, 180);
  if (!name || !address.startsWith('경상남도') || !referenceDate || latitude === null || longitude === null) return null;
  const distanceMeters = parkingDistanceMeters(placePoint, { latitude, longitude });
  if (distanceMeters > 2000) return null;
  const rawPhone = text(record.phoneNumber, 40);
  const phoneNumber = /^[0-9+()\-\s]{7,30}$/.test(rawPhone) ? rawPhone : undefined;
  return {
    id: text(record.prkplceNo, 80) || `${address}:${name}`,
    name,
    address,
    distanceMeters,
    accessibleZone: 'confirmed',
    operatingHours: operatingHours(record),
    feeInformation: text(record.parkingchrgeInfo, 100) || undefined,
    institutionName: text(record.institutionNm, 100) || undefined,
    phoneNumber,
    referenceDate,
    destination: { latitude, longitude },
  };
}

export function rankParkingAlternatives(records, placePoint, limit = 3) {
  const unique = new Map();
  for (const record of records) {
    const item = normalizeParkingRecord(record, placePoint);
    if (!item) continue;
    const addressKey = item.address.replace(/\s+/g, '').toLowerCase();
    const keys = [`id:${item.id}`, `address:${addressKey}`];
    if (keys.some(key => unique.has(key))) continue;
    keys.forEach(key => unique.set(key, item));
  }
  return [...new Set(unique.values())].sort((a, b) =>
    a.distanceMeters - b.distanceMeters
    || Number(Boolean(b.operatingHours)) - Number(Boolean(a.operatingHours))
    || Number(Boolean(b.phoneNumber)) - Number(Boolean(a.phoneNumber))
    || b.referenceDate.localeCompare(a.referenceDate)
    || a.name.localeCompare(b.name, 'ko')
  ).slice(0, limit);
}
