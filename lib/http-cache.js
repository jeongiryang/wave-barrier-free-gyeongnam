/**
 * 응답 캐시 정책.
 *
 * 실패는 절대 캐시하지 않는다. 상류가 잠깐 흔들려 502를 돌려준 응답에 CDN 캐시
 * 헤더가 붙으면 그 실패가 엣지에 30분 고정된다. 상류가 복구돼도 사용자는 계속
 * 실패 화면을 보고, 새로고침도 재시도 버튼도 소용이 없다. 성공과 실패를 같은
 * 자리에서 만들어 내는 핸들러가 있으므로 상태 코드로 여기서 막는다.
 */

export const PUBLIC_CACHE_CONTROL = "public, max-age=300, s-maxage=1800";
export const NO_STORE = "no-store";

/**
 * @param {boolean} cacheable 핸들러가 이 응답을 캐시해도 된다고 본 값
 * @param {number} status
 * @returns {string}
 */
export function cacheControlHeader(cacheable, status) {
  return cacheable && status >= 200 && status < 400 ? PUBLIC_CACHE_CONTROL : NO_STORE;
}
