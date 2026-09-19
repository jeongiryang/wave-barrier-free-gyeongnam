/**
 * 나루 도움 모음: 대화를 입력하지 않고도 이미 있는 도구를 바로 여는 목록.
 *
 * 이 파일은 순수 함수만 둔다. 네트워크, 브라우저 저장소, 위치 API를
 * 참조하지 않는다. `tool` 값은 반드시 lib/assistant-actions.js 의
 * ASSISTANT_TOOLS 에 이미 있는 값이어야 한다(단위 테스트로 고정).
 */

/** @type {readonly import('./naru-hub').NaruHubItem[]} */
export const NARU_HUB_ITEMS = [
  { id: 'facilities-select', label: '필요한 편의 고르기', tool: 'facilities', requires: 'always' },
  { id: 'readiness-check', label: '출발 전 확인하기', tool: 'readiness', requires: 'itinerary' },
  { id: 'on-trip-order', label: '오늘 일정 순서대로 보기', tool: 'on-trip', requires: 'today' },
  { id: 'inquiry-onsite', label: '현장에서 물어보기', tool: 'inquiry', requires: 'place' },
  { id: 'transport-view', label: '이동 방법 보기', tool: 'transport', requires: 'itinerary' },
  { id: 'saved-trip-open', label: '저장한 여행 열기', tool: 'save', requires: 'saved' },
];

/**
 * 현재 여행 상태에서 조건을 만족하는 항목만, 상한 개수까지 돌려준다.
 * 조건을 만족하지 않는 항목은 비활성 상태가 아니라 완전히 제외된다.
 * @param {readonly import('./naru-hub').NaruHubItem[]} items
 * @param {import('./naru-hub').NaruHubContext} context
 * @param {number} limit
 */
export function visibleNaruHubItems(items, context, limit) {
  const ctx = context || {};
  const matches = requires => {
    if (requires === 'always') return true;
    if (requires === 'itinerary') return Boolean(ctx.hasItinerary);
    if (requires === 'today') return Boolean(ctx.isTripDay);
    if (requires === 'place') return Boolean(ctx.hasFocusedPlace);
    if (requires === 'saved') return Boolean(ctx.hasSavedTrip);
    return false;
  };
  return (items || []).filter(item => matches(item.requires)).slice(0, Math.max(0, limit || 0));
}
