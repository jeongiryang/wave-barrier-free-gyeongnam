import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import { normalizeExpresswayResponse } from "../../lib/tourism/expressway-response.js";
import type { Env } from "../shared/env";
import { requestProvider } from "../shared/provider-request.js";
import { caughtProviderFailure, providerFailureMessage } from "../../lib/provider-failure.js";
import type { ProviderAttempt as Attempt, ProviderResult } from "../shared/provider-data";

export async function fetchThemeRests(env: Env): Promise<Attempt> {
  const key = env.EXPRESSWAY_API_KEY?.trim();
  if (!key) return { ok: false, error: "고속도로 공공데이터 포털 전용키 연결 대기" };
  try {
    const params = new URLSearchParams({ key, type: "json" });
    const response = await requestProvider({provider:"expressway",family:"expressway",operation:"restThemeList"}, `https://data.ex.co.kr/openapi/restinfo/restThemeList?${params.toString()}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.tourism),
      headers: { Accept: "application/json" },
    }, fetch);
    if (!response.ok) throw new Error(`테마휴게소 응답 ${response.status}`);
    return { ok: true, value: normalizeExpresswayResponse(await response.json()) as ProviderResult };
  } catch (error) {
    const failure = caughtProviderFailure(error,{provider:"expressway",operation:"restThemeList"});
    return {
      ok: false,
      error: providerFailureMessage(failure),failure,
    };
  }
}
