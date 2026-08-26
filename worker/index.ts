/** W.A.V.E Vercel Functions에서 공유하는 API 구현. */
import { handleLocationSearch } from "../server/location/handler";
import { handleProductionMigration } from "../server/deployment/migration-handler";
import { portableEnv } from "../server/shared/env";
import { json } from "../server/shared/http";
import { handleWaveApi } from "../server/tourism/handler";
import { handleHealthApi, handleMapConfig, handleRouteApi } from "../server/transport/handler";
import { handleFeedbackApi } from "../server/trips/feedback-handler";
import { handleTripsApi } from "../server/trips/handler";
import { handleWeatherApi } from "../server/weather/handler";



export async function handlePortableApi(request: Request): Promise<Response> {
  const env = portableEnv();
  const url = new URL(request.url);

  if (url.pathname === "/api/wave") return handleWaveApi(request, env);
  if (url.pathname === "/api/weather") return handleWeatherApi(request);
  if (url.pathname === "/api/location-search") return handleLocationSearch(request, env);
  if (url.pathname === "/api/route") return handleRouteApi(request, env);
  if (url.pathname === "/api/map-config") return handleMapConfig(env);
  if (url.pathname === "/api/health") return handleHealthApi(env);
  if (url.pathname === "/api/deployment/migrate") return handleProductionMigration(request);
  if (url.pathname === "/api/trips" || url.pathname.startsWith("/api/trips/")) return handleTripsApi(request, env);
  if (url.pathname === "/api/feedback") return handleFeedbackApi(request);
  return json({ error: "지원하지 않는 API 경로입니다." }, 404);
}
