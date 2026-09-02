"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import type { TourStep } from "./tour-content";
import { prefersReducedMotion } from "../../lib/reduced-motion.js";

export type TourHighlight = { top: number; left: number; width: number; height: number };

export function useTourSpotlight(open: boolean, steps: TourStep[], stepIndex: number, dialogRef: RefObject<HTMLDivElement | null>) {
  const [highlight, setHighlight] = useState<TourHighlight | null>(null);

  useEffect(() => {
    if (!open) return;
    const step = steps[stepIndex];
    const section = step ? document.querySelector<HTMLElement>(step.selector) : null;
    const target = step ? document.querySelector<HTMLElement>(step.highlightSelector) || section : null;
    if (!section || !target) return;
    section.dataset.helpTourActive = "true";
    const reduced = prefersReducedMotion();
    const targetTop = window.scrollY + target.getBoundingClientRect().top - Math.min(104, window.innerHeight * 0.16);
    window.scrollTo({ top: Math.max(0, targetTop), behavior: reduced ? "auto" : "smooth" });

    let frame = 0;
    const updateHighlight = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const gutter = 12;
      const dialog = dialogRef.current?.getBoundingClientRect();
      const left = Math.max(gutter, rect.left - 8);
      const right = Math.min(window.innerWidth - gutter, rect.right + 8);
      const top = Math.max(gutter, rect.top - 8);
      const overlapsDialog = dialog && right > dialog.left - gutter && left < dialog.right + gutter;
      const availableBottom = overlapsDialog ? Math.min(window.innerHeight - gutter, dialog.top - gutter) : window.innerHeight - gutter;
      const bottom = Math.min(availableBottom, rect.bottom + 8, top + Math.max(120, window.innerHeight * 0.46));
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);
      if (width < 40 || height < 40) {
        setHighlight(null);
        return;
      }
      setHighlight({ top, left, width, height });
    };
    const queueUpdate = () => { if (!frame) frame = window.requestAnimationFrame(updateHighlight); };
    queueUpdate();
    const settleTimer = window.setTimeout(queueUpdate, reduced ? 0 : 520);
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(queueUpdate);
    resizeObserver?.observe(target);
    return () => {
      delete section.dataset.helpTourActive;
      window.clearTimeout(settleTimer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      resizeObserver?.disconnect();
    };
  }, [dialogRef, open, stepIndex, steps]);

  const spotlightStyle = highlight ? ({ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height } satisfies CSSProperties) : undefined;
  return { highlight, setHighlight, spotlightStyle };
}
