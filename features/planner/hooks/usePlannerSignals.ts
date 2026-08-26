"use client";

import { useState } from "react";
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
