import { useCallback, useEffect, useRef, useState } from "react";
import { optionalPlannerJson, plannerJson } from "../services/api";
import type { EnrichmentData, KeyHealth, PlanData, RichMode, WeatherData } from "../types";

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
  const [keyHealth, setKeyHealth] = useState<KeyHealth | null>(null);
  const [keyHealthChecked, setKeyHealthChecked] = useState(false);
  const [enrichment, setEnrichment] = useState<EnrichmentData | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [richMode, setRichMode] = useState<RichMode>("events");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const enrichmentRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    void optionalPlannerJson<KeyHealth>("/api/health")
      .then((data) => { if (!cancelled && data) setKeyHealth(data); })
      .finally(() => { if (!cancelled) setKeyHealthChecked(true); });
    return () => { cancelled = true; };
  }, []);

  const loadEnrichment = useCallback(async () => {
    enrichmentRequestRef.current?.abort();
    const controller = new AbortController();
    enrichmentRequestRef.current = controller;
    setEnrichmentLoading(true);
    try {
      const params = new URLSearchParams({ action: "enrich", region, theme, locale, startDate: travelStart, endDate: travelEnd });
      const data = await plannerJson<EnrichmentData>(`/api/wave?${params.toString()}`, { signal: controller.signal });
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
    if (!plan) return;
    const frame = window.requestAnimationFrame(() => void loadEnrichment());
    return () => {
      window.cancelAnimationFrame(frame);
      enrichmentRequestRef.current?.abort();
    };
  }, [plan, loadEnrichment]);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      setWeatherLoading(true);
      setWeather(null);
    });
    void optionalPlannerJson<WeatherData>(`/api/weather?region=${encodeURIComponent(region)}`)
      .then((data) => { if (!cancelled && data) setWeather(data); })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; window.cancelAnimationFrame(frame); };
  }, [region]);

  useEffect(() => () => {
    enrichmentRequestRef.current?.abort();
  }, []);

  return {
    keyHealth,
    keyHealthChecked,
    enrichment,
    enrichmentLoading,
    richMode,
    setRichMode,
    weather,
    weatherLoading,
    loadEnrichment,
  };
}
