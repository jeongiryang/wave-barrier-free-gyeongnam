"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { optionalPlannerJson } from "../services/api";
import type { WeatherData } from "../types";
import { weatherResponse } from "../weather-data";

export function useRegionWeather(region: string) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const pending = useRef(false);
  const reloadWeather = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    setWeatherLoading(true);
    setRequestVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => {
      if (!region) { pending.current = false; setWeather(null); setWeatherLoading(false); return; }
      pending.current = true;
      setWeatherLoading(true);
      setWeather(null);
      void optionalPlannerJson<WeatherData>(`/api/weather?region=${encodeURIComponent(region)}`, { signal: controller.signal })
        .then((data) => { if (!cancelled) setWeather(weatherResponse(data)); })
        .finally(() => { if (!cancelled) { pending.current = false; setWeatherLoading(false); } });
    });
    return () => { cancelled = true; controller.abort(); window.cancelAnimationFrame(frame); };
  }, [region, requestVersion]);

  return { weather, weatherLoading, reloadWeather };
}
