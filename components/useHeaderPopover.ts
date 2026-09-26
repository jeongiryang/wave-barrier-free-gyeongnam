'use client';
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** Native top layer escapes the header's clipping/stacking contexts. */
export function useHeaderPopover(panel: RefObject<HTMLDivElement | null>, trigger: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  const closeRef = useRef(close);
  useLayoutEffect(() => { closeRef.current = close; });
  useEffect(() => {
    const node = panel.current;
    if (!node) return;
    if (!open) { if (node.matches(':popover-open')) node.hidePopover(); return; }
    const position = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      if (!anchor) return;
      const top = Math.max(8, Math.min(anchor.bottom + 10, window.innerHeight - 120));
      const width = Math.min(352, window.innerWidth - 24);
      node.style.setProperty('--dropdown-top', `${top}px`);
      node.style.setProperty('--dropdown-left', `${Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12))}px`);
      node.style.setProperty('--dropdown-height', `${Math.max(100, window.innerHeight - top - 16)}px`);
    };
    position();
    node.showPopover();
    const toggled = () => { if (!node.matches(':popover-open')) closeRef.current(); };
    node.addEventListener('toggle', toggled);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { node.removeEventListener('toggle', toggled); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); if (node.matches(':popover-open')) node.hidePopover(); };
  }, [open, panel, trigger]);
}
