import type { WeatherData } from "./types";

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string");
const date = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** A typed request alone does not establish that the response contains a forecast. */
export function weatherResponse(value: unknown, expectedRegion?: string): WeatherData | null {
  if (!record(value) || !record(value.current) || !Array.isArray(value.days) || !value.days.length || value.days.length > 7) return null;
  if (typeof value.region !== "string" || typeof value.source !== "string" || !value.source.trim()
    || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt)) || !strings(value.advice)) return null;
  if (expectedRegion !== undefined && value.region !== expectedRegion) return null;
  const current = value.current;
  if (!["temperature", "apparent", "code", "wind", "precipitation"].every((key) => finite(current[key]))
    || !Number.isInteger(current.code) || Number(current.wind) < 0 || Number(current.precipitation) < 0
    || typeof current.label !== "string" || typeof current.isDay !== "boolean") return null;
  let previous = "";
  for (const day of value.days) {
    if (!record(day) || !date(day.date) || String(day.date) <= previous || typeof day.label !== "string" || !strings(day.advice)) return null;
    if (!["code", "max", "min", "rainProbability", "rain", "snow", "uv"].every((key) => finite(day[key]))
      || !Number.isInteger(day.code) || Number(day.min) > Number(day.max)
      || Number(day.rainProbability) < 0 || Number(day.rainProbability) > 100
      || ["rain", "snow", "uv"].some((key) => Number(day[key]) < 0)) return null;
    previous = String(day.date);
  }
  return value as WeatherData;
}
