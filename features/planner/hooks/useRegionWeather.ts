"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { optionalPlannerJson, PlannerRequestError } from "../services/api";
import type { WeatherData } from "../types";
import { weatherResponse } from "../weather-data";

export function useRegionWeather(region: string) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherFailure, setWeatherFailure] = useState<import("../../../lib/provider-failure.js").ProviderFailure>();
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const pending = useRef(false);
  const generation = useRef(0);
  const reloadWeather = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    setWeatherLoading(true);
    setRequestVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const version = ++generation.current;
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => {
      if (!region) { pending.current = false; setWeather(null); setWeatherFailure(undefined); setWeatherLoading(false); return; }
      pending.current = true;
      setWeatherLoading(true);
      setWeather(null); setWeatherFailure(undefined);
      void optionalPlannerJson<WeatherData>(`/api/weather?region=${encodeURIComponent(region)}`, { signal: controller.signal },
        (error) => { if (!cancelled && version === generation.current) setWeatherFailure(error instanceof PlannerRequestError ? error.failure : undefined); })
        .then((data) => { if (!cancelled && version === generation.current) setWeather(weatherResponse(data, region)); })
        .finally(() => { if (!cancelled && version === generation.current) { pending.current = false; setWeatherLoading(false); } });
    });
    return () => { cancelled = true; controller.abort(); window.cancelAnimationFrame(frame); };
  }, [region, requestVersion]);

  const resetWeather = useCallback(() => { generation.current++; pending.current = false; setWeather(null); setWeatherFailure(undefined); setWeatherLoading(false); }, []);

  return { resetWeather, weather, weatherFailure, weatherLoading, reloadWeather };
}
