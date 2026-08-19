"use client";

import { useEffect, useRef } from "react";

interface PlannerAutoRefreshOptions {
  enabled: boolean;
  signature: string;
  refresh: (revealResults?: boolean) => void | Promise<void>;
  abort: () => void;
  delay?: number;
}

export function usePlannerAutoRefresh({
  enabled,
  signature,
  refresh,
  abort,
  delay = 550,
}: PlannerAutoRefreshOptions) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => void refreshRef.current(false), delay);
    return () => {
      window.clearTimeout(timer);
      abort();
    };
  }, [abort, delay, enabled, signature]);
}
