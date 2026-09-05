"use client";

import { useCallback, useEffect, useState } from "react";
import { optionalPlannerJson } from "../services/api";
import type { WeatherData } from "../types";

export function useRegionWeather(region: string) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const reloadWeather = useCallback(() => setRequestVersion((current) => current + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => {
      if (!region) { setWeather(null); setWeatherLoading(false); return; }
      setWeatherLoading(true);
      setWeather(null);
      void optionalPlannerJson<WeatherData>(`/api/weather?region=${encodeURIComponent(region)}`, { signal: controller.signal })
        .then((data) => { if (!cancelled && data) setWeather(data); })
        .finally(() => { if (!cancelled) setWeatherLoading(false); });
    });
    return () => { cancelled = true; controller.abort(); window.cancelAnimationFrame(frame); };
  }, [region, requestVersion]);

  return { weather, weatherLoading, reloadWeather };
}
