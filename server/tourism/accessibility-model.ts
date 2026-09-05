import { buildAccessibilityItems, calculateAccessibilityEvidence } from "../../lib/accessibility-score.js";
import { clean, httpsUrl } from "../shared/http";
import type { ProviderItem as KtoItem } from "../shared/provider-data";
import { profileFields, regionCodes } from "./catalog";

export function placeFrom(item: KtoItem, detail: KtoItem, region: string, profiles: string[], index: number) {
  const candidates = profiles.flatMap((profile) => profileFields[profile] || []);
  const unique = [...new Map(candidates.map(([key, label]) => [key, label])).entries()];
  const accessibility = buildAccessibilityItems(unique, detail);
  const matched = unique.filter(([key]) => accessibility.some((entry) => entry.key === key && entry.state === "confirmed"));
  const known = accessibility.filter((entry) => entry.state !== "unknown");
  const negative = accessibility.filter((entry) => entry.state === "negative");
  const featureLabels = matched.map(([, label]) => label);
  const details = matched.map(([key, label]) => `${label}: ${clean(detail[key], 150)}`).filter(Boolean).slice(0, 5);
  const total = unique.length;
  const { score, confidence } = calculateAccessibilityEvidence(matched.length, known.length, total);
  const address = clean(item.addr1 || item.addr2);
  const city = Object.keys(regionCodes).find((name) => name !== "경남 전체" && address.includes(name)) || (region === "경남 전체" ? "경남" : region);
  return {
    id: clean(item.contentid || `${item.title}-${index}`), contentTypeId: clean(item.contenttypeid), city,
    name: clean(item.title || "이름 없는 관광지"), address,
    summary: clean(item.overview || address || "한국관광공사 관광정보에서 찾은 여행 후보입니다.", 155),
    image: httpsUrl(item.firstimage || item.firstimage2),
    mapX: clean(item.mapx), mapY: clean(item.mapy), score, confidence,
    knownFields: known.length, unknownFields: Math.max(0, total - known.length), negativeFields: negative.length,
    checkedAt: new Date().toISOString(), accessibility,
    features: featureLabels.length ? featureLabels.slice(0, 5) : ["상세 편의정보 확인 필요"],
    details: details.length ? details : ["제공된 편의정보가 제한적이므로 방문 전 시설 운영기관에 확인해 주세요."],
    source: matched.length ? "무장애 여행정보 · 국문 관광정보" : "국문 관광정보",
  };
}
