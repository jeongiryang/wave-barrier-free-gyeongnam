"use client";

import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { plannerJson } from "../services/api";
import type { EnrichmentData, PlanData } from "../types";

export function usePlannerEnrichment({ plan, enabled, region, theme, locale, travelStart, travelEnd }: {
  plan: PlanData | null;
  enabled: boolean;
  region: string;
  theme: string;
  locale: string;
  travelStart: string;
  travelEnd: string;
}) {
  const [enrichment, setEnrichment] = useState<EnrichmentData | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const enrichmentRequestRef = useRef<AbortController | null>(null);

  const loadEnrichment = useCallback(async () => {
    enrichmentRequestRef.current?.abort();
    const controller = new AbortController();
    enrichmentRequestRef.current = controller;
    setEnrichmentLoading(true);
    setEnrichment(null);
    try {
      const params = new URLSearchParams({ action: "enrich", region, theme, locale, startDate: travelStart, endDate: travelEnd });
      const data = await plannerJson<EnrichmentData>(`/api/wave?${params.toString()}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.enrich });
      if (controller.signal.aborted || enrichmentRequestRef.current !== controller) return;
      setEnrichment(data);
    } catch {
      if (!controller.signal.aborted && enrichmentRequestRef.current === controller) setEnrichment(null);
    } finally {
      if (enrichmentRequestRef.current === controller) {
        enrichmentRequestRef.current = null;
        setEnrichmentLoading(false);
      }
    }
  }, [region, theme, locale, travelStart, travelEnd]);

  useEffect(() => {
    if (!plan || !enabled) return;
    const frame = window.requestAnimationFrame(() => void loadEnrichment());
    return () => {
      window.cancelAnimationFrame(frame);
      enrichmentRequestRef.current?.abort();
    };
  }, [enabled, plan, loadEnrichment]);

  useEffect(() => () => enrichmentRequestRef.current?.abort(), []);

  return { enrichment, enrichmentLoading, loadEnrichment };
}
