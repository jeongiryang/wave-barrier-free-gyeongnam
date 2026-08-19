import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import { normalizeItems, normalizeXmlItems, type ProviderAttempt as Attempt } from "../shared/provider-data";

export async function fetchWaterTravel(env: Env, searchTypeCd: "01" | "02") {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!key) return { ok: false, error: "서버 인증키가 등록되지 않았습니다." } as Attempt;
  const params = new URLSearchParams({ pageNo: "1", numOfRows: "8", searchTypeCd });
  try {
    const response = await fetch(`https://apis.data.go.kr/B500001/myportal/travel/travellist?serviceKey=${key}&${params.toString()}`, {
      signal: AbortSignal.timeout(9500),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`물과 여행 응답 ${response.status}`);
    const raw = await response.text();
    const trimmed = raw.trim();
    return {
      ok: true,
      value: trimmed.startsWith("<") ? normalizeXmlItems(trimmed) : normalizeItems(JSON.parse(trimmed)),
    } as Attempt;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? clean(error.message, 120) : "물과 여행 호출 확인 필요",
    } as Attempt;
  }
}
