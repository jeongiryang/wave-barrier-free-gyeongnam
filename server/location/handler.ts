import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import type { Env } from "../shared/env";
import { clean, httpsUrl, json } from "../shared/http";

export async function handleLocationSearch(request: Request, env: Env) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const key = env.KAKAO_REST_API_KEY?.trim();
  if (!key) return json({ error: "카카오 장소 검색 키가 연결되지 않았습니다." }, 503);
  const url = new URL(request.url);
  const query = clean(url.searchParams.get("q"), 100);
  if (query.length < 2) return json({ error: "두 글자 이상 입력해 주세요." }, 400);
  try {
    const params = new URLSearchParams({ query, size: "10", sort: "accuracy" });
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.location),
      headers: { Authorization: `KakaoAK ${key}`, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`장소 검색 응답 ${response.status}`);
    const data = await response.json() as { documents?: Array<Record<string, string>> };
    return json({
      places: (data.documents || []).map((item) => ({
        id: clean(item.id),
        name: clean(item.place_name),
        address: clean(item.road_address_name || item.address_name),
        category: clean(item.category_group_name || item.category_name),
        mapX: clean(item.x),
        mapY: clean(item.y),
        placeUrl: httpsUrl(item.place_url),
      })),
    }, 200, true);
  } catch (error) {
    return json({ error: error instanceof Error ? clean(error.message, 120) : "장소를 검색하지 못했습니다." }, 502);
  }
}
