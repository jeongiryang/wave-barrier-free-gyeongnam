"use client";

import { useLayoutEffect, type RefObject } from "react";

export function useHelpTourFocus(open: boolean, dialogRef: RefObject<HTMLDivElement | null>, triggerRef: RefObject<HTMLButtonElement | null>, close: () => void) {
  useLayoutEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    // Focus must already be inside when the dialog is presented. A later timer can
    // let the first Tab escape, then unexpectedly move focus after that keypress.
    dialogRef.current?.querySelector<HTMLButtonElement>(".help-tour-close")?.focus();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [close, dialogRef, open, triggerRef]);
}
