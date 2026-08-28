import type { Env } from "./env";
import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import { clean } from "./http";
import { attemptProvider } from "./provider-attempt";
import { normalizeItems } from "./provider-normalizers";
import type { ProviderAttempt, ProviderResult } from "./provider-types";

export function commonParams(rows = "12") {
  return {
    numOfRows: rows,
    pageNo: "1",
    MobileOS: "WEB",
    MobileApp: "WAVE",
    _type: "json",
  };
}

export async function fetchTourismData(
  env: Env,
  service: string,
  operation: string,
  params: Record<string, string>,
): Promise<ProviderResult> {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!key) throw new Error("서버 인증키가 등록되지 않았습니다.");
  const query = new URLSearchParams(params).toString();
  const url = `https://apis.data.go.kr/B551011/${service}/${operation}?serviceKey=${key}&${query}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.tourism),
  });
  if (!response.ok) throw new Error(`관광 데이터 응답 ${response.status}`);
  const raw = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    const message = raw.match(/<(?:returnAuthMsg|resultMsg)>([^<]+)</i)?.[1];
    throw new Error(clean(message || "JSON 형식이 아닌 응답을 받았습니다.", 120));
  }
  return normalizeItems(data);
}

export async function fetchRegionalList(
  env: Env,
  service: string,
  operation: string,
  params: Record<string, string>,
  districts: string[],
) {
  const calls = districts.length
    ? districts.map((district) => attemptProvider(fetchTourismData(env, service, operation, {
      ...params,
      lDongSignguCd: district,
    })))
    : [attemptProvider(fetchTourismData(env, service, operation, params))];
  const results = await Promise.all(calls);
  const successes = results.filter((result): result is Extract<ProviderAttempt, { ok: true }> => result.ok);
  if (!successes.length) return results[0];
  const items = successes.flatMap((result) => result.value.items);
  const unique = [...new Map(items.map((item) => [clean(item.contentid || item.title), item])).values()];
  return { ok: true, value: { items: unique, total: unique.length } } as ProviderAttempt;
}
