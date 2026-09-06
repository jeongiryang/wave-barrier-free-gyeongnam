import type { ProviderItem, ProviderResult } from "./provider-types";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalid(): never {
  throw new Error("교통 정보의 응답 형식을 확인하지 못했습니다. 잠시 후 다시 조회해 주세요.");
}

// KORAIL/TAGO both document response.header.resultCode and body.totalCount/items.
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
