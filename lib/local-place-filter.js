/**
 * 지역 가게 보기(스펙 35)의 순수 함수.
 *
 * 어떤 가게가 체인인지 알려주는 공식 제공처가 없다. 그래서 이 파일은 상표
 * 이름 목록을 코드나 데이터로 두지 않는다. 대신 관찰할 수 있는 사실만 다룬다.
 * 지금 화면의 결과 목록 안에서 같은 이름이 몇 번 나오는지 세는 문자열
 * 처리뿐이다. `isChain` 같은 판단 필드를 만들지 않는다.
 */

/**
 * 비교용 문자열을 만든다. 공백, 괄호 안 지점명, 마지막 낱말이 `점`으로
 * 끝나는 흔한 지점 접미사(`통영점`, `본점`, `직영점` 등)를 뗀다. 상표 목록을
 * 참조하지 않는다. 규칙은 문자열 처리뿐이다.
 * @param {unknown} name
 * @returns {string}
 */
export function normalizePlaceName(name) {
  if (typeof name !== 'string') return '';
  let value = name.normalize('NFKC');
  // 괄호 안 지점명을 뗀다. 예: "○○커피(강남점)" → "○○커피"
  value = value.replace(/[([{＜<][^)\]}＞>]*[)\]}＞>]/g, ' ');
  // 공백으로 나뉜 마지막 낱말이 "점"으로 끝나면 지점 표기로 보고 뗀다.
  // 예: "○○김밥 통영점" → "○○김밥"
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && /점$/.test(tokens[tokens.length - 1])) tokens.pop();
  value = tokens.join(' ');
  // 남은 공백·문장부호·대소문자 차이만 지운다.
  return value.toLowerCase().replace(/[\s()[\]{}<>·ㆍ.,'"`~!@#$%^&*_+=|\\/?-]/g, '');
}

/**
 * 지금 결과 목록 안에서 같은 이름끼리 묶는다. 이름이 비어 있거나 정규화
 * 결과가 빈 문자열이거나 `id`가 없는 항목은 판정에서 제외한다.
 * @param {Array<{id:string,name:string}>} places
 * @returns {Array<{normalizedName:string,count:number,ids:string[]}>}
 */
export function groupPlaceNames(places) {
  const groups = new Map();
  for (const place of Array.isArray(places) ? places : []) {
    const id = typeof place?.id === 'string' ? place.id : '';
    const normalized = normalizePlaceName(place?.name);
    if (!id || !normalized) continue;
    const group = groups.get(normalized) || { normalizedName: normalized, count: 0, ids: [] };
    group.count += 1;
    group.ids.push(id);
    groups.set(normalized, group);
  }
  return [...groups.values()];
}

/**
 * 지금 결과 목록 안에서 같은 이름이 `threshold`곳 이상 나온 항목의 id만
 * 돌려준다. 체인이라고 단정하지 않는다. 관찰된 사실(반복 횟수)만 쓴다.
 * @param {Array<{id:string,name:string}>} places
 * @param {number} threshold
 * @returns {string[]}
 */
export function repeatedNameIds(places, threshold) {
  const limit = Number.isFinite(threshold) && threshold > 0 ? threshold : 2;
  return groupPlaceNames(places)
    .filter((group) => group.count >= limit)
    .flatMap((group) => group.ids);
}
