import type { Env } from "./env";
import { clean } from "./http";

export type ProviderItem = Record<string, string | number | null | undefined>;
export type ProviderResult = { items: ProviderItem[]; total: number };
export type ProviderAttempt = { ok: true; value: ProviderResult } | { ok: false; error: string };
export type TransportProviderState = "connected" | "ready" | "error" | "missing";

export function commonParams(rows = "12") {
  return {
    numOfRows: rows,
    pageNo: "1",
    MobileOS: "WEB",
    MobileApp: "WAVE",
    _type: "json",
  };
}

export function normalizeItems(data: unknown): ProviderResult {
  const root = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const response = (root.response && typeof root.response === "object" ? root.response : root) as Record<string, unknown>;
  const header = (response.header && typeof response.header === "object" ? response.header : {}) as Record<string, unknown>;
  const code = clean(header.resultCode);
  if (code && !["0", "00", "0000"].includes(code)) {
    throw new Error(clean(header.resultMsg || "한국관광공사 API 오류", 120));
  }
  const body = (response.body && typeof response.body === "object" ? response.body : {}) as Record<string, unknown>;
  const itemsNode = body.items && typeof body.items === "object" ? body.items as Record<string, unknown> : {};
  const item = itemsNode.item;
  const items = Array.isArray(item) ? item : item && typeof item === "object" ? [item] : [];
  return { items: items as ProviderItem[], total: Number(body.totalCount || items.length || 0) };
}

export function normalizeExpresswayItems(data: unknown): ProviderResult {
  const root = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const list = root.list || root.items || root.data;
  const items = Array.isArray(list) ? list : list && typeof list === "object" ? [list] : [];
  return { items: items as ProviderItem[], total: Number(root.count || root.totalCount || items.length || 0) };
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function normalizeXmlItems(xml: string): ProviderResult {
  const errorMessage = xml.match(/<(?:resultMsg|returnAuthMsg|errMsg)>([\s\S]*?)<\/(?:resultMsg|returnAuthMsg|errMsg)>/i)?.[1];
  const resultCode = clean(xml.match(/<resultCode>([\s\S]*?)<\/resultCode>/i)?.[1]);
  if (resultCode && !["0", "00", "0000"].includes(resultCode)) {
    throw new Error(clean(decodeXml(errorMessage || "공공데이터 API 오류"), 120));
  }
  const blocks = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  const items = blocks.map((block) => {
    const item: ProviderItem = {};
    for (const field of block.matchAll(/<([A-Za-z_][\w.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
      item[field[1]] = clean(decodeXml(field[2]), 2000);
    }
    return item;
  });
  const total = Number(clean(xml.match(/<totalCount>([\s\S]*?)<\/totalCount>/i)?.[1]) || items.length);
  return { items, total };
}

export async function fetchTourismData(env: Env, service: string, operation: string, params: Record<string, string>): Promise<ProviderResult> {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!key) throw new Error("서버 인증키가 등록되지 않았습니다.");
  const query = new URLSearchParams(params).toString();
  const url = `https://apis.data.go.kr/B551011/${service}/${operation}?serviceKey=${key}&${query}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(9500),
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

export function publicTransportKey(env: Env) {
  return env.TAGO_API_KEY?.trim()
    || env.KORAIL_API_KEY?.trim()
    || env.TOUR_API_SERVICE_KEY_ENCODED?.trim()
    || "";
}

export async function fetchPublicTransportData(env: Env, serviceUrl: string, operation: string, params: Record<string, string> = {}): Promise<ProviderResult> {
  const key = publicTransportKey(env);
  if (!key) throw new Error("공공데이터포털 인증키가 등록되지 않았습니다.");
  const query = new URLSearchParams({ numOfRows: "30", pageNo: "1", _type: "json", ...params }).toString();
  const response = await fetch(`${serviceUrl}/${operation}?serviceKey=${key}&${query}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(9500),
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

export async function attemptProvider(promise: Promise<ProviderResult>): Promise<ProviderAttempt> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? clean(error.message, 120) : "호출 확인 필요" };
  }
}

export async function fetchRegionalList(env: Env, service: string, operation: string, params: Record<string, string>, districts: string[]) {
  const calls = districts.length
    ? districts.map((district) => attemptProvider(fetchTourismData(env, service, operation, { ...params, lDongSignguCd: district })))
    : [attemptProvider(fetchTourismData(env, service, operation, params))];
  const results = await Promise.all(calls);
  const successes = results.filter((result): result is Extract<ProviderAttempt, { ok: true }> => result.ok);
  if (!successes.length) return results[0];
  const items = successes.flatMap((result) => result.value.items);
  const unique = [...new Map(items.map((item) => [clean(item.contentid || item.title), item])).values()];
  return { ok: true, value: { items: unique, total: unique.length } } as ProviderAttempt;
}
