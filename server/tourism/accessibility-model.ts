import { buildAccessibilityItems, calculateAccessibilityEvidence } from "../../lib/accessibility-score.js";
import { clean, httpsUrl } from "../shared/http";
import type { ProviderItem as KtoItem } from "../shared/provider-data";
import { profileFields, regionCodes } from "./catalog";

export function requestedAccessibilityFields(profiles: string[]) {
  const candidates = profiles.flatMap((profile) => profileFields[profile] || []);
  return [...new Map(candidates.map(([key, label]) => [key, label])).entries()];
}

export function placeFrom(item: KtoItem, detail: KtoItem, region: string, profiles: string[], index: number) {
  const unique = requestedAccessibilityFields(profiles);
  // `route`(접근로) 필드는 스펙 16에 따라 원문을 요약 없이 그대로 인용해 보여줘야
  // 한다. `buildAccessibilityItems`의 기본 처리는 HTML 태그를 지우지 않고 300자로만
  // 자르므로, 이 항목만 `clean()`으로 태그를 제거하고 더 넉넉한 길이(600자)를 준다.
  // `clean()` 자체의 기본값(240)은 바꾸지 않는다.
  const accessibility = buildAccessibilityItems(unique, detail).map((entry) =>
    entry.key === "route" ? { ...entry, detail: clean(detail.route, 600) } : entry,
  );
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
    features: featureLabels.slice(0, 5),
    details: details.length ? details : ["제공된 편의정보가 제한적이므로 방문 전 시설 운영기관에 확인해 주세요."],
    source: matched.length ? "무장애 여행정보 · 국문 관광정보" : "국문 관광정보",
  };
}
