import type { Env } from "./env";
import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import { clean } from "./http";
import { requestProvider } from "./provider-request.js";
import { providerFailure, ProviderRequestError } from "../../lib/provider-failure.js";
import { attemptProvider, combineProviderResults, combineFailedProviderAttempts } from "./provider-attempt";
import { normalizeItems } from "./provider-normalizers";
import type { ProviderAttempt, ProviderResult } from "./provider-types";
import { createPublicListPool } from './public-list-pool.js';
const publicLists = createPublicListPool();

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
  parentSignal?: AbortSignal,
): Promise<ProviderResult> {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  const context = {provider:"kto",family:"public-data" as const,operation:`${service}/${operation}`};
  if (!key) throw new ProviderRequestError(providerFailure(context,"missing_config"));
  const query = new URLSearchParams(params).toString();
  const url = `https://apis.data.go.kr/B551011/${service}/${operation}?serviceKey=${key}&${query}`;
  const load = async (signal?: AbortSignal): Promise<ProviderResult> => {
  const response = await requestProvider(context, url, {
    headers: { Accept: "application/json" },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.tourism)]) : AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.tourism),
  }, fetch);
  if (!response.ok) throw new Error(`관광 데이터 응답 ${response.status}`);
  const raw = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ProviderRequestError(providerFailure(context,"malformed_response"));
  }
  try { return normalizeItems(data); }
  catch { throw new ProviderRequestError(providerFailure(context,"malformed_response")); }
  };
  return ['KorWithService2', 'KorService2'].includes(service) && ['areaBasedList2', 'searchKeyword2'].includes(operation)
    ? publicLists(url, load, parentSignal)
    : load(parentSignal);
}

export async function fetchRegionalList(
  env: Env,
  service: string,
  operation: string,
  params: Record<string, string>,
  districts: string[],
  signal?: AbortSignal,
) {
  const calls = districts.length
    ? districts.map((district) => attemptProvider(fetchTourismData(env, service, operation, {
      ...params,
      lDongSignguCd: district,
    }, signal)))
    : [attemptProvider(fetchTourismData(env, service, operation, params, signal))];
  const results = await Promise.all(calls);
  const successes = results.filter((result): result is Extract<ProviderAttempt, { ok: true }> => result.ok);
  if (!successes.length) return combineFailedProviderAttempts(results);
  const items = successes.flatMap((result) => result.value.items);
  const unique = [...new Map(items.map((item) => [clean(item.contentid || item.title), item])).values()];
  return { ok: true, value: combineProviderResults(unique, results) } as ProviderAttempt;
}
