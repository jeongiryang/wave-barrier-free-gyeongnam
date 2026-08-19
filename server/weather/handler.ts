import { clean, json } from "../shared/http";
import { resolveWeatherRegion } from "./catalog";
import { normalizeWeatherForecast } from "./model";
import { fetchOpenMeteoForecast } from "./open-meteo";

export async function handleWeatherApi(request: Request) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const url = new URL(request.url);
  const requested = clean(url.searchParams.get("region"), 20);
  const { region, point } = resolveWeatherRegion(requested);
  try {
    const raw = await fetchOpenMeteoForecast(point);
    return json(normalizeWeatherForecast(raw, region), 200, true);
  } catch (error) {
    return json({ error: error instanceof Error ? clean(error.message, 120) : "날씨 정보를 불러오지 못했습니다." }, 502);
  }
}
