/**
 * 편의시설 다중 레이어의 순수 계산.
 *
 * 이 모듈은 네트워크, 브라우저 저장소, 위치 API를 참조하지 않는다. 사용자 위치를
 * 다루지 않으며, 거리 계산은 화면에 보이는 지도 중심 같은 "공개 기준점"과 공개
 * 시설 좌표 사이에서만 이루어진다. 기준점 좌표는 이 모듈 밖으로 저장되지 않는다.
 *
 * 레이어별 상태를 독립적으로 유지하는 것이 이 모듈의 핵심이다. 한 레이어가
 * 실패해도 다른 레이어가 이미 받아온 결과는 그대로 남아야 한다.
 */

/**
 * @typedef {object} FacilityLayerMarker
 * @property {string} id
 * @property {string} layerId
 * @property {string} name
 * @property {string} address
 * @property {{ latitude: number, longitude: number }} destination
 * @property {number | null} distanceMeters
 * @property {string} [referenceDate]
 * @property {string} source
 * @property {string} [detail]
 * @property {string} [institutionName]
 * @property {string} [note]
 */

/**
 * @typedef {object} FacilityLayerSelection
 * @property {string[]} active
 * @property {Record<string, FacilityLayerMarker[]>} markers
 * @property {string[]} failed
 */

/** @returns {FacilityLayerSelection} */
export function emptyFacilitySelection() {
  return { active: [], markers: {}, failed: [] };
}

/**
 * 레이어를 켜고 끈다.
 *
 * 상한에 도달한 상태에서 새 레이어를 켜려 하면 아무 것도 바꾸지 않고 **같은
 * 배열 참조**를 돌려준다. 이미 켜진 레이어를 임의로 끄지 않기 위해서다. 호출부는
 * 반환값이 같은 참조인지로 "상한에 막혔다"를 판별해 안내만 한다.
 *
 * @param {string[]} active
 * @param {string} id
 * @param {number} limit
 * @returns {string[]}
 */
export function toggleFacilityLayer(active, id, limit) {
  const current = Array.isArray(active) ? active : [];
  if (typeof id !== "string" || !id) return current;
  if (current.includes(id)) return current.filter((item) => item !== id);
  if (!Number.isFinite(limit) || current.length >= limit) return current;
  return [...current, id];
}

/**
 * 한 레이어의 마커를 채워 넣는다. 다른 레이어의 결과와 실패 표시는 건드리지 않는다.
 *
 * @param {FacilityLayerSelection} selection
 * @param {string} layerId
 * @param {FacilityLayerMarker[]} markers
 * @returns {FacilityLayerSelection}
 */
export function mergeFacilityMarkers(selection, layerId, markers) {
  const base = normalizeSelection(selection);
  if (typeof layerId !== "string" || !layerId) return base;
  const seen = new Set();
  const kept = [];
  for (const marker of Array.isArray(markers) ? markers : []) {
    const normalized = normalizeMarker(marker, layerId);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    kept.push(normalized);
  }
  return {
    active: base.active,
    markers: { ...base.markers, [layerId]: kept },
    failed: base.failed.filter((item) => item !== layerId),
  };
}

/**
 * 한 레이어를 실패로 표시한다. 다른 레이어가 이미 받아온 마커는 지우지 않는다.
 *
 * @param {FacilityLayerSelection} selection
 * @param {string} layerId
 * @returns {FacilityLayerSelection}
 */
export function failFacilityLayer(selection, layerId) {
  const base = normalizeSelection(selection);
  if (typeof layerId !== "string" || !layerId) return base;
  const markers = { ...base.markers };
  delete markers[layerId];
  return {
    active: base.active,
    markers,
    failed: base.failed.includes(layerId) ? base.failed : [...base.failed, layerId],
  };
}

/**
 * 한 레이어를 끈다. 그 레이어의 마커와 실패 표시만 사라진다.
 *
 * @param {FacilityLayerSelection} selection
 * @param {string} layerId
 * @returns {FacilityLayerSelection}
 */
export function clearFacilityLayer(selection, layerId) {
  const base = normalizeSelection(selection);
  const markers = { ...base.markers };
  delete markers[layerId];
  return {
    active: base.active.filter((item) => item !== layerId),
    markers,
    failed: base.failed.filter((item) => item !== layerId),
  };
}

