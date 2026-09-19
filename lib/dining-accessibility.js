/**
 * 음식점 접근성 겹쳐 보기(스펙 08)의 순수 함수.
 *
 * 개별 음식점의 후기 수·별점·조회수를 주는 공식 제공처가 없다. 그래서 이 파일은
 * 순위나 인기 점수를 계산하지 않는다. 계산하는 것은 편의 태그 정리, 최대 3개
 * 선택, 거리 반올림, 두 묶음 분리, 중복 상호 제거뿐이다.
 */

/** 카드 한 장에 보여주는 편의 태그 상한. 나머지는 `+N`으로 접는다. */
export const DINING_TAG_LIMIT = 3;

/** 목록 하단에 항상 고정으로 붙는 안내. 미제공을 없음으로 읽지 않게 한다. */
export const DINING_EVIDENCE_NOTE = '편의 정보는 공공데이터에 등록된 내용이에요. 정보가 없다고 해서 시설이 없는 것은 아니에요.';

/** 두 묶음은 근거가 다르므로 섞지 않는다. 제목 아래 근거 한 줄을 함께 적는다. */
export const DINING_GROUPS = {
  official: {
    id: 'official',
    title: '편의 정보가 확인된 음식점',
    evidence: '한국관광공사 무장애 여행정보에 등록된 음식점이에요. 등록된 편의시설만 표시해요.',
  },
  placeSearch: {
    id: 'place-search',
    title: '주변 음식점',
    evidence: '카카오 장소 검색 결과예요. 편의시설은 확인되지 않았어요.',
  },
};

/**
 * 세 상태를 글자로 구분한다. 색만으로 알리지 않는다.
 * @param {{label?:string,state?:string}} facility
 * @returns {string}
 */
export function diningFacilityTagText(facility) {
  const label = typeof facility?.label === 'string' ? facility.label : '';
  if (facility?.state === 'confirmed') return label;
  if (facility?.state === 'negative') return `${label} 없음`;
  return `${label} 정보 없음`;
}

const STATE_ORDER = { confirmed: 0, negative: 1, unknown: 2 };

/**
 * 요청된 편의 조건을 먼저 보여주고, 없으면 확인된 것부터 보여준다.
 * 조건을 결과 수를 늘리려고 해제하지 않으므로 목록 자체는 거르지 않는다.
 * @param {Array<{key:string,label:string,state:string}>} facilities
 * @param {string[]} [requestedKeys]
 * @returns {{shown:Array<{key:string,label:string,state:string}>,hidden:number}}
 */
export function diningFacilityTags(facilities, requestedKeys = []) {
  const list = (Array.isArray(facilities) ? facilities : []).filter((item) => item && typeof item.key === 'string');
  const requested = Array.isArray(requestedKeys) ? requestedKeys.filter((key) => typeof key === 'string') : [];
  const rank = (item) => {
    const at = requested.indexOf(item.key);
    return at >= 0 ? at : requested.length + (STATE_ORDER[item.state] ?? 3);
  };
  const sorted = [...list].sort((a, b) => rank(a) - rank(b));
  return { shown: sorted.slice(0, DINING_TAG_LIMIT), hidden: Math.max(0, sorted.length - DINING_TAG_LIMIT) };
}

/**
 * 거리를 반올림한다. 1km 미만은 10m, 그 이상은 100m 단위로 줄인다.
 * @param {unknown} meters
 * @returns {number|null}
 */
export function roundDiningDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value) || value < 0) return null;
  return value < 1000 ? Math.round(value / 10) * 10 : Math.round(value / 100) * 100;
}

/**
 * 거리 문구는 언제나 기준을 밝힌다. 사용자와의 거리가 아니라 여행지 공개 좌표
 * 기준의 직선거리다.
 * @param {unknown} meters
 * @returns {string}
 */
export function diningDistanceText(meters) {
  const value = roundDiningDistance(meters);
  if (value === null) return '여행지 기준 거리를 확인하지 못했어요';
  return value < 1000 ? `여행지에서 약 ${value}m` : `여행지에서 약 ${(value / 1000).toFixed(1)}km`;
}

/** 중복 판정에 쓰는 거리 허용치. 상호와 거리가 둘 다 맞을 때만 지운다. */
export const DINING_DUPLICATE_METRES = 100;

/**
 * 상호 비교용 정규화. 공백·문장부호·대소문자 차이만 지운다.
 * @param {unknown} name
 * @returns {string}
 */
export function normalizeDiningName(name) {
  if (typeof name !== 'string') return '';
  return name.normalize('NFKC').toLowerCase().replace(/[\s()[\]{}<>·ㆍ.,'"`~!@#$%^&*_+=|\\/?-]/g, '');
}

/**
 * 두 묶음의 상호가 겹치면 관광공사 항목을 남기고 카카오 항목을 지운다.
 * 상호 정규화 문자열과 100m 이내 거리가 둘 다 일치할 때만 지운다.
 * @template {{name?:string,distanceMeters?:number}} T
 * @param {Array<{name?:string,distanceMeters?:number}>} official
 * @param {T[]} nearby
 * @returns {T[]}
 */
export function dedupeNearbyDining(official, nearby) {
  const known = (Array.isArray(official) ? official : []).map((item) => ({
    name: normalizeDiningName(item?.name),
    distance: Number(item?.distanceMeters),
  }));
  return (Array.isArray(nearby) ? nearby : []).filter((item) => {
    const name = normalizeDiningName(item?.name);
    const distance = Number(item?.distanceMeters);
    if (!name || !Number.isFinite(distance)) return true;
    return !known.some((entry) => entry.name && entry.name === name
      && Number.isFinite(entry.distance) && Math.abs(entry.distance - distance) <= DINING_DUPLICATE_METRES);
  });
}

/**
 * 근거가 다른 두 묶음을 나눈다. 섞어서 한 목록으로 만들지 않는다.
 * @template {{evidence?:string}} T
 * @param {T[]} items
 * @returns {{official:T[],placeSearch:T[]}}
 */
export function splitDiningGroups(items) {
  const list = Array.isArray(items) ? items : [];
  return {
    official: list.filter((item) => item?.evidence === 'official'),
    placeSearch: list.filter((item) => item?.evidence === 'place-search'),
  };
}
