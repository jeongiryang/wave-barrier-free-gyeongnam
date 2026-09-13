"use client";

import { useEffect, useRef } from "react";

/** Native modal mode makes the rest of the document inert, including maps. */
export function usePlaceDialogFocus(open: boolean, onClose: () => void, sidePanel = false) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const media = matchMedia('(min-width:1024px)');
    const present = () => {
      const focus = dialog.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
      const scroll = dialog.scrollTop;
      if (dialog.open) dialog.close();
      if (sidePanel && media.matches) { dialog.show(); document.body.style.overflow = previousOverflow; }
      else { dialog.showModal(); document.body.style.overflow = 'hidden'; }
      dialog.scrollTop = scroll; focus?.focus({ preventScroll: true });
    };
    present(); media.addEventListener('change', present);
    dialog.querySelector<HTMLElement>("h2")?.focus();
    const cancel = (event: Event) => { event.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", cancel);
    const containTab = (event: KeyboardEvent) => {
      if (sidePanel && media.matches) { if (event.key === 'Escape') { event.preventDefault(); onClose(); } return; }
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]')]
        .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); return; }
      const active = document.activeElement as HTMLElement;
      if (!controls.includes(active) || event.shiftKey && active === first || !event.shiftKey && active === last) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    dialog.addEventListener("keydown", containTab);
    return () => {
      media.removeEventListener("change", present);
      dialog.removeEventListener("cancel", cancel);
      dialog.removeEventListener("keydown", containTab);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus.getClientRects().length) previousFocus.focus({ preventScroll: true });
    };
  }, [onClose, open, sidePanel]);
  return dialogRef;
}
