import { clean } from "./http";
import type { ProviderItem, ProviderResult } from "./provider-types";

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
