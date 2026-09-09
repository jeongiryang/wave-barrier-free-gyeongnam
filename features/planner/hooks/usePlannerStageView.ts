"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { prefersReducedMotion, scrollToSection } from "../../../lib/reduced-motion.js";
import type { JourneyStepId } from "./useJourneyProgress";

export type PlannerStageView = "guided" | "overview";

const STORAGE_KEY = "wave-planner-stage-view-v1";
const STEP_STORAGE_KEY = "wave-planner-active-step-v1";
const listeners = new Set<() => void>();
let fallbackView: PlannerStageView = "guided";
let fallbackStep: JourneyStepId = "conditions";

const STEP_IDS: JourneyStepId[] = ["conditions", "places", "itinerary", "departure-readiness"];
const HASH_STEPS: Record<string, { step: JourneyStepId; target: string }> = {
  conditions: { step: "conditions", target: "conditions" },
  places: { step: "places", target: "places" },
  itinerary: { step: "itinerary", target: "itinerary" },
  route: { step: "itinerary", target: "itinerary" },
  navigation: { step: "itinerary", target: "navigation" },
  "departure-readiness": { step: "departure-readiness", target: "departure-readiness" },
  layers: { step: "departure-readiness", target: "layers" },
  crowd: { step: "departure-readiness", target: "crowd" },
};

function currentView(): PlannerStageView {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "guided" || stored === "overview") return stored;
    return fallbackView;
  } catch {
    return fallbackView;
  }
}

function currentStep(): JourneyStepId {
  try {
    const stored = window.sessionStorage.getItem(STEP_STORAGE_KEY) as JourneyStepId | null;
    if (stored && STEP_IDS.includes(stored)) return stored;
    return fallbackStep;
  } catch {
    return fallbackStep;
  }
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function serverView(): PlannerStageView {
  return "guided";
}

function serverStep(): JourneyStepId {
  return "conditions";
}

export function usePlannerStageView() {
  const view = useSyncExternalStore(subscribe, currentView, serverView);
  const activeStepId = useSyncExternalStore(subscribe, currentStep, serverStep);
  const [focusTarget, setFocusTarget] = useState<{ id: string } | null>(null);
  const focusedRequest = useRef(focusTarget);

  const changeView = useCallback((next: PlannerStageView) => {
    fallbackView = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 보기 방식 저장 실패는 현재 화면 사용을 막지 않는다.
    }
    listeners.forEach((listener) => listener());
  }, []);

  const changeStep = useCallback((next: JourneyStepId, navigate = false, target: JourneyStepId | "layers" | "crowd" = next) => {
    if (navigate) {
      const url = new URL(window.location.href);
      if (url.hash !== `#${target}`) {
        url.hash = target;
        window.history.pushState(null, "", url);
      }
      setFocusTarget({ id: target });
    }
    fallbackStep = next;
    try {
      window.sessionStorage.setItem(STEP_STORAGE_KEY, next);
    } catch {
      // 현재 단계 저장 실패는 단계 이동을 막지 않는다.
    }
    listeners.forEach((listener) => listener());
  }, []);

  useLayoutEffect(() => {
    if (!focusTarget || focusedRequest.current === focusTarget) return;
    const section = document.getElementById(focusTarget.id);
    if (!section || section.closest("[hidden]")) return;
    const heading = focusTarget.id === "layers"
      ? section.querySelector<HTMLElement>("summary") || section
      : section.querySelector<HTMLElement>("h2, h3") || section;
    // Keep the native disclosure in the tab order. Its name is the visible
    // start of this panel; a nested heading can be below a long forecast.
    if (heading.tagName !== "SUMMARY") heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
    scrollToSection(focusTarget.id, true);
    focusedRequest.current = focusTarget;
  }, [activeStepId, view, focusTarget]);

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    const sync = (event?: Event) => {
      const destination = HASH_STEPS[window.location.hash.slice(1)] || HASH_STEPS.conditions;
      changeStep(destination.step);
      if (event) setFocusTarget({ id: destination.target });
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => scrollToSection(destination.target, prefersReducedMotion()));
      });
    };
    if (window.location.hash) sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [changeStep]);

  return { view, activeStepId, changeView, changeStep };
}
