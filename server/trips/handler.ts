import type { Env } from "../shared/env";
import { clean, json } from "../shared/http";
import { loadSharedTrip, saveSharedTrip } from "./itinerary-actions";

export async function handleTripsApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const id = clean(url.pathname.split("/").filter(Boolean)[2], 64);
  try {
    if (request.method === "GET") return loadSharedTrip(request, env, id, url);
    if (request.method === "POST") return saveSharedTrip(request, url);
    return json({ error: "지원하지 않는 요청입니다." }, 405);
  } catch {
    return json({
      error: request.method === "GET"
        ? "공유 여행을 불러오는 중 연결이 지연됐습니다. 잠시 후 다시 시도해 주세요."
        : "공유 여행을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    }, 502);
  }
}
