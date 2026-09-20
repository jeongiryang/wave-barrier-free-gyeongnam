const EARTH_RADIUS_METERS = 6_371_000;

const text = (value, limit = 200) => String(value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, limit);
const first = (record, keys) => {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key];
  return "";
};
const coordinate = (value, min, max) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};

export function trashBinDistanceMeters(from, to) {
  const radians = value => value * Math.PI / 180;
  const lat1 = radians(from.latitude), lat2 = radians(to.latitude);
  const deltaLat = lat2 - lat1, deltaLng = radians(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function normalizeTrashBinRecord(record, placePoint) {
  if (!record || typeof record !== "object") return null;
  const latitude = coordinate(first(record, ["latitude", "lat", "위도"]), -90, 90);
  const longitude = coordinate(first(record, ["longitude", "lng", "lon", "경도"]), -180, 180);
  if (latitude === null || longitude === null) return null;
  const address = text(first(record, ["roadAddress", "address", "installationAddress", "설치주소", "도로명주소", "소재지도로명주소"]), 180);
  const locationNote = text(first(record, ["locationNote", "detailLocation", "installationLocation", "세부위치", "설치위치"]), 180);
  const region = text(first(record, ["province", "sido", "시도명"]), 40);
  if (![address, locationNote, region].some(value => /^(경상남도|경남)(?:\s|$)/.test(value))) return null;
  const referenceDate = text(first(record, ["referenceDate", "dataReferenceDate", "데이터기준일자", "기준일자"]), 20);
  if (!referenceDate || (!address && !locationNote)) return null;
  const kind = text(first(record, ["kind", "binType", "installationType", "쓰레기통종류", "쓰레기통형태", "설치장소유형", "수거쓰레기종류"]), 100);
  const id = text(first(record, ["id", "managementNo", "serialNumber", "관리번호", "연번"]), 100)
    || `${latitude}:${longitude}:${address || locationNote}`;
  return {
    id,
    ...(kind ? { kind } : {}),
    locationNote: [address, locationNote].filter(Boolean).join(" · "),
    distanceMeters: trashBinDistanceMeters(placePoint, { latitude, longitude }),
    destination: { latitude, longitude },
    referenceDate,
  };
}

export function rankTrashBins(records, placePoint, limit = 15) {
  const unique = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const item = normalizeTrashBinRecord(record, placePoint);
    if (!item) continue;
    const key = `${item.destination.latitude}:${item.destination.longitude}:${item.locationNote.replace(/\s+/g, "").toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()]
    .sort((left, right) => left.distanceMeters - right.distanceMeters || left.id.localeCompare(right.id, "ko"))
    .slice(0, Number.isFinite(limit) && limit >= 0 ? limit : 15);
}
