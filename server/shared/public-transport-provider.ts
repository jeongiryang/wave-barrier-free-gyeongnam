import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import type { Env } from "./env";
import { clean } from "./http";
import { normalizeItems } from "./provider-normalizers";
import type {
  ProviderAttempt,
  ProviderResult,
  TransportProviderState,
} from "./provider-types";

export function publicTransportKey(env: Env) {
  return env.TAGO_API_KEY?.trim()
    || env.KORAIL_API_KEY?.trim()
    || env.TOUR_API_SERVICE_KEY_ENCODED?.trim()
    || "";
}

export async function fetchPublicTransportData(
  env: Env,
  serviceUrl: string,
  operation: string,
  params: Record<string, string> = {},
): Promise<ProviderResult> {
  const key = publicTransportKey(env);
  if (!key) throw new Error("공공데이터포털 인증키가 등록되지 않았습니다.");
  const query = new URLSearchParams({ numOfRows: "30", pageNo: "1", _type: "json", ...params }).toString();
  const response = await fetch(`${serviceUrl}/${operation}?serviceKey=${key}&${query}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.tourism),
  });
  const raw = await response.text();
  if (!response.ok) {
    let reason = raw.match(/<(?:returnAuthMsg|resultMsg|errMsg)>([^<]+)</i)?.[1] || "";
    try {
      const errorBody = JSON.parse(raw) as Record<string, unknown>;
      const errorResponse = (errorBody.response || errorBody) as Record<string, unknown>;
      const errorHeader = (errorResponse.header || errorResponse) as Record<string, unknown>;
      reason = clean(errorHeader.resultMsg || errorHeader.message || reason, 80);
    } catch { /* XML or text error bodies are handled above */ }
    throw new Error(`교통 데이터 응답 ${response.status}${reason ? ` · ${clean(reason, 80)}` : ""}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    const message = raw.match(/<(?:returnAuthMsg|resultMsg)>([^<]+)</i)?.[1];
    throw new Error(clean(message || "교통 API가 JSON이 아닌 응답을 반환했습니다.", 120));
  }
  return normalizeItems(data);
}

export function koreaYmd(offsetDays = 0) {
  const date = new Date(Date.now() + (9 * 60 * 60 * 1000) + (offsetDays * 24 * 60 * 60 * 1000));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function transportProvider(
  id: string,
  name: string,
  role: string,
  hasKey: boolean,
  result?: ProviderAttempt | null,
) {
  let state: TransportProviderState = "missing";
  let detail = "인증키가 등록되지 않았습니다.";
  if (hasKey && !result) {
    state = "ready";
    detail = "인증키가 연결되어 있으며 기능 요청 시 데이터를 조회합니다.";
  } else if (hasKey && result?.ok) {
    const count = Math.max(result.value.total, result.value.items.length);
    state = count > 0 ? "connected" : "ready";
    detail = count > 0 ? `${count}건의 응답을 확인했습니다.` : "인증은 정상이며 현재 조건의 결과가 없습니다.";
  } else if (hasKey && result && !result.ok) {
    state = "error";
    detail = result.error || "제공기관 응답을 확인해 주세요.";
  }
  return { id, name, role, configured: hasKey, state, detail };
}
