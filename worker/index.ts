/** W.A.V.E Vercel Functions에서 공유하는 API 구현. */
import { neon } from "@neondatabase/serverless";
import { calculateAccessibilityEvidence } from "../lib/accessibility-score.js";
import { handleLocationSearch } from "../server/location/handler";
import {
  attemptProvider as attempt,
  commonParams,
  fetchRegionalList,
  fetchTourismData as fetchKto,
  normalizeExpresswayItems,
  normalizeItems,
  normalizeXmlItems,
  type ProviderAttempt as Attempt,
  type ProviderItem as KtoItem,
} from "../server/shared/provider-data";
import { portableEnv, type Env } from "../server/shared/env";
import { clean, httpsUrl, json, readTrustedJson } from "../server/shared/http";
import { handleHealthApi, handleMapConfig, handleRouteApi } from "../server/transport/handler";
import { handleWeatherApi } from "../server/weather/handler";

const regionCodes: Record<string, { legal: string[]; full: string[] }> = {
  "경남 전체": { legal: [], full: [] },
  "창원": { legal: ["121", "123", "125", "127", "129"], full: ["48121", "48123", "48125", "48127", "48129"] },
  "진주": { legal: ["170"], full: ["48170"] },
  "통영": { legal: ["220"], full: ["48220"] },
  "사천": { legal: ["240"], full: ["48240"] },
  "김해": { legal: ["250"], full: ["48250"] },
  "밀양": { legal: ["270"], full: ["48270"] },
  "거제": { legal: ["310"], full: ["48310"] },
  "양산": { legal: ["330"], full: ["48330"] },
  "의령": { legal: ["720"], full: ["48720"] },
  "함안": { legal: ["730"], full: ["48730"] },
  "창녕": { legal: ["740"], full: ["48740"] },
  "고성": { legal: ["820"], full: ["48820"] },
  "남해": { legal: ["840"], full: ["48840"] },
  "하동": { legal: ["850"], full: ["48850"] },
  "산청": { legal: ["860"], full: ["48860"] },
  "함양": { legal: ["870"], full: ["48870"] },
  "거창": { legal: ["880"], full: ["48880"] },
  "합천": { legal: ["890"], full: ["48890"] },
};

const regionPhotoKeywords: Record<string, string> = {
  창원: "진해 군항제", 진주: "진주 남강", 통영: "통영 한려수도", 사천: "사천 바다",
  김해: "김해 가야", 밀양: "밀양 영남루", 거제: "거제 바람의 언덕", 양산: "양산 통도사",
  의령: "의령", 함안: "함안 낙화놀이", 창녕: "창녕 우포늪", 고성: "고성 공룡",
  남해: "남해 다랭이마을", 하동: "하동 야생차", 산청: "산청 동의보감촌", 함양: "함양 지리산",
  거창: "거창 수승대", 합천: "합천 황매산",
};

const regionPhotoFallbackKeywords: Record<string, string[]> = {
  남해: ["남해 다랭이마을", "남해 관광"],
  산청: ["산청 동의보감촌", "산청 황매산", "산청 관광"],
};

const contentTypes: Record<string, string> = {
  nature: "12",
  history: "14",
  leisure: "28",
  food: "39",
};

const languageServices: Record<string, { service: string; name: string; source: string; audio: string }> = {
  ko: { service: "KorService2", name: "국문 관광정보", source: "한국어", audio: "ko" },
  en: { service: "EngService2", name: "영문 관광정보", source: "English", audio: "en" },
  ja: { service: "JpnService2", name: "일문 관광정보", source: "日本語", audio: "ja" },
  "zh-Hans": { service: "ChsService2", name: "중문 간체 관광정보", source: "简体中文", audio: "zh" },
  "zh-Hant": { service: "ChtService2", name: "중문 번체 관광정보", source: "繁體中文", audio: "zh" },
  fr: { service: "FreService2", name: "불문 관광정보", source: "Français", audio: "en" },
  de: { service: "GerService2", name: "독문 관광정보", source: "Deutsch", audio: "en" },
  ru: { service: "RusService2", name: "노어 관광정보", source: "Русский", audio: "ru" },
};

const profileFields: Record<string, Array<[string, string]>> = {
  wheel: [["parking", "장애인 주차"], ["route", "접근로"], ["wheelchair", "휠체어"], ["elevator", "엘리베이터"], ["restroom", "장애인 화장실"]],
  senior: [["route", "완만한 접근로"], ["elevator", "엘리베이터"], ["restroom", "화장실"]],
  baby: [["stroller", "유모차"], ["lactationroom", "수유실"], ["babysparechair", "유아용 의자"]],
  pregnant: [["elevator", "엘리베이터"], ["restroom", "화장실"], ["route", "접근로"]],
  visual: [["braileblock", "점자블록"], ["helpdog", "안내견"], ["guidehuman", "안내요원"], ["audioguide", "음성안내"], ["bigprint", "큰활자 안내"]],
  hearing: [["signguide", "수어안내"], ["videoguide", "영상안내"], ["hearingroom", "청각지원 객실"]],
};

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

function previousMonth(offset = 2) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - offset);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function fetchHub(env: Env, region: string) {
  const codes = regionCodes[region]?.full?.length ? regionCodes[region].full : regionCodes["창원"].full;
  let last: Attempt = { ok: true, value: { items: [], total: 0 } };
  for (let offset = 2; offset <= 14; offset += 1) {
    const baseYm = previousMonth(offset);
    const results = await Promise.all(codes.map((code) => attempt(fetchKto(env, "LocgoHubTarService1", "areaBasedList1", {
      ...commonParams("6"), baseYm, areaCd: "48", signguCd: code,
    }))));
    const available = results.filter((result): result is Extract<Attempt, { ok: true }> => result.ok);
    if (available.length) {
      const items = available.flatMap((result) => result.value.items);
      last = { ok: true, value: { items, total: items.length } };
      if (items.length) return { result: last, baseYm };
    } else if (results[0]) last = results[0];
  }
  return { result: last, baseYm: "" };
}

