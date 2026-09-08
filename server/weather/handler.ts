import { clean, json } from "../shared/http";
import { resolveWeatherRegion } from "./catalog";
import { normalizeWeatherForecast } from "./model";
import { fetchOpenMeteoForecast } from "./open-meteo";
import { caughtProviderFailure, providerFailureMessage } from "../../lib/provider-failure.js";

export async function handleWeatherApi(request: Request) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const url = new URL(request.url);
  const requested = clean(url.searchParams.get("region"), 20);
  const { region, point } = resolveWeatherRegion(requested);
  try {
    const raw = await fetchOpenMeteoForecast(point);
    return json(normalizeWeatherForecast(raw, region), 200, true);
  } catch (error) {
    const failure = caughtProviderFailure(error,{provider:"open-meteo",operation:"forecast"});
    return json({ error:providerFailureMessage(failure),failure }, 502);
  }
}
