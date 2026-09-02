/**
 * 움직임 줄이기 설정을 존중하는 화면 이동.
 *
 * `scrollIntoView`에 넘긴 `behavior`는 CSS `scroll-behavior`를 이긴다. 그래서
 * 스타일시트에서 `scroll-behavior: auto`를 아무리 강하게 걸어도, 코드가
 * `behavior: "smooth"`를 그대로 넘기면 사용자가 끈 애니메이션이 그대로 돈다.
 * 이동을 시작하는 쪽에서 설정을 읽어야 한다.
 */

export function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return (typeof document !== "undefined" && document.documentElement?.dataset?.motion === "calm")
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * @param {boolean} [reduced]
 * @returns {ScrollBehavior}
 */
export function scrollBehavior(reduced = prefersReducedMotion()) {
  return reduced ? "auto" : "smooth";
}

/**
 * 화면의 한 구역으로 이동한다. 대상이 없으면 아무것도 하지 않는다.
 * @param {string} sectionId
 * @param {boolean} [reduced]
 * @returns {boolean} 실제로 이동했는지
 */
export function scrollToSection(sectionId, reduced = prefersReducedMotion()) {
  if (typeof document === "undefined") return false;
  const target = document.getElementById(sectionId);
  if (!target) return false;
  target.scrollIntoView({ behavior: scrollBehavior(reduced) });
  return true;
}