async function fetchPhoto(env: Env, region: string): Promise<Attempt> {
  const primaryKeyword = region === "경남 전체" ? "경상남도 관광" : (regionPhotoKeywords[region] || region);
  const keywords = [...new Set([
    primaryKeyword,
    ...(regionPhotoFallbackKeywords[region] || []),
    region !== "경남 전체" ? `${region} 관광` : "",
  ].filter(Boolean))];
  let providerWorked = false;
  let lastError = "관광사진 제공기관 응답을 확인하지 못했습니다.";

  for (const keyword of keywords) {
    const gallery = await attempt(fetchKto(env, "PhotoGalleryService1", "gallerySearchList1", {
      ...commonParams("12"), arrange: "C", keyword,
    }));
    providerWorked ||= gallery.ok;
    if (!gallery.ok) lastError = gallery.error;
    if (gallery.ok) {
      const usable = gallery.value.items.filter((item) => httpsUrl(item.galWebImageUrl || item.galWebImageUrl2));
      if (usable.length) return { ok: true, value: { items: usable, total: usable.length } } as Attempt;
    }

    // 관광사진 API에 등록되지 않은 지역은 같은 한국관광공사의 관광정보
    // 이미지로 보완한다. 외부 임의 이미지나 영구 저장본은 사용하지 않는다.
    const tour = await attempt(fetchKto(env, "KorService2", "searchKeyword2", {
      ...commonParams("12"), arrange: "Q", keyword,
    }));
    providerWorked ||= tour.ok;
    if (!tour.ok) lastError = tour.error;
    if (tour.ok) {
      const normalized = tour.value.items.map((item) => ({
        galContentId: item.contentid,
        galTitle: item.title,
        galWebImageUrl: httpsUrl(item.firstimage || item.firstimage2),
        galPhotographyLocation: clean(item.addr1 || region),
        galPhotographer: "한국관광공사",
        galSearchKeyword: keyword,
      })).filter((item) => item.galWebImageUrl);
      if (normalized.length) return { ok: true, value: { items: normalized, total: normalized.length } } as Attempt;
    }
  }

  return providerWorked
    ? { ok: true, value: { items: [], total: 0 } }
    : { ok: false, error: lastError };
}

function normalizedSearchText(value: unknown) {
  return clean(value, 120).toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
}

function scoreSpotPhotoTitle(candidate: unknown, requestedTitle: string) {
  const candidateText = normalizedSearchText(candidate);
  const requestedText = normalizedSearchText(requestedTitle);
  if (!candidateText || !requestedText) return 0;
  if (candidateText === requestedText) return 120;
  if (candidateText.includes(requestedText) || requestedText.includes(candidateText)) return 90;
  const requestedTokens = clean(requestedTitle, 120).split(/\s+/).map(normalizedSearchText).filter((token) => token.length >= 2);
  return requestedTokens.reduce((score, token) => score + (candidateText.includes(token) ? 12 : 0), 0);
}

async function fetchSpotPhoto(env: Env, region: string, title: string, tag = "", contentId = "") {
  const normalizedTitle = clean(title, 80)
    .replace(/\([^)]*\)|（[^）]*）/g, " ")
    .replace(/\b(주식회사|유한회사)\b|\(주\)|지점|본점/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const keywords = [...new Set([
    clean(title, 80),
    normalizedTitle,
    clean(`${region} ${normalizedTitle}`, 80),
    clean(`${region} ${tag || "관광"}`, 80),
    clean(regionPhotoKeywords[region] || `${region} 관광`, 80),
  ].filter((value) => value.length >= 2))].slice(0, 5);

  let providerWorked = false;
  if (/^\d{3,}$/.test(contentId)) {
    const detail = await attempt(fetchKto(env, "KorService2", "detailCommon2", {
      ...commonParams("1"), contentId,
    }));
    providerWorked ||= detail.ok;
    const item = detail.ok ? detail.value.items[0] : undefined;
    const image = httpsUrl(item?.firstimage || item?.firstimage2);
    if (image) {
      return {
        image,
        source: "한국관광공사 관광정보",
        matchedTitle: clean(item?.title || title),
        query: contentId,
        status: "live",
      };
    }
  }

  // 정확한 장소명부터 순차 검색한다. 카드 3개가 동시에 열려도 처음부터 30건을
  // 몰아 호출하지 않아 공공데이터 초당 호출 제한을 피할 수 있다.
  for (const keyword of keywords) {
    const [gallery, tour] = await Promise.all([
      attempt(fetchKto(env, "PhotoGalleryService1", "gallerySearchList1", { ...commonParams("12"), arrange: "C", keyword })),
      attempt(fetchKto(env, "KorService2", "searchKeyword2", { ...commonParams("12"), arrange: "Q", keyword })),
    ]);
    providerWorked ||= gallery.ok || tour.ok;
    const candidates = [
      ...(gallery.ok ? gallery.value.items.map((item) => ({
        image: httpsUrl(item.galWebImageUrl || item.galWebImageUrl2),
        title: clean(item.galTitle),
        source: "한국관광공사 관광사진",
      })) : []),
      ...(tour.ok ? tour.value.items.map((item) => ({
        image: httpsUrl(item.firstimage || item.firstimage2),
        title: clean(item.title),
        source: "한국관광공사 관광정보",
      })) : []),
    ].filter((candidate) => candidate.image)
      .sort((left, right) => scoreSpotPhotoTitle(right.title, normalizedTitle) - scoreSpotPhotoTitle(left.title, normalizedTitle));
    const best = candidates[0];
    if (best) {
      return {
        image: best.image,
        source: best.source,
        matchedTitle: best.title || clean(title),
        query: keyword,
        status: "live",
      };
    }
  }

  return { image: "", source: "", matchedTitle: clean(title), status: providerWorked ? "empty" : "error" };
}

