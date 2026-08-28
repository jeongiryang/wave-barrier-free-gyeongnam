import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import { normalizeExpresswayItems, type ProviderAttempt as Attempt } from "../shared/provider-data";

export async function fetchThemeRests(env: Env): Promise<Attempt> {
  const key = env.EXPRESSWAY_API_KEY?.trim();
  if (!key) return { ok: false, error: "고속도로 공공데이터 포털 전용키 연결 대기" };
  try {
    const params = new URLSearchParams({ key, type: "json" });
    const response = await fetch(`https://data.ex.co.kr/openapi/restinfo/restThemeList?${params.toString()}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.tourism),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`테마휴게소 응답 ${response.status}`);
    return { ok: true, value: normalizeExpresswayItems(await response.json()) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? clean(error.message, 120) : "테마휴게소 호출 확인 필요",
    };
  }
}
