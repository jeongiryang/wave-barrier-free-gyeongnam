import { GYEONGNAM_REGION_POINTS } from "../../lib/gyeongnam-regions.js";

export type WeatherPoint = { lat: number; lng: number };

const regionCoordinates = GYEONGNAM_REGION_POINTS as Record<string, WeatherPoint>;

export function resolveWeatherRegion(requested: string) {
  const region = regionCoordinates[requested] ? requested : "창원";
  return { region, point: regionCoordinates[region] };
}
