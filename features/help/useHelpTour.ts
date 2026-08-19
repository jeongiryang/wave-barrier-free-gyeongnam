"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { landingSteps, plannerSteps, type TourStep } from "./tour-content";

type Highlight = {
  top: number;
  left: number;
  width: number;
  height: number;
  pointerX: number;
  pointerY: number;
};

export function useHelpTour() {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function startTour() {
    const candidates = document.querySelector(".planner-page") ? plannerSteps : landingSteps;
    const available = candidates.filter((step) => document.querySelector(step.selector));
    setHighlight(null);
    setSteps(available);
    setStepIndex(0);
    setOpen(available.length > 0);
  }

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLButtonElement>(".help-tour-close")?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const step = steps[stepIndex];
    const section = step ? document.querySelector<HTMLElement>(step.selector) : null;
    const target = step ? document.querySelector<HTMLElement>(step.highlightSelector) || section : null;
    if (!section || !target) return;
    section.dataset.helpTourActive = "true";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      const availableBottom = overlapsDialog
        ? Math.min(window.innerHeight - gutter, dialog.top - gutter)
        : window.innerHeight - gutter;
      const bottom = Math.min(availableBottom, rect.bottom + 8, top + Math.max(120, window.innerHeight * 0.46));
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);
      if (width < 40 || height < 40) {
        setHighlight(null);
        return;
      }
      setHighlight({
        top,
        left,
        width,
        height,
        pointerX: Math.min(window.innerWidth - 26, Math.max(20, right - 34)),
        pointerY: Math.min(window.innerHeight - 26, Math.max(20, top + Math.min(32, height / 2))),
      });
    };
    const queueUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateHighlight);
    };
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
  }, [open, stepIndex, steps]);

  const step = steps[stepIndex];
  const spotlightStyle = highlight ? ({
    top: highlight.top,
    left: highlight.left,
    width: highlight.width,
    height: highlight.height,
  } satisfies CSSProperties) : undefined;
  const pointerStyle = highlight ? ({
    left: highlight.pointerX,
    top: highlight.pointerY,
  } satisfies CSSProperties) : undefined;

  return {
    open,
    steps,
    step,
    stepIndex,
    highlight,
    spotlightStyle,
    pointerStyle,
    dialogRef,
    triggerRef,
    startTour,
    closeTour: () => setOpen(false),
    previousStep: () => {
      setHighlight(null);
      setStepIndex((index) => Math.max(0, index - 1));
    },
    nextStep: () => {
      if (stepIndex === steps.length - 1) setOpen(false);
      else {
        setHighlight(null);
        setStepIndex((index) => index + 1);
      }
    },
  };
}
