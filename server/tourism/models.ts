import { calculateAccessibilityEvidence } from "../../lib/accessibility-score.js";
import { clean } from "../shared/http";
import type { ProviderAttempt as Attempt, ProviderItem as KtoItem } from "../shared/provider-data";
import { profileFields, regionCodes } from "./catalog";

function hasMeaningfulValue(value: unknown) {
  const text = clean(value);
  return Boolean(text && !/(없음|미제공|해당없음|정보 없음|불가)/.test(text));
}
function fieldState(value: unknown): "positive" | "negative" | "unknown" {
  const text = clean(value);
  if (!text || /(미제공|정보 없음|확인 필요|해당없음)/.test(text)) return "unknown";
  if (/(없음|불가|미설치|이용 불가능|지원 안)/.test(text)) return "negative";
  return "positive";
}


export function apiStatus(id: string, name: string, role: string, result: Attempt, count?: number) {
  const found = count ?? (result.ok ? result.value.items.length : 0);
  return {
    id, name, role,
    state: result.ok ? (found ? "live" : "empty") : "error",
    count: found,
    note: result.ok ? (found ? "실시간 응답 반영" : "조건에 맞는 결과 없음") : result.error,
  };
}

export function mergePlaces(primary: KtoItem[], secondary: KtoItem[]) {
  const merged = new Map<string, KtoItem>();
  secondary.forEach((item) => merged.set(clean(item.contentid || item.title), item));
  primary.forEach((item) => {
    const id = clean(item.contentid || item.title);
    merged.set(id, { ...(merged.get(id) || {}), ...item });
  });
  return [...merged.values()];
}

export function placeFrom(item: KtoItem, detail: KtoItem, region: string, profiles: string[], index: number) {
  const candidates = profiles.flatMap((profile) => profileFields[profile] || []);
  const unique = [...new Map(candidates.map(([key, label]) => [key, label])).entries()];
  const matched = unique.filter(([key]) => fieldState(detail[key]) === "positive");
  const known = unique.filter(([key]) => fieldState(detail[key]) !== "unknown");
  const negative = unique.filter(([key]) => fieldState(detail[key]) === "negative");
  const featureLabels = matched.map(([, label]) => label);
  const details = matched
    .map(([key, label]) => `${label}: ${clean(detail[key], 150)}`)
    .filter(Boolean)
    .slice(0, 5);
  const total = unique.length;
  const { score, confidence } = calculateAccessibilityEvidence(matched.length, known.length, total);
  const address = clean(item.addr1 || item.addr2);
  const city = Object.keys(regionCodes).find((name) => name !== "경남 전체" && address.includes(name)) || (region === "경남 전체" ? "경남" : region);
  return {
    id: clean(item.contentid || `${item.title}-${index}`),
    contentTypeId: clean(item.contenttypeid),
    city,
    name: clean(item.title || "이름 없는 관광지"),
    address,
    summary: clean(item.overview || address || "한국관광공사 관광정보에서 찾은 여행 후보입니다.", 155),
    image: clean(item.firstimage || item.firstimage2).replace(/^http:\/\//, "https://"),
    mapX: clean(item.mapx),
    mapY: clean(item.mapy),
    score,
    confidence,
    knownFields: known.length,
    unknownFields: Math.max(0, total - known.length),
    negativeFields: negative.length,
    checkedAt: new Date().toISOString(),
    features: featureLabels.length ? featureLabels.slice(0, 5) : ["상세 편의정보 확인 필요"],
    details: details.length ? details : ["제공된 편의정보가 제한적이므로 방문 전 시설 운영기관에 확인해 주세요."],
    source: matched.length ? "무장애 여행정보 · 국문 관광정보" : "국문 관광정보",
  };
}

export function courseFrom(result: Attempt) {
  if (!result.ok || !result.value.items.length) return null;
  const item = result.value.items[0];
  const level = clean(item.crsLevel);
  return {
    name: clean(item.crsKorNm),
    distance: clean(item.crsDstnc),
    minutes: clean(item.crsTotlRqrmHour),
    level: level === "1" ? "쉬움" : level === "2" ? "보통" : level === "3" ? "어려움" : level || "미제공",
    summary: clean(item.crsSummary || item.crsContents, 220),
    sigun: clean(item.sigun),
  };
}

export function richSpot(item: KtoItem, source: string) {
  const eventStart = clean(item.eventstartdate || item.eventStartDate);
  const eventEnd = clean(item.eventenddate || item.eventEndDate);
  const eventPeriod = eventStart
    ? `${eventStart.slice(0, 4)}.${eventStart.slice(4, 6)}.${eventStart.slice(6, 8)}${eventEnd && eventEnd !== eventStart ? ` – ${eventEnd.slice(0, 4)}.${eventEnd.slice(4, 6)}.${eventEnd.slice(6, 8)}` : ""}`
    : "";
  return {
    id: clean(item.contentId || item.contentid || item.contentID || item.facltNm || item.koTitle || item.stdRestCd || item.serviceAreaCode || item.travelId || item.courseId || item.title),
    title: clean(item.title || item.contentTitle || item.facltNm || item.koTitle || item.stdRestNm || item.serviceAreaName || item.travelNm || item.travelName || item.courseNm || item.courseName || item.spotNm || item.tourNm || item.name || "이름 없는 콘텐츠"),
    address: clean(item.addr1 || item.baseAddr || item.address || item.addr || item.svarAddr || item.serviceAreaAddress || item.koFilmst || item.region),
    summary: clean(eventPeriod || item.overview || item.intro || item.lineIntro || item.course || item.contents || item.content || item.description || item.themeDetail || item.themeDtl || item.featureNm || item.koKeyword, 260),
    image: clean(item.firstimage || item.firstImageUrl || item.orgImage || item.thumbImage || item.thumbnail || item.imageUrl || item.imgUrl || item.photoUrl).replace(/^http:\/\//, "https://"),
    mapX: clean(item.mapX || item.mapx || item.longitude),
    mapY: clean(item.mapY || item.mapy || item.latitude),
    tag: clean(item.wellnessThemaNm || item.induty || item.themeName || item.themeNm || item.koWnprzDiz || item.petTursmInfo || item.searchType || source, 80),
    source,
  };
}


export function audioFrom(result: Attempt) {
  if (!result.ok || !result.value.items.length) return null;
  const item = result.value.items.find((value) => hasMeaningfulValue(value.audioUrl)) || result.value.items[0];
  return {
    title: clean(item.title),
    audioTitle: clean(item.audioTitle || item.title),
    audioUrl: clean(item.audioUrl).replace(/^http:\/\//, "https://"),
    script: clean(item.script, 5000),
    playTime: clean(item.playTime),
  };
}
