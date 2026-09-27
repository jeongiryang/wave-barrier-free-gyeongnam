'use client';

import { useLayoutEffect, type RefObject } from 'react';

/** Keep the dialog above an overlay keyboard without changing travel state. */
export function useNaruViewport(open: boolean, dialogRef: RefObject<HTMLDialogElement | null>, logRef: RefObject<HTMLDivElement | null>, follow: RefObject<boolean>) {
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      // Pinch zoom must remain browser-controlled so magnified content can pan.
      if (viewport && viewport.scale !== 1) return;
      const height = viewport?.height ?? window.innerHeight;
      dialog.style.setProperty('--naru-visible-height', `${height}px`);
      dialog.style.setProperty('--naru-visible-top', `${viewport?.offsetTop ?? 0}px`);
      dialog.dataset.shortViewport = String(height < 560);
      if (follow.current && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      // Responsive reflow can move the focused tool behind the fixed tab bar.
      // Reveal it inside its own scrolling pane without moving focus or the page.
      const focused = document.activeElement;
      const pane = focused?.closest<HTMLElement>('.naru-workspace-content,.naru-workspace-sidebar');
      if (focused instanceof HTMLElement && pane && dialog.contains(pane)) {
        const target = focused.getBoundingClientRect(), bounds = pane.getBoundingClientRect();
        if (target.height > 0 && bounds.height > 0) {
          const delta = target.top < bounds.top ? target.top - bounds.top
            : target.bottom > bounds.bottom ? target.bottom - bounds.bottom : 0;
          if (delta) pane.scrollBy({ top: delta, behavior: 'instant' });
        }
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      dialog.style.removeProperty('--naru-visible-height');
      dialog.style.removeProperty('--naru-visible-top');
      delete dialog.dataset.shortViewport;
    };
  }, [open, dialogRef, logRef, follow]);
}
