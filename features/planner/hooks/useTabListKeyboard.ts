import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { nextTabIndex, rovingTabIndex } from "../../../lib/a11y/tablist.js";

/**
 * `role="tablist"` 안에서 화살표·Home·End로 탭을 옮긴다.
 *
 * 탭 목록은 Tab 키 한 번에 걸리고 그 안은 화살표로 옮기는 것이 표준 동작이라,
 * 선택된 탭만 탭 순서에 남기고(로빙 tabindex) 나머지는 뺀다.
 */
export function useTabListKeyboard<Id extends string>(ids: readonly Id[], activeId: Id, onSelect: (id: Id) => void) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const movedByKey = useRef(false);

  // 초점은 리렌더 뒤에 옮긴다. 핸들러 안에서 바로 옮기면 아직 tabindex가 -1인
  // 옛 DOM을 잡아 선택만 움직이고 초점은 제자리에 남는다.
  useEffect(() => {
    if (!movedByKey.current) return;
    movedByKey.current = false;
    listRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  }, [activeId]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const target = nextTabIndex(event.key, ids.indexOf(activeId), ids.length);
    if (target === null) return;
    const id = ids[target];
    if (id === undefined) return;
    event.preventDefault();
    movedByKey.current = true;
    onSelect(id);
  }, [activeId, ids, onSelect]);

  const tabProps = useCallback((id: Id) => ({
    role: "tab" as const,
    "aria-selected": activeId === id,
    tabIndex: rovingTabIndex(activeId === id),
  }), [activeId]);

  return { listRef, onKeyDown, tabProps };
}
