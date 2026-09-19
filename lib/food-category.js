/**
 * 음식 종류로 거르기(스펙 39)의 순수 함수.
 *
 * 카카오 장소 검색이 주는 분류 문자열(`음식점 > 한식 > 국밥`)의 두 번째 단계만
 * 종류로 쓴다. 코드를 이름으로 바꾸는 분류표를 이 파일에 두지 않는다. 한국관광
 * 공사 묶음은 `areaBasedList2`가 분류 코드(`cat3`)만 주고 읽을 수 있는 종류
 * 이름을 주지 않으므로(명세 08/39 구현에서 확인) 이 파일은 그 묶음을 다루지
 * 않는다.
 */

/**
 * `음식점 > 한식 > 국밥`에서 `한식`을 꺼낸다. 두 번째 단계가 없으면 `null`을
 * 돌려주고 그 항목은 선택지에 넣지 않는다. 분류표를 참조하지 않는다.
 * @param {unknown} rawCategory
 * @returns {string|null}
 */
export function foodCategoryOf(rawCategory) {
  if (typeof rawCategory !== 'string') return null;
  const parts = rawCategory.split('>').map((part) => part.trim().replace(/\s+/g, ' ')).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[1] || null;
}

/**
 * 지금 결과에 실제로 나타난 종류만 개수와 함께 돌려준다. 결과에 없는 종류를
 * 미리 채워 넣지 않는다.
 * @param {Array<{id:string,category?:string}>} places
 * @returns {Array<{id:string,label:string,count:number}>}
 */
export function foodCategoryOptions(places) {
  const counts = new Map();
  for (const place of Array.isArray(places) ? places : []) {
    const category = foodCategoryOf(place?.category);
    if (!category) continue;
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: id, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
}

/**
 * 선택한 종류 중 하나라도 맞으면 보여준다(합집합). 아무 것도 선택하지 않으면
 * 전부 보여준다. 분류 문자열이 없는 항목은 선택이 하나라도 있으면 빠진다.
 * @template {{category?:string}} T
 * @param {T[]} places
 * @param {string[]} selected
 * @returns {T[]}
 */
export function filterByFoodCategory(places, selected) {
  const list = Array.isArray(places) ? places : [];
  const chosen = Array.isArray(selected) ? selected.filter((id) => typeof id === 'string' && id) : [];
  if (!chosen.length) return list;
  return list.filter((place) => {
    const category = foodCategoryOf(place?.category);
    return category !== null && chosen.includes(category);
  });
}
