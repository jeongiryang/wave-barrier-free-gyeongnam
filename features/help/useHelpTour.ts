"use client";

import { useCallback, useRef, useState } from "react";
import type { TourStep } from "./tour-content";
import { useSitePreferences } from "../../components/SitePreferences";
import { useHelpTourFocus } from "./useHelpTourFocus";
import { useTourSpotlight } from "./useTourSpotlight";

export function useHelpTour() {
  const { locale } = useSitePreferences();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<typeof import("./tour-content") | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadLock = useRef(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTour = useCallback(() => setOpen(false), []);
  const spotlight = useTourSpotlight(open, steps, stepIndex, dialogRef);
  useHelpTourFocus(open, dialogRef, triggerRef, closeTour);

  async function startTour() {
    if (loadLock.current) return;
    loadLock.current = true;
    setLoading(true);
    setLoadFailed(false);
    try {
      const loaded = content || await import("./tour-content");
      setContent(loaded);
      const candidates = document.querySelector(".planner-page") ? loaded.plannerSteps
        : document.querySelector(".travel-book-page") ? loaded.travelBookSteps
          : document.querySelector(".community-page") ? loaded.communitySteps
            : loaded.landingSteps;
      const available = candidates.filter((step) => {
        const target = document.querySelector<HTMLElement>(step.selector);
        return target && target.getClientRects().length > 0 && getComputedStyle(target).visibility !== "hidden";
      });
      spotlight.setHighlight(null);
      setSteps(available);
      setStepIndex(0);
      setOpen(available.length > 0);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
      loadLock.current = false;
    }
  }

  const step = steps[stepIndex] && content ? content.localizeTourStep(steps[stepIndex], locale) : undefined;
  return {
    open, steps, step, stepIndex, loading, loadFailed,
    highlight: spotlight.highlight,
    spotlightStyle: spotlight.spotlightStyle,
    dialogRef, triggerRef, startTour, closeTour,
    previousStep: () => {
      spotlight.setHighlight(null);
      setStepIndex((index) => Math.max(0, index - 1));
    },
    nextStep: () => {
      if (stepIndex === steps.length - 1) closeTour();
      else {
        spotlight.setHighlight(null);
        setStepIndex((index) => index + 1);
      }
    },
  };
}
