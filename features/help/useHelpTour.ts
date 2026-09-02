"use client";

import { useCallback, useRef, useState } from "react";
import { communitySteps, landingSteps, plannerSteps, travelBookSteps, type TourStep } from "./tour-content";
import { useHelpTourFocus } from "./useHelpTourFocus";
import { useTourSpotlight } from "./useTourSpotlight";

export function useHelpTour() {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTour = useCallback(() => setOpen(false), []);
  const spotlight = useTourSpotlight(open, steps, stepIndex, dialogRef);
  useHelpTourFocus(open, dialogRef, triggerRef, closeTour);

  function startTour() {
    const candidates = document.querySelector(".planner-page") ? plannerSteps
      : document.querySelector(".travel-book-page") ? travelBookSteps
        : document.querySelector(".community-page") ? communitySteps
          : landingSteps;
    const available = candidates.filter((step) => document.querySelector(step.selector));
    spotlight.setHighlight(null);
    setSteps(available);
    setStepIndex(0);
    setOpen(available.length > 0);
  }

  const step = steps[stepIndex];
  return {
    open, steps, step, stepIndex,
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
