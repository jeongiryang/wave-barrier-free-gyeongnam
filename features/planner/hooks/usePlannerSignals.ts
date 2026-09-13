"use client";

import { useEffect, useState } from "react";
import type { PlanData, RichMode } from "../types";
import { usePlannerEnrichment } from "./usePlannerEnrichment";
import { useRegionWeather } from "./useRegionWeather";
import { useServiceHealth } from "./useServiceHealth";

interface PlannerSignalsOptions {
  plan: PlanData | null;
  region: string;
  theme: string;
  locale: string;
  travelStart: string;
  travelEnd: string;
}

export function usePlannerSignals({
  plan,
  region,
  theme,
  locale,
  travelStart,
  travelEnd,
}: PlannerSignalsOptions) {
  const [richMode, setRichMode] = useState<RichMode>("events");
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  useEffect(() => {
    const openLinkedPanel = () => {
      if (window.location.pathname !== '/planner') return;
      if (["#layers", "#crowd"].includes(window.location.hash)) setSecondaryOpen(true);
    };
    const frame = window.requestAnimationFrame(openLinkedPanel);
    window.addEventListener("hashchange", openLinkedPanel);
    window.addEventListener("popstate", openLinkedPanel);
    window.addEventListener("wave:planner-navigation", openLinkedPanel);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openLinkedPanel);
      window.removeEventListener("popstate", openLinkedPanel);
      window.removeEventListener("wave:planner-navigation", openLinkedPanel);
    };
  }, []);
  const health = useServiceHealth();
  const enrichment = usePlannerEnrichment({ plan, enabled: secondaryOpen, region, theme, locale, travelStart, travelEnd });
  const weather = useRegionWeather(region);

  return {
    ...health,
    ...enrichment,
    richMode,
    setRichMode,
    secondaryOpen,
    setSecondaryOpen,
    ...weather,
  };
}