async function fetchRelated(env: Env, region: string, preferredYm = "") {
  const codes = regionCodes[region]?.full?.length ? regionCodes[region].full : regionCodes["창원"].full;
  const months = [...new Set([preferredYm, ...Array.from({ length: 12 }, (_, index) => previousMonth(index + 2))].filter(Boolean))];
  let last: Attempt = { ok: true, value: { items: [], total: 0 } };
  for (const baseYm of months) {
    const results = await Promise.all(codes.map((code) => attempt(fetchKto(env, "TarRlteTarService1", "areaBasedList1", {
      ...commonParams("10"), baseYm, areaCd: "48", signguCd: code,
    }))));
    const available = results.filter((result): result is Extract<Attempt, { ok: true }> => result.ok);
    if (available.length) {
      const items = available.flatMap((result) => result.value.items);
      last = { ok: true, value: { items, total: items.length } };
      if (items.length) return { result: last, baseYm };
    } else if (results[0]) last = results[0];
  }
  return { result: last, baseYm: preferredYm };
}

async function fetchCrowd(env: Env, region: string, title: string) {
  const code = regionCodes[region]?.full?.[0] || regionCodes["창원"].full[0];
  return attempt(fetchKto(env, "TatsCnctrRateService", "tatsCnctrRatedList", {
    ...commonParams("10"), areaCd: "48", signguCd: code, ...(title ? { tAtsNm: title } : {}),
  }));
}

