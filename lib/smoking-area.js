/**
 * 전국금연구역표준데이터를 화면 계약으로 바꾸는 순수 함수.
 * 사용자 위치는 받지 않으며, 관광지 공개 좌표와 공공데이터 좌표만 계산한다.
 */

const text = (value, max = 300) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** @param {{ latitude: number, longitude: number }} from @param {{ latitude: number, longitude: number }} to */
export function smokingAreaDistanceMeters(from, to) {
  const lat1 = Number(from?.latitude), lng1 = Number(from?.longitude);
  const lat2 = Number(to?.latitude), lng2 = Number(to?.longitude);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  if (lat2 < -90 || lat2 > 90 || lng2 < -180 || lng2 > 180) return null;
  const radius = 6_371_000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * @param {unknown[]} records
 * @param {{ latitude: number, longitude: number }} origin
 * @returns {import('./smoking-area.js').SmokingAreaItem[]}
 */
export function normalizeNoSmokingAreas(records, origin) {
  const seen = new Set();
  const items = [];
  for (const value of Array.isArray(records) ? records : []) {
    if (!value || typeof value !== "object") continue;
    const record = /** @type {Record<string, unknown>} */ (value);
    if (text(record.ctprvnNm, 30) !== "경상남도") continue;
    const rawLatitude = text(record.latitude, 30), rawLongitude = text(record.longitude, 30);
    if (!rawLatitude || !rawLongitude) continue;
    const latitude = Number(rawLatitude), longitude = Number(rawLongitude);
    const distanceMeters = smokingAreaDistanceMeters(origin, { latitude, longitude });
    const name = text(record.prhsmkNm, 120);
    const address = text(record.rdnmadr, 240) || text(record.lnmadr, 240);
    const referenceDate = text(record.referenceDate, 10);
    if (!name || !address || distanceMeters === null || !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) continue;
    const institutionName = text(record.institutionNm, 120);
    const note = text(record.prhsmkScopeDesc, 300);
    const id = `${name}|${address}|${latitude.toFixed(7)}|${longitude.toFixed(7)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      name,
      address,
      distanceMeters,
      destination: { latitude, longitude },
      ...(institutionName ? { institutionName } : {}),
      ...(note ? { note } : {}),
      referenceDate,
    });
  }
  return items.sort((left, right) => left.distanceMeters - right.distanceMeters).slice(0, 10);
}

/**
 * @typedef {object} SmokingAreaItem
 * @property {string} id
 * @property {string} name
 * @property {string} address
 * @property {number} distanceMeters
 * @property {{ latitude: number, longitude: number }} destination
 * @property {string} [institutionName]
 * @property {string} [note]
 * @property {string} referenceDate
 */
