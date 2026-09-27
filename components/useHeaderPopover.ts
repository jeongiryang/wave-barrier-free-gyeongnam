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
    const anchorNode = trigger.current;
    const owner = node.parentElement;
    const originalPadding = owner?.style.paddingBottom || '';
    // Footer menus need real document space below their button, not an upward flip.
    if (anchorNode && owner && !anchorNode.closest('.wave-header') && window.innerHeight - anchorNode.getBoundingClientRect().bottom < 200) {
      owner.style.setProperty('padding-bottom', `${Math.min(320, window.innerHeight / 2)}px`);
      anchorNode.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    const position = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      if (!anchor) return;
      const top = anchor.bottom + 10;
      const width = Math.min(352, window.innerWidth - 24);
      node.style.setProperty('--dropdown-top', `${top}px`);
      node.style.setProperty('--dropdown-left', `${Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12))}px`);
      const viewportBottom = window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : window.innerHeight;
      node.style.setProperty('--dropdown-height', `${Math.max(0, viewportBottom - top - 16)}px`);
    };
    position();
    node.showPopover();
    const toggled = () => { if (!node.matches(':popover-open')) closeRef.current(); };
    node.addEventListener('toggle', toggled);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    return () => { node.removeEventListener('toggle', toggled); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); window.visualViewport?.removeEventListener('resize', position); if (node.matches(':popover-open')) node.hidePopover(); if (owner) owner.style.setProperty('padding-bottom', originalPadding); };
  }, [open, panel, trigger]);
}
