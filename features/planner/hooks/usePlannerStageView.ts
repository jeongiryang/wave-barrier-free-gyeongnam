"use client";

import { useCallback, useSyncExternalStore } from "react";

export type PlannerStageView = "guided" | "overview";

const STORAGE_KEY = "wave-planner-stage-view-v1";
const listeners = new Set<() => void>();
let fallbackView: PlannerStageView = "guided";

function currentView(): PlannerStageView {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "guided" || stored === "overview") return stored;
    return fallbackView;
  } catch {
    return fallbackView;
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

export function usePlannerStageView() {
  const view = useSyncExternalStore(subscribe, currentView, serverView);

  const changeView = useCallback((next: PlannerStageView) => {
    fallbackView = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 보기 방식 저장 실패는 현재 화면 사용을 막지 않는다.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { view, changeView };
}
