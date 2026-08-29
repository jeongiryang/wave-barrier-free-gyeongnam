/**
 * 탭 목록 키보드 이동.
 *
 * `role="tablist"`을 붙이면 보조기술은 "탭 1/6"이라고 읽어 주고, 사용자는
 * 화살표로 옮겨 다닐 수 있다고 기대한다(WAI-ARIA Authoring Practices, Tabs).
 * 역할만 붙이고 키 처리를 하지 않으면 화살표를 눌러도 아무 일도 일어나지 않는다.
 * 안내받은 조작 방법이 통하지 않는 쪽이 역할이 아예 없는 것보다 나쁘다.
 *
 * 어느 탭으로 갈지 계산하는 부분만 떼어 둔다. DOM 없이 검증할 수 있어야 한다.
 */

/**
 * 누른 키에 해당하는 다음 탭 위치를 돌려준다. 처리할 키가 아니면 null이다.
 *
 * 좌우 끝에서는 반대편으로 감는다. 목록이 끝났다고 초점이 사라지면 사용자는
 * 자기가 어디 있는지 잃는다.
 *
 * @param {string} key - KeyboardEvent.key
 * @param {number} currentIndex
 * @param {number} count
 * @returns {number | null}
 */
export function nextTabIndex(key, currentIndex, count) {
  if (!Number.isInteger(count) || count <= 0) return null;
  const current = Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < count ? currentIndex : 0;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/**
 * 로빙 tabindex 값. 탭 목록 전체가 Tab 한 번에 걸리고, 그 안은 화살표로 옮긴다.
 * 여섯 개 필터를 Tab으로 여섯 번 지나쳐야 지도에 닿는 상태를 없앤다.
 *
 * @param {boolean} selected
 * @returns {0 | -1}
 */
export function rovingTabIndex(selected) {
  return selected ? 0 : -1;
}
