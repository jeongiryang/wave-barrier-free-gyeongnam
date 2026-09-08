import type { ProviderItem, ProviderResult } from "./provider-types";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalid(): never {
  throw new Error("교통 정보의 응답 형식을 확인하지 못했습니다. 잠시 후 다시 조회해 주세요.");
}

// Paginated KORAIL/TAGO operations document header.resultCode and body.totalCount/items.
// A 200 response or an unknown object is not evidence of an authenticated empty result.
export function parseTransportResponse(data: unknown): ProviderResult {
  if (!record(data) || !record(data.response)) return invalid();
  const { header, body } = data.response;
  if (!record(header) || !["0", "00", "0000"].includes(String(header.resultCode))) return invalid();
  if (!record(body)) return invalid();
  const rawTotal = body.totalCount;
  if (typeof rawTotal !== "number" && (typeof rawTotal !== "string" || !/^\d+$/.test(rawTotal))) return invalid();
  const total = Number(rawTotal);
  if (!Number.isSafeInteger(total) || total < 0) return invalid();

  const container = body.items;
  let rows: unknown;
  if (record(container)) {
    rows = container.item;
    if (rows === undefined && Object.keys(container).length > 0) return invalid();
  } else if (container === undefined || container === "" || container === null || (Array.isArray(container) && container.length === 0)) {
    rows = undefined;
  } else return invalid();

  const items = rows === undefined || rows === null || rows === "" ? [] : Array.isArray(rows) ? rows : [rows];
  if (items.some((item) => !record(item) || Object.keys(item).length === 0 || Object.values(item).some((value) =>
    value !== null && typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value))))) return invalid();
  if (total < items.length || (total > 0 && items.length === 0)) return invalid();
  return { items: items as ProviderItem[], total };
}

// TrainInfo/GetCtyCodeList documents body.items only, without pagination/totalCount:
// https://www.data.go.kr/data/15098552/openapi.do (GetCtyCodeList_response).
// Derive the observed catalog size only after validating this operation's city rows.
export function parseTrainCityCatalogResponse(data: unknown): ProviderResult {
  if (!record(data) || !record(data.response) || !record(data.response.body)) return invalid();
  const body = data.response.body;
  if (!Object.hasOwn(body, "items")) return invalid();
  const container = body.items;
  if (record(container) && !Object.hasOwn(container, "item")) return invalid();
  const rows = record(container) ? container.item : container;
  const items = rows === "" || rows === null ? [] : Array.isArray(rows) ? rows : [rows];
  const codes = new Set<string>();
  for (const item of items) {
    if (!record(item) || !["string", "number"].includes(typeof item.citycode)
      || !/^\d+$/.test(String(item.citycode)) || !Number.isSafeInteger(Number(item.citycode))
      || typeof item.cityname !== "string" || !item.cityname.trim()) return invalid();
    const code = String(Number(item.citycode));
    if (codes.has(code)) return invalid();
    codes.add(code);
  }
  const result = parseTransportResponse({ response: { ...data.response, body: {
    ...body, totalCount: Object.hasOwn(body, "totalCount") ? body.totalCount : items.length,
  } } });
  if (result.total !== result.items.length) return invalid();
  return result;
}
