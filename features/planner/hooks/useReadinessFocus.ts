"use client";

import { useCallback, useEffect, useRef, type FocusEvent } from "react";

// Late itinerary content above this card can displace a control after native focus scrolls it.
export function useReadinessFocus() {
  const root = useRef<HTMLElement>(null);
  const focused = useRef<HTMLElement | null>(null);
  const frame = useRef(0);
  const reveal = useCallback(() => {
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      const target = focused.current;
      if (!target?.isConnected || document.activeElement !== target) return;
      const box = target.getBoundingClientRect();
      const headerBottom = document.querySelector(".site-header")?.getBoundingClientRect().bottom || 0;
      const rail = document.querySelector(".journey-rail");
      const bottom = rail && getComputedStyle(rail).position === "fixed" ? rail.getBoundingClientRect().top : window.innerHeight;
      if (box.top < Math.max(0, headerBottom) + 8 || box.bottom > bottom - 8) {
        target.scrollIntoView({ block: "center", behavior: "instant" });
      }
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const stopFollowing = () => { focused.current = null; window.cancelAnimationFrame(frame.current); };
    for (const type of ["wheel", "touchstart", "pointerdown"]) {
      window.addEventListener(type, stopFollowing, { capture: true, passive: true, signal: controller.signal });
    }
    const workspace = root.current?.closest(".journey-stage-stream");
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(reveal);
    if (workspace) observer?.observe(workspace);
    return () => { stopFollowing(); observer?.disconnect(); controller.abort(); };
  }, [reveal]);

  const onFocusCapture = (event: FocusEvent<HTMLElement>) => {
    focused.current = event.target.matches("button, a") ? event.target : null;
    reveal();
  };
  const onBlurCapture = () => { focused.current = null; };
  return { ref: root, onFocusCapture, onBlurCapture };
}