/**
 * 켜진 레이어의 마커만 모아 가까운 순으로 자른다.
 *
 * 거리를 모르는 항목은 아는 항목보다 뒤에 둔다. 같은 시설이 여러 레이어에서
 * 오면 먼저 켜진 레이어의 것 하나만 남긴다.
 *
 * @param {FacilityLayerSelection} selection
 * @param {number} cap
 * @returns {FacilityLayerMarker[]}
 */
export function visibleFacilityMarkers(selection, cap) {
  const base = normalizeSelection(selection);
  const seen = new Set();
  const pool = [];
  for (const layerId of base.active) {
    for (const marker of base.markers[layerId] || []) {
      if (seen.has(marker.id)) continue;
      seen.add(marker.id);
      pool.push(marker);
    }
  }
  pool.sort((left, right) => {
    const a = typeof left.distanceMeters === "number" ? left.distanceMeters : Number.POSITIVE_INFINITY;
    const b = typeof right.distanceMeters === "number" ? right.distanceMeters : Number.POSITIVE_INFINITY;
    return a - b;
  });
  if (!Number.isFinite(cap) || cap < 0) return pool;
  return pool.slice(0, cap);
}

/**
 * 상한 때문에 그리지 못한 마커 수.
 *
 * @param {FacilityLayerSelection} selection
 * @param {number} cap
 * @returns {number}
 */
export function hiddenFacilityMarkerCount(selection, cap) {
  const total = visibleFacilityMarkers(selection, Number.POSITIVE_INFINITY).length;
  const shown = visibleFacilityMarkers(selection, cap).length;
  return Math.max(0, total - shown);
}

/**
 * 공개 기준점과 공개 시설 좌표 사이의 직선거리(미터).
 * 두 좌표 모두 화면에 이미 보이는 공개 좌표이며, 사용자 위치가 아니다.
 *
 * @param {{ latitude: number, longitude: number }} from
 * @param {{ latitude: number, longitude: number }} to
 * @returns {number | null}
 */
export function facilityDistanceMeters(from, to) {
  const lat1 = Number(from?.latitude), lng1 = Number(from?.longitude);
  const lat2 = Number(to?.latitude), lng2 = Number(to?.longitude);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  const radius = 6_371_000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** @param {unknown} selection @returns {FacilityLayerSelection} */
function normalizeSelection(selection) {
  const value = /** @type {Partial<FacilityLayerSelection>} */ (selection && typeof selection === "object" ? selection : {});
  return {
    active: Array.isArray(value.active) ? value.active.filter((item) => typeof item === "string") : [],
    markers: value.markers && typeof value.markers === "object" ? value.markers : {},
    failed: Array.isArray(value.failed) ? value.failed.filter((item) => typeof item === "string") : [],
  };
}

/** @param {unknown} input @param {string} layerId @returns {FacilityLayerMarker | null} */
function normalizeMarker(input, layerId) {
  if (!input || typeof input !== "object") return null;
  const marker = /** @type {Partial<FacilityLayerMarker>} */ (input);
  const latitude = Number(marker.destination?.latitude);
  const longitude = Number(marker.destination?.longitude);
  if (!marker.id || typeof marker.id !== "string") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  // `Number(null)` 은 0이라 거리 모름이 "0m 거리"로 둔갑한다. 숫자만 거리로 본다.
  const distance = typeof marker.distanceMeters === "number" ? marker.distanceMeters : Number.NaN;
  return {
    id: marker.id,
    layerId,
    name: typeof marker.name === "string" ? marker.name : "",
    address: typeof marker.address === "string" ? marker.address : "",
    destination: { latitude, longitude },
    distanceMeters: Number.isFinite(distance) ? distance : null,
    source: typeof marker.source === "string" ? marker.source : "",
    ...(typeof marker.referenceDate === "string" ? { referenceDate: marker.referenceDate } : {}),
    ...(typeof marker.detail === "string" ? { detail: marker.detail } : {}),
    ...(typeof marker.institutionName === "string" ? { institutionName: marker.institutionName } : {}),
    ...(typeof marker.note === "string" ? { note: marker.note } : {}),
  };
}
