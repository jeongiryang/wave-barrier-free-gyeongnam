"use client";

import { useEffect, useState } from "react";
import { optionalPlannerJson } from "../services/api";
import type { WeatherData } from "../types";

export function useRegionWeather(region: string) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

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

  return { weather, weatherLoading };
}
