/** 화면 전환의 명시적 calm 상태만 읽는다. OS 설정은 사이트 애니메이션을 끄지 않는다. */

export function prefersReducedMotion() {
  return typeof document !== "undefined" && document.documentElement?.dataset?.motion === "calm";
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
