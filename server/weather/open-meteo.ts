import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import type { WeatherPoint } from "./catalog";

export async function fetchOpenMeteoForecast(point: WeatherPoint) {
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lng),
    timezone: "Asia/Seoul",
    forecast_days: "7",
    current: "temperature_2m,apparent_temperature,weather_code,is_day,precipitation,rain,showers,snowfall,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,snowfall_sum,uv_index_max",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.weather),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`날씨 응답 ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}
