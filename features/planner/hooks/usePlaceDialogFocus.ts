"use client";

import { useEffect, useRef } from "react";

/** Native modal mode makes the rest of the document inert, including maps. */
export function usePlaceDialogFocus(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.querySelector<HTMLElement>("h2")?.focus();
    const cancel = (event: Event) => { event.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose, open]);
  return dialogRef;
}
