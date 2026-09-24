'use client';

import { useEffect, type RefObject } from 'react';

/** Pointer capture keeps a desktop drag continuous without changing travel state. */
export function useNaruDrag(open: boolean, size: string, dialogRef: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = dialogRef.current;
    const heading = dialog?.querySelector<HTMLElement>('.naru-heading');
    if (!open || !dialog || !heading) return;
    let drag: { id: number; dx: number; dy: number } | null = null;
    const reset = () => {
      for (const key of ['left', 'top', 'right', 'bottom', 'margin']) dialog.style.removeProperty(key);
      delete dialog.dataset.moved;
    };
    const place = (x: number, y: number) => {
      const rect = dialog.getBoundingClientRect();
      const gap = 8;
      dialog.style.margin = '0';
      dialog.style.right = 'auto'; dialog.style.bottom = 'auto';
      dialog.style.left = `${Math.max(gap, Math.min(x, innerWidth - rect.width - gap))}px`;
      dialog.style.top = `${Math.max(gap, Math.min(y, innerHeight - rect.height - gap))}px`;
      dialog.dataset.moved = 'true';
    };
    const finish = () => {
      if (drag && heading.hasPointerCapture(drag.id)) heading.releasePointerCapture(drag.id);
      drag = null; delete dialog.dataset.dragging;
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || innerWidth <= 800 ||
          (event.target instanceof Element && event.target.closest('button,a,input,textarea,select,summary,details'))) return;
      const rect = dialog.getBoundingClientRect();
      drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      heading.setPointerCapture(event.pointerId); dialog.dataset.dragging = 'true';
      event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      if (drag?.id === event.pointerId) place(event.clientX - drag.dx, event.clientY - drag.dy);
    };
    const resize = () => {
      finish();
      if (innerWidth <= 800) reset();
      else if (dialog.dataset.moved) { const rect = dialog.getBoundingClientRect(); place(rect.left, rect.top); }
    };
    heading.addEventListener('pointerdown', down); heading.addEventListener('pointermove', move);
    heading.addEventListener('pointerup', finish); heading.addEventListener('pointercancel', finish);
    heading.addEventListener('lostpointercapture', finish); window.addEventListener('resize', resize);
    return () => {
      finish(); reset();
      heading.removeEventListener('pointerdown', down); heading.removeEventListener('pointermove', move);
      heading.removeEventListener('pointerup', finish); heading.removeEventListener('pointercancel', finish);
      heading.removeEventListener('lostpointercapture', finish); window.removeEventListener('resize', resize);
    };
  }, [open, size, dialogRef]);
}
