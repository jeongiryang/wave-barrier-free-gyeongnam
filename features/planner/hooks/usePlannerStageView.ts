"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { JourneyStepId } from "./useJourneyProgress";

export type PlannerStageView = "guided" | "overview";

const STORAGE_KEY = "wave-planner-stage-view-v1";
const STEP_STORAGE_KEY = "wave-planner-active-step-v1";
const listeners = new Set<() => void>();
let fallbackView: PlannerStageView = "guided";
let fallbackStep: JourneyStepId = "conditions";

const STEP_IDS: JourneyStepId[] = ["conditions", "places", "itinerary", "departure-readiness"];

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

  const changeView = useCallback((next: PlannerStageView) => {
    fallbackView = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 보기 방식 저장 실패는 현재 화면 사용을 막지 않는다.
    }
    listeners.forEach((listener) => listener());
  }, []);

  const changeStep = useCallback((next: JourneyStepId) => {
    fallbackStep = next;
    try {
      window.sessionStorage.setItem(STEP_STORAGE_KEY, next);
    } catch {
      // 현재 단계 저장 실패는 단계 이동을 막지 않는다.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { view, activeStepId, changeView, changeStep };
}
