/**
 * 휠체어 통행 정보 표시(스펙 13)의 대체 설계(2단계) 문구.
 *
 * 0단계 검증: 공공데이터포털에서 경상남도 표본이 있는 "무장애 보행로" 또는
 * "보행자 이동편의시설" OpenAPI를 찾지 못했다(자세한 내용은
 * docs/ai-logs/spec-13-wheelchair-route-layer.md 참고). 그래서 지도에 구간을
 * 그리는 1단계 대신, 이미 있는 `KorWithService2/detailWithTour2`의 `route`
 * 필드를 이동 관점으로 다시 묶어 보여주는 2단계 대체 설계를 구현한다.
 *
 * 경로가 조회됐다는 사실이 휠체어 통행 가능을 뜻하지 않는다(CLAUDE.md의 유지
 * 결정). 이 모듈은 그 경계를 지키는 고정 문구만 담는다. 통행 가능 여부를
 * 뜻하는 불리언은 만들지 않는다. 순수 데이터만 담으며 네트워크·저장소·위치
 * API를 참조하지 않는다.
 */

/** @typedef {'confirmed' | 'unknown' | 'negative'} RouteFieldState */

/** @type {Record<RouteFieldState, string>} */
export const WHEELCHAIR_ROUTE_STATE_TEXT = Object.freeze({
  confirmed: "출입구까지 접근로가 등록돼 있어요.",
  negative: "접근로가 없다고 등록돼 있어요.",
  unknown: "접근로 정보가 등록돼 있지 않아요.",
});

/** 상태와 무관하게 항상 함께 두는 문구. 경로 조회 결과를 통행 가능 근거로 쓰지 않는다는 것을 알린다. */
export const WHEELCHAIR_ROUTE_DISCLAIMER = "주차장에서 입구까지의 계단 없는 길은 확인되지 않았어요.";

/** @param {string} [state] @returns {string} */
export function wheelchairRouteStateText(state) {
  return WHEELCHAIR_ROUTE_STATE_TEXT[/** @type {RouteFieldState} */ (state)] || WHEELCHAIR_ROUTE_STATE_TEXT.unknown;
}
