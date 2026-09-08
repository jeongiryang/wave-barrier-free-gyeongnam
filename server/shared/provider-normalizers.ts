import { clean } from "./http";
import type { ProviderItem, ProviderResult } from "./provider-types";

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeItems(data: unknown): ProviderResult {
  if (!record(data)) throw new Error("관광정보 응답 형식을 확인하지 못했습니다.");
  const response = Object.hasOwn(data, "response") ? data.response : data;
  if (!record(response)) throw new Error("관광정보 응답 형식을 확인하지 못했습니다.");
  const header = record(response.header) ? response.header : null;
  // KTO parameter failures can be HTTP 200 with a flat resultCode/resultMsg.
  // Never classify this missing body as an official zero-result response or
  // expose arbitrary provider error text (which may contain request details).
  const code = String(header?.resultCode ?? response.resultCode ?? "");
  if (!["0", "00", "0000"].includes(code)) throw new Error("관광정보 제공기관의 응답을 확인하지 못했습니다.");
  if (!header || !record(response.body)) throw new Error("관광정보 응답 형식을 확인하지 못했습니다.");
  const body = response.body;
  const node = body.items;
  const item = record(node) ? node.item : undefined;
  const items = Array.isArray(item) ? item : record(item) ? [item] : [];
  const total = body.totalCount === undefined ? items.length : Number(body.totalCount);
  const emptyNode = node === "" || (Array.isArray(node) && node.length === 0) || (record(node) && Object.keys(node).length === 0);
  if ((!emptyNode && !Array.isArray(item) && !record(item)) || items.some(value => !record(value)) || !Number.isSafeInteger(total) || total < items.length || (total > 0 && items.length === 0)) {
    throw new Error("관광정보 목록 형식을 확인하지 못했습니다.");
  }
  return { items: items as ProviderItem[], total };
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