function photoFrom(result: Attempt, region = "") {
  if (!result.ok || !result.value.items.length) return null;
  const strict = result.value.items.find((candidate) => {
    const haystack = `${clean(candidate.galTitle)} ${clean(candidate.galPhotographyLocation)} ${clean(candidate.galSearchKeyword)}`;
    return !region || region === "경남 전체" || haystack.includes(region);
  });
  const item = strict || result.value.items[0];
  return {
    id: clean(item.galContentId),
    title: clean(item.galTitle),
    image: clean(item.galWebImageUrl).replace(/^http:\/\//, "https://"),
    location: clean(item.galPhotographyLocation),
    photographer: clean(item.galPhotographer),
    month: clean(item.galPhotographyMonth),
  };
}

function apiStatus(id: string, name: string, role: string, result: Attempt, count?: number) {
  const found = count ?? (result.ok ? result.value.items.length : 0);
  return {
    id, name, role,
    state: result.ok ? (found ? "live" : "empty") : "error",
    count: found,
    note: result.ok ? (found ? "실시간 응답 반영" : "조건에 맞는 결과 없음") : result.error,
  };
}

function mergePlaces(primary: KtoItem[], secondary: KtoItem[]) {
  const merged = new Map<string, KtoItem>();
  secondary.forEach((item) => merged.set(clean(item.contentid || item.title), item));
  primary.forEach((item) => {
    const id = clean(item.contentid || item.title);
    merged.set(id, { ...(merged.get(id) || {}), ...item });
  });
  return [...merged.values()];
}

function placeFrom(item: KtoItem, detail: KtoItem, region: string, profiles: string[], index: number) {
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

function courseFrom(result: Attempt) {
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

function richSpot(item: KtoItem, source: string) {
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

function ymd(daysAgo: number) {
  const date = new Date(Date.now() - daysAgo * 86400000);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

async function fetchVisitorInsight(env: Env, region: string) {
  let last: Attempt = { ok: true, value: { items: [], total: 0 } };
  for (const offset of [7, 30, 60, 90, 150]) {
    const result = await attempt(fetchKto(env, "DataLabService", "locgoRegnVisitrDDList", {
      ...commonParams("1000"), MobileOS: "ETC", startYmd: ymd(offset + 6), endYmd: ymd(offset),
    }));
    last = result;
    if (result.ok && result.value.items.length) {
      const items = result.value.items.filter((item) => {
        const name = clean(item.signguNm); const code = clean(item.signguCode || item.signguCd);
        return region === "경남 전체" ? code.startsWith("48") : name.includes(region) || regionCodes[region]?.full.includes(code);
      });
      if (items.length) return { result: { ok: true, value: { items, total: items.length } } as Attempt, startYmd: ymd(offset + 6), endYmd: ymd(offset) };
    }
  }
  return { result: last, startYmd: "", endYmd: "" };
}

async function fetchDemandInsight(env: Env, region: string) {
  const code = regionCodes[region]?.full?.[0] || regionCodes["창원"].full[0];
  let last: Attempt = { ok: true, value: { items: [], total: 0 } };
  for (let offset = 2; offset <= 14; offset += 1) {
    const baseYm = previousMonth(offset);
    const result = await attempt(fetchKto(env, "AreaTarResDemService", "areaTarSvcDemList", {
      ...commonParams("30"), baseYm, areaCd: "48", ...(region !== "경남 전체" ? { signguCd: code } : {}), tarSvcDemIxCd: "11",
    }));
    last = result;
    if (result.ok && result.value.items.length) return { result, baseYm };
  }
  return { result: last, baseYm: "" };
}

async function fetchWaterTravel(env: Env, searchTypeCd: "01" | "02") {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!key) return { ok: false, error: "서버 인증키가 등록되지 않았습니다." } as Attempt;
  // data.go.kr의 encoded key를 URLSearchParams에 넣으면 % 문자가 다시 인코딩되어
  // 승인된 키도 403으로 거절될 수 있다. serviceKey는 원문 그대로 붙인다.
  const params = new URLSearchParams({ pageNo: "1", numOfRows: "8", searchTypeCd });
  try {
    const response = await fetch(`https://apis.data.go.kr/B500001/myportal/travel/travellist?serviceKey=${key}&${params.toString()}`, { signal: AbortSignal.timeout(9500), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`물과 여행 응답 ${response.status}`);
    const raw = await response.text();
    const trimmed = raw.trim();
    return {
      ok: true,
      value: trimmed.startsWith("<") ? normalizeXmlItems(trimmed) : normalizeItems(JSON.parse(trimmed)),
    } as Attempt;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? clean(error.message, 120) : "물과 여행 호출 확인 필요" } as Attempt;
  }
}

async function fetchCamping(env: Env, region: string) {
  const keyword = region === "경남 전체" ? "경상남도" : region;
  const primary = await attempt(fetchKto(env, "GoCamping", "searchList", { ...commonParams("24"), keyword }));
  if (primary.ok && primary.value.items.length) return primary;
  const catalog = await attempt(fetchKto(env, "GoCamping", "basedList", { ...commonParams("1000") }));
  if (!catalog.ok) return primary.ok ? catalog : primary;
  const matched = catalog.value.items.filter((item) => {
    const address = clean(item.addr1 || item.addr2 || item.doNm || item.sigunguNm);
    return region === "경남 전체"
      ? /경상남도|경남/.test(address)
      : address.includes(region);
  });
  return { ok: true, value: { items: matched, total: matched.length } } as Attempt;
}

async function provinceFallback(primary: Promise<Attempt>, fallback: () => Promise<Attempt>) {
  const result = await primary;
  if (!result.ok || result.value.items.length) return result;
  const broader = await fallback();
  return broader.ok && broader.value.items.length ? broader : result;
}

async function fetchThemeRests(env: Env): Promise<Attempt> {
  const key = env.EXPRESSWAY_API_KEY?.trim();
  if (!key) return { ok: false, error: "고속도로 공공데이터 포털 전용키 연결 대기" };
  try {
    const params = new URLSearchParams({ key, type: "json" });
    const response = await fetch(`https://data.ex.co.kr/openapi/restinfo/restThemeList?${params.toString()}`, { signal: AbortSignal.timeout(9500), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`테마휴게소 응답 ${response.status}`);
    return { ok: true, value: normalizeExpresswayItems(await response.json()) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? clean(error.message, 120) : "테마휴게소 호출 확인 필요" };
  }
}

function todayYmd() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .replaceAll("-", "");
}

function safeYmd(value: string | null, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? String(value).replaceAll("-", "") : fallback;
}

async function fetchRegionalEvents(env: Env, region: string, startDate: string, endDate: string): Promise<Attempt> {
  const districts = regionCodes[region].legal;
  const base = { ...commonParams("16"), arrange: "A", lDongRegnCd: "48", eventStartDate: startDate, eventEndDate: endDate };
  return provinceFallback(
    fetchRegionalList(env, "KorService2", "searchFestival2", base, districts),
    () => fetchRegionalList(env, "KorService2", "searchFestival2", base, []),
  );
}

async function fetchRegionalLodging(env: Env, region: string): Promise<Attempt> {
  const districts = regionCodes[region].legal;
  const base = { ...commonParams("12"), arrange: "Q", lDongRegnCd: "48", contentTypeId: "32" };
  return provinceFallback(
    fetchRegionalList(env, "KorService2", "areaBasedList2", base, districts),
    () => fetchRegionalList(env, "KorService2", "areaBasedList2", base, []),
  );
}

async function buildEnrichment(request: Request, env: Env) {
  const url = new URL(request.url);
  const requested = clean(url.searchParams.get("region"), 20);
  const region = regionCodes[requested] ? requested : "창원";
  const theme = contentTypes[clean(url.searchParams.get("theme"), 20)] ? clean(url.searchParams.get("theme"), 20) : "nature";
  const locale = languageServices[clean(url.searchParams.get("locale"), 20)] ? clean(url.searchParams.get("locale"), 20) : "ko";
  const eventStartDate = safeYmd(url.searchParams.get("startDate"), todayYmd());
  const eventEndDate = safeYmd(url.searchParams.get("endDate"), eventStartDate);
  const language = languageServices[locale === "ko" ? "en" : locale];
  const districts = regionCodes[region].legal;
  const baseLocation = { ...commonParams("10"), arrange: "Q", lDongRegnCd: "48" };
  const [visitorPack, camping, pet, wellness, medical, languageTour, awards, demandPack, waterCourses, waterPlaces, themeRests, events, lodging] = await Promise.all([
    fetchVisitorInsight(env, region),
    fetchCamping(env, region),
    fetchRegionalList(env, "KorPetTourService2", "areaBasedList2", { ...baseLocation, contentTypeId: contentTypes[theme] || "12" }, districts),
    provinceFallback(
      fetchRegionalList(env, "WellnessTursmService", "areaBasedList", { ...baseLocation, langDivCd: "KOR", contentTypeId: "12" }, districts),
      () => fetchRegionalList(env, "WellnessTursmService", "areaBasedList", { ...baseLocation, langDivCd: "KOR", contentTypeId: "12" }, []),
    ),
    provinceFallback(
      fetchRegionalList(env, "MdclTursmService", "areaBasedList", { ...baseLocation, langDivCd: "KOR" }, districts),
      () => fetchRegionalList(env, "MdclTursmService", "areaBasedList", { ...baseLocation, langDivCd: "KOR" }, []),
    ),
    fetchRegionalList(env, language.service, "areaBasedList2", baseLocation, districts),
    provinceFallback(
      attempt(fetchKto(env, "PhokoAwrdService", "phokoAwrdList", { ...commonParams("12"), arrange: "Q", lDongRegnCd: "48", ...(region !== "경남 전체" ? { keyword: region } : {}) })),
      () => attempt(fetchKto(env, "PhokoAwrdService", "phokoAwrdList", { ...commonParams("12"), arrange: "Q", lDongRegnCd: "48" })),
    ),
    fetchDemandInsight(env, region),
    fetchWaterTravel(env, "01"),
    fetchWaterTravel(env, "02"),
    fetchThemeRests(env),
    fetchRegionalEvents(env, region, eventStartDate, eventEndDate),
    fetchRegionalLodging(env, region),
  ]);
  const visitorItems = visitorPack.result.ok ? visitorPack.result.value.items : [];
  const visitorTotal = Math.round(visitorItems.reduce((sum, item) => sum + Number(item.touNum || 0), 0));
  const visitorByType = visitorItems.reduce<Record<string, number>>((acc, item) => {
    const name = clean(item.touDivNm || "방문자"); acc[name] = (acc[name] || 0) + Number(item.touNum || 0); return acc;
  }, {});
  const demandItems = demandPack.result.ok ? demandPack.result.value.items : [];
  const spots = (result: Attempt, source: string) => result.ok ? result.value.items.map((item) => richSpot(item, source)).filter((item) => item.title && item.title !== "이름 없는 콘텐츠").slice(0, 8) : [];
  const statuses = [
    apiStatus("visitor", "지역별 방문자수", "최근 7일 방문 흐름과 방문자 구성", visitorPack.result, visitorItems.length),
    apiStatus("camping", "고캠핑", "지역 캠핑장과 운영·시설 정보", camping),
    apiStatus("pet", "반려동물 동반여행", "반려동물과 함께 갈 수 있는 관광·숙박·음식", pet),
    apiStatus("wellness", "웰니스 관광", "휴식·명상·스파·자연치유 여행 후보", wellness),
    apiStatus("medical", "의료 관광", "의료 관광시설과 안전 보조 정보", medical),
    apiStatus("language", language.name, `${language.source} 공식 관광 안내`, languageTour),
    apiStatus("award", "관광공모전 수상사진", "수상작 이미지와 촬영지·저작권 정보", awards),
    apiStatus("demand", "관광 자원 수요", "SNS·소비·내비게이션 기반 지역 수요 지표", demandPack.result, demandItems.length),
    apiStatus("water", "물과 여행", "낙동강 수변 코스와 주요 명소", waterCourses.ok || waterPlaces.ok ? { ok: true, value: { items: [...(waterCourses.ok ? waterCourses.value.items : []), ...(waterPlaces.ok ? waterPlaces.value.items : [])], total: 0 } } : waterCourses),
    env.EXPRESSWAY_API_KEY?.trim()
      ? apiStatus("rest", "테마휴게소", "관광·문화·체험형 고속도로 휴식 지점", themeRests)
      : { id: "rest", name: "테마휴게소", role: "관광·문화·체험형 고속도로 휴식 지점", state: "ready", count: 0, note: "선택 기능 · 한국도로공사 전용키 연결 시 활성화" },
    apiStatus("event", "축제·행사", "현재부터 열리는 지역 축제·공연·문화행사", events),
    apiStatus("lodging", "숙박", "여행 지역의 숙박시설과 위치 정보", lodging),
  ];
  return {
    generatedAt: new Date().toISOString(),
    visitor: { total: visitorTotal, byType: visitorByType, startYmd: visitorPack.startYmd, endYmd: visitorPack.endYmd },
    demand: demandItems.map((item) => ({ name: clean(item.tarSvcDemIxNm), value: Number(item.tarSvcDemIxVal || 0), baseYm: clean(item.baseYm || demandPack.baseYm) })).slice(0, 8),
    camping: spots(camping, "고캠핑"), pet: spots(pet, "반려동물 동반여행"), wellness: spots(wellness, "웰니스 관광"),
    medical: spots(medical, "의료 관광"), language: spots(languageTour, language.source), awards: spots(awards, "관광공모전 수상작"),
    water: [...spots(waterCourses, "낙동강 수변 코스"), ...spots(waterPlaces, "낙동강 수변 명소")].slice(0, 8),
    rests: spots(themeRests, "한국도로공사 테마휴게소"),
    events: spots(events, "지역 축제·행사"),
    lodging: spots(lodging, "국문 관광정보 · 숙박"),
    statuses,
  };
}

function audioFrom(result: Attempt) {
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

async function buildPlan(request: Request, env: Env) {
  const url = new URL(request.url);
  const requestedRegion = clean(url.searchParams.get("region"), 20);
  const region = regionCodes[requestedRegion] ? requestedRegion : "창원";
  const theme = contentTypes[clean(url.searchParams.get("theme"), 20)] ? clean(url.searchParams.get("theme"), 20) : "nature";
  const locale = languageServices[clean(url.searchParams.get("locale"), 20)] ? clean(url.searchParams.get("locale"), 20) : "ko";
  const language = languageServices[locale];
  const profiles = clean(url.searchParams.get("profiles"), 100).split(",").filter((item) => profileFields[item]).slice(0, 6);
  const districts = regionCodes[region].legal;
  const locationParams = {
    ...commonParams("12"),
    arrange: "Q",
    contentTypeId: contentTypes[theme],
    lDongRegnCd: "48",
  };

  const [barrier, tour, durunubi, hubPack, photo] = await Promise.all([
    fetchRegionalList(env, "KorWithService2", "areaBasedList2", locationParams, districts),
    fetchRegionalList(env, language.service, "areaBasedList2", locale === "ko" ? locationParams : { ...commonParams("12"), arrange: "Q", lDongRegnCd: "48" }, districts),
    attempt(fetchKto(env, "Durunubi", "courseList", {
      ...commonParams("10"), brdDiv: "DNWW", crsLevel: "1", ...(region !== "경남 전체" ? { crsKorNm: region } : {}),
    })),
    fetchHub(env, region),
    fetchPhoto(env, region),
  ]);

  const baseItems = mergePlaces(barrier.ok ? barrier.value.items : [], tour.ok ? tour.value.items : []).slice(0, 6);
  const details = await Promise.all(baseItems.map((item) => attempt(fetchKto(env, "KorWithService2", "detailWithTour2", {
    ...commonParams("1"), contentId: clean(item.contentid),
  }))));
  // 원본 API의 인기 정렬보다 사용자가 선택한 편의조건의 공식 확인 근거를
  // 우선한다. 근거 없는 후보도 숨기지는 않되 첫 추천·자동 경로 뒤로 보낸다.
  const places = baseItems
    .map((item, index) => placeFrom(item, details[index]?.ok ? details[index].value.items[0] || {} : {}, region, profiles, index))
    .sort((left, right) => {
      const leftVerified = left.score === null ? 0 : 1;
      const rightVerified = right.score === null ? 0 : 1;
      return rightVerified - leftVerified
        || (right.score ?? -1) - (left.score ?? -1)
        || (right.knownFields ?? 0) - (left.knownFields ?? 0);
    });

  const firstTitle = places[0]?.name || region;
  const [audio, relatedPack, crowd] = await Promise.all([
    attempt(fetchKto(env, "Odii", "storySearchList", { ...commonParams("5"), langCode: language.audio, keyword: firstTitle })),
    fetchRelated(env, region, hubPack.baseYm),
    fetchCrowd(env, region, firstTitle),
  ]);
  const course = courseFrom(durunubi);
  const hubItems = hubPack.result.ok ? hubPack.result.value.items : [];
  const stops = places.slice(0, 3).map((place, index) => ({
    title: place.name,
    note: place.score === null
      ? "공식 편의정보가 부족한 후보입니다. 방문 전 시설 운영기관에 확인해 주세요."
      : index === 0
        ? `${place.features.slice(0, 2).join("·")} 편의정보가 공식 데이터에서 확인됐습니다.`
        : place.summary,
    source: place.source,
    evidenceState: place.score === null ? "limited" : "verified",
  }));
  hubItems.slice(0, Math.max(0, 3 - stops.length)).forEach((item) => stops.push({
    title: clean(item.hubTatsNm),
    note: `${clean(item.signguNm || region)} 중심관광지 ${clean(item.hubRank)}순위로 연결성이 높은 후보입니다.`,
    source: `기초지자체 중심 관광지 · ${hubPack.baseYm}`,
    evidenceState: "context",
  }));
  if (stops.length < 4 && relatedPack.result.ok) {
    relatedPack.result.value.items.slice(0, 4 - stops.length).forEach((item) => stops.push({
      title: clean(item.rlteTatsNm),
      note: `${clean(item.tAtsNm || firstTitle)}와 함께 찾는 연관 관광지 ${clean(item.rlteRank || "")}순위 후보입니다.`,
      source: `연관 관광지 · ${relatedPack.baseYm}`,
      evidenceState: "context",
    }));
  }
  if (course && stops.length < 4) stops.push({ title: course.name, note: course.summary, source: "두루누비 걷기 코스", evidenceState: "context" });

  const statuses = [
    apiStatus("barrierfree", "무장애 여행정보", "주차·접근로·휠체어·화장실 등 상세 편의정보", barrier, details.filter((item) => item.ok && item.value.items.length).length),
    apiStatus("tour", language.name, `${language.source} 관광지 좌표·이미지·주소와 지역 기반 검색`, tour),
    apiStatus("audio", "관광지 오디오 가이드", "관광 해설 음원과 청각 지원용 전체 대본", audio),
    apiStatus("durunubi", "두루누비 정보", "걷기 코스 거리·시간·난이도와 여행자 정보", durunubi),
    apiStatus("hub", "기초지자체 중심 관광지", "지역 안에서 연결성이 높은 중심 관광지 순위", hubPack.result),
    apiStatus("photo", "관광사진 정보", "지역·축제 키워드 기반 관광사진과 촬영 출처", photo),
    apiStatus("related", "관광지별 연관 관광지", "함께 방문하기 좋은 관광·음식·숙박 후보", relatedPack.result),
    apiStatus("crowd", "관광지 집중률 예측", "향후 30일 관광객 집중률과 혼잡 회피 근거", crowd),
  ];
  const live = statuses.filter((status) => status.state === "live").length;

  return {
    mode: live === statuses.length ? "live" : live ? "partial" : "fallback",
    generatedAt: new Date().toISOString(),
    baseYm: hubPack.baseYm,
    places,
    course,
    audio: audioFrom(audio),
    photo: photoFrom(photo, region),
    crowd: crowd.ok && crowd.value.items.length ? {
      rate: Number(crowd.value.items[0].cnctrRate || 0),
      baseYmd: clean(crowd.value.items[0].baseYmd),
      place: clean(crowd.value.items[0].tAtsNm || firstTitle),
    } : null,
    stops,
    statuses,
  };
}


async function restoreSharedPlan(
  env: Env,
  saved: Record<string, unknown>,
  selections: Record<string, unknown>,
  currentPlanPromise: Promise<Awaited<ReturnType<typeof buildPlan>>>,
) {
  const refs = (Array.isArray(saved.placeRefs) ? saved.placeRefs : [])
    .map((value) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {})
    .map((value) => ({ contentId: clean(value.contentId, 80), order: Math.max(0, Math.trunc(Number(value.order) || 0)) }))
    .filter((value) => value.contentId)
    .sort((a, b) => a.order - b.order)
    .slice(0, 6);
  if (!refs.length) return { plan: await currentPlanPromise, restoration: { requested: 0, restored: 0, missing: 0, mode: "legacy" } };

  const region = regionCodes[clean(selections.region, 20)] ? clean(selections.region, 20) : "창원";
  const profiles = Array.isArray(selections.profiles)
    ? selections.profiles.map((value) => clean(value, 20)).filter((value) => profileFields[value]).slice(0, 6)
    : [];
  const officialPlacesPromise = Promise.all(refs.map(async ({ contentId }, index) => {
    const [common, barrier] = await Promise.all([
      attempt(fetchKto(env, "KorService2", "detailCommon2", {
        ...commonParams("1"), contentId, defaultYN: "Y", firstImageYN: "Y", areacodeYN: "Y", addrinfoYN: "Y", mapinfoYN: "Y", overviewYN: "Y",
      })),
      attempt(fetchKto(env, "KorWithService2", "detailWithTour2", { ...commonParams("1"), contentId })),
    ]);
    const item = common.ok ? common.value.items[0] : null;
    return item ? placeFrom(item, barrier.ok ? barrier.value.items[0] || {} : {}, region, profiles, index) : null;
  }));
  const [currentPlan, officialPlaces] = await Promise.all([currentPlanPromise, officialPlacesPromise]);
  const currentById = new Map(currentPlan.places.map((place) => [place.id, place]));
  const restored = officialPlaces.map((place, index) => place || currentById.get(refs[index].contentId) || null);
  const places = restored.filter((place): place is NonNullable<typeof place> => Boolean(place));
  const missing = Math.max(0, refs.length - places.length);
  if (!places.length) {
    return { plan: currentPlan, restoration: { requested: refs.length, restored: 0, missing: refs.length, mode: "condition-fallback" } };
  }
  const stops = places.slice(0, 3).map((place, index) => ({
    title: place.name,
    note: index === 0 ? `${place.features.slice(0, 2).join("·")} 정보를 먼저 확인해요.` : place.summary,
    source: place.source,
  }));
  return {
    plan: { ...currentPlan, places, stops },
    restoration: { requested: refs.length, restored: places.length, missing, mode: "content-id" },
  };
}

function database() {
  const url = typeof process === "undefined" ? "" : process.env.DATABASE_URL?.trim();
  return url ? neon(url) : null;
}

async function ensureDb() {
  const sql = database();
  if (!sql) return null;
  await sql`CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS itineraries_expires_idx ON itineraries (expires_at)`;
  await sql`CREATE TABLE IF NOT EXISTS place_feedback (
    id TEXT PRIMARY KEY,
    place_id TEXT NOT NULL,
    place_name TEXT NOT NULL,
    field TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    created_at BIGINT NOT NULL
  )`;
  return sql;
}

async function handleTripsApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const id = clean(url.pathname.split("/").filter(Boolean)[2], 64);
  try {
  if (request.method === "GET") {
    if (!id) return json({ error: "공유 여행 ID가 필요합니다." }, 400);
    const sql = await ensureDb();
    if (!sql) return json({ error: "공유 여행 보관 기능을 준비 중입니다." }, 503);
    const rows = await sql`SELECT payload, created_at, expires_at FROM itineraries WHERE id = ${id} AND expires_at > ${Date.now()} LIMIT 1` as Array<{ payload: Record<string, unknown>; created_at: number | string; expires_at: number | string }>;
    const row = rows[0];
    if (!row) return json({ error: "공유 여행을 찾을 수 없거나 보관 기간이 지났습니다." }, 404);
    const saved = row.payload || {};
    const selections = (saved.selections || {}) as Record<string, unknown>;
    const params = new URLSearchParams({
      region: clean(selections.region, 20),
      theme: clean(selections.theme, 20),
      profiles: Array.isArray(selections.profiles) ? selections.profiles.map((value) => clean(value, 20)).join(",") : "",
      locale: clean(selections.locale || "ko", 20),
    });
    const currentPlanPromise = buildPlan(new Request(`${url.origin}/api/wave?${params.toString()}`), env);
    const restored = await restoreSharedPlan(env, saved, selections, currentPlanPromise);
    return json({ id, ...saved, ...restored, createdAt: Number(row.created_at), expiresAt: Number(row.expires_at) }, 200, true);
  }
  if (request.method !== "POST") return json({ error: "지원하지 않는 요청입니다." }, 405);
  const parsed = await readTrustedJson(request, 70000);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  if (typeof body.selections !== "object" || !body.selections || Array.isArray(body.selections)) return json({ error: "저장할 여행 조건이 필요합니다." }, 400);

  const rawSelections = body.selections as Record<string, unknown>;
  const requestedRegion = clean(rawSelections.region, 20);
  const requestedTheme = clean(rawSelections.theme, 20);
  const requestedLocale = clean(rawSelections.locale || "ko", 20);
  const rawProfiles = Array.isArray(rawSelections.profiles) ? rawSelections.profiles : [];
  const rawAssignments = rawSelections.scheduleAssignments && typeof rawSelections.scheduleAssignments === "object" && !Array.isArray(rawSelections.scheduleAssignments)
    ? rawSelections.scheduleAssignments as Record<string, unknown>
    : {};
  const rawSelectedPlaceIds = Array.isArray(rawSelections.selectedPlaceIds) ? rawSelections.selectedPlaceIds : [];
  const date = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value, 10)) ? clean(value, 10) : "";
  const selections = {
    region: regionCodes[requestedRegion] ? requestedRegion : "창원",
    theme: contentTypes[requestedTheme] ? requestedTheme : "nature",
    profiles: [...new Set(rawProfiles.map((value) => clean(value, 20)).filter((value) => profileFields[value]))].slice(0, 6),
    locale: languageServices[requestedLocale] ? requestedLocale : "ko",
    travelStart: date(rawSelections.travelStart),
    travelEnd: date(rawSelections.travelEnd),
    scheduleAssignments: Object.fromEntries(Object.entries(rawAssignments).slice(0, 12).map(([placeId, assignedDate]) => [clean(placeId, 80), date(assignedDate)]).filter(([placeId, assignedDate]) => placeId && assignedDate)),
    selectedPlaceIds: [...new Set(rawSelectedPlaceIds.map((value) => clean(value, 80)).filter(Boolean))].slice(0, 12),
  };

  const sql = await ensureDb();
  if (!sql) return json({ error: "공유 여행 보관 기능을 준비 중입니다." }, 503);
  const plan = (body.plan && typeof body.plan === "object" ? body.plan : {}) as Record<string, unknown>;
  const places = Array.isArray(plan.places) ? plan.places as Array<Record<string, unknown>> : [];
  const origin = (body.origin && typeof body.origin === "object" ? body.origin : {}) as Record<string, unknown>;
  const selectedIds = new Set(selections.selectedPlaceIds);
  const selectedPlaces = selectedIds.size ? places.filter((place) => selectedIds.has(clean(place.id, 80))) : places;
  const payloadObject = {
    selections,
    origin: { label: clean(origin.label || "선택 출발지", 80) },
    placeRefs: (selectedPlaces.length ? selectedPlaces : places).slice(0, 6).map((place, order) => ({ contentId: clean(place.id, 80), order })),
  };
  const payload = JSON.stringify(payloadObject);
  if (payload.length > 65000) return json({ error: "여행 계획이 너무 큽니다." }, 413);
  const newId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const now = Date.now();
  const expiresAt = now + 1000 * 60 * 60 * 24 * 30;
  await sql`INSERT INTO itineraries (id, payload, created_at, expires_at) VALUES (${newId}, ${payload}::jsonb, ${now}, ${expiresAt})`;
  return json({ id: newId, url: `${url.origin}/trip/${newId}`, expiresAt }, 201);
  } catch {
    return json({ error: request.method === "GET"
      ? "공유 여행을 불러오는 중 연결이 지연됐습니다. 잠시 후 다시 시도해 주세요."
      : "공유 여행을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}

async function handleFeedbackApi(request: Request) {
  if (request.method !== "POST") return json({ error: "POST 요청만 지원합니다." }, 405);
  const parsed = await readTrustedJson(request, 4000);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  const placeId = clean(body?.placeId, 80); const placeName = clean(body?.placeName, 100);
  const field = clean(body?.field || "접근성 정보", 60); const message = clean(body?.message, 800);
  if (!placeId || !placeName || message.length < 5) return json({ error: "장소와 5자 이상의 제보 내용을 입력해 주세요." }, 400);
  const sql = await ensureDb();
  if (!sql) return json({ error: "접근성 제보 보관 기능을 준비 중입니다." }, 503);
  const id = crypto.randomUUID();
  await sql`INSERT INTO place_feedback (id, place_id, place_name, field, message, status, created_at) VALUES (${id}, ${placeId}, ${placeName}, ${field}, ${message}, 'received', ${Date.now()})`;
  return json({ ok: true, id }, 201);
}

async function handleWaveApi(request: Request, env: Env) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  if (!env.TOUR_API_SERVICE_KEY_ENCODED) return json({ error: "서버 인증키 설정을 확인해 주세요." }, 503);
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "plan";
  if (action === "photo") {
    const requested = clean(url.searchParams.get("region"), 20);
    const region = regionCodes[requested] ? requested : "창원";
    const result = await fetchPhoto(env, region);
    return json({ photo: photoFrom(result, region), status: apiStatus("photo", "관광사진 정보", "지역 관광사진", result) }, result.ok ? 200 : 502, true);
  }
  if (action === "spot-photo") {
    const requested = clean(url.searchParams.get("region"), 20);
    const region = regionCodes[requested] ? requested : "창원";
    const title = clean(url.searchParams.get("title"), 100);
    const tag = clean(url.searchParams.get("tag"), 80);
    const contentId = clean(url.searchParams.get("contentId"), 80);
    if (!title) return json({ error: "사진을 찾을 장소명이 필요합니다." }, 400);
    return json(await fetchSpotPhoto(env, region, title, tag, contentId), 200, true);
  }
  if (action === "crowd") {
    const requested = clean(url.searchParams.get("region"), 20);
    const region = regionCodes[requested] ? requested : "창원";
    const title = clean(url.searchParams.get("title"), 100);
    const result = await fetchCrowd(env, region, title);
    const item = result.ok ? result.value.items[0] : undefined;
    return json({ crowd: item ? { rate: Number(item.cnctrRate || 0), baseYmd: clean(item.baseYmd), place: clean(item.tAtsNm || title) } : null, status: apiStatus("crowd", "관광지 집중률 예측", "선택 관광지 혼잡 예측", result) }, result.ok ? 200 : 502, true);
  }
  if (action === "enrich") {
    try { return json(await buildEnrichment(request, env), 200, true); }
    catch (error) { return json({ error: error instanceof Error ? clean(error.message, 120) : "확장 관광 데이터를 처리하지 못했습니다." }, 502); }
  }
  if (action !== "plan") return json({ error: "지원하지 않는 작업입니다." }, 400);
  try {
    return json(await buildPlan(request, env), 200, true);
  } catch (error) {
    return json({ error: error instanceof Error ? clean(error.message, 120) : "관광 데이터를 처리하지 못했습니다." }, 502);
  }
}

export async function handlePortableApi(request: Request): Promise<Response> {
  const env = portableEnv();
  const url = new URL(request.url);

  if (url.pathname === "/api/wave") return handleWaveApi(request, env);
  if (url.pathname === "/api/weather") return handleWeatherApi(request);
  if (url.pathname === "/api/location-search") return handleLocationSearch(request, env);
  if (url.pathname === "/api/route") return handleRouteApi(request, env);
  if (url.pathname === "/api/map-config") return handleMapConfig(env);
  if (url.pathname === "/api/health") return handleHealthApi(env);
  if (url.pathname === "/api/trips" || url.pathname.startsWith("/api/trips/")) return handleTripsApi(request, env);
  if (url.pathname === "/api/feedback") return handleFeedbackApi(request);
  return json({ error: "지원하지 않는 API 경로입니다." }, 404);
}
