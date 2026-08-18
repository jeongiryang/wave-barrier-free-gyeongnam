/** Cloudflare Worker entry point for the W.A.V.E Sites application. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

type KtoItem = Record<string, string | number | null | undefined>;

export interface Env {
  ASSETS?: Fetcher;
  DB?: D1Database;
  TOUR_API_SERVICE_KEY_ENCODED?: string;
  EXPRESSWAY_API_KEY?: string;
  ODSAY_API_KEY?: string;
  KAKAO_MAP_JAVASCRIPT_KEY?: string;
  KAKAO_REST_API_KEY?: string;
  KORAIL_API_KEY?: string;
  TAGO_API_KEY?: string;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type KtoResult = { items: KtoItem[]; total: number };
type Attempt = { ok: true; value: KtoResult } | { ok: false; error: string };
type TransportProviderState = "connected" | "ready" | "error" | "missing";

type MemoryTrip = { payload: string; createdAt: number; expiresAt: number };

const portableTrips = new Map<string, MemoryTrip>();
const portableFeedback: Array<Record<string, string | number>> = [];

/**
 * Vercel·Render의 Node 런타임에서는 Cloudflare 바인딩 대신 프로세스 환경
 * 변수를 사용한다. D1이 없는 경우 공유 링크와 제보는 인스턴스 메모리에만
 * 보관되며, 관광·지도·교통 API는 동일하게 동작한다.
 */
function portableEnv(): Env {
  const values = typeof process === "undefined" ? {} : process.env;
  return {
    TOUR_API_SERVICE_KEY_ENCODED: values.TOUR_API_SERVICE_KEY_ENCODED,
    EXPRESSWAY_API_KEY: values.EXPRESSWAY_API_KEY,
    ODSAY_API_KEY: values.ODSAY_API_KEY,
    KAKAO_MAP_JAVASCRIPT_KEY: values.KAKAO_MAP_JAVASCRIPT_KEY,
    KAKAO_REST_API_KEY: values.KAKAO_REST_API_KEY,
    KORAIL_API_KEY: values.KORAIL_API_KEY,
    TAGO_API_KEY: values.TAGO_API_KEY,
  };
}

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
  남해: "남해 독일마을", 하동: "하동 야생차", 산청: "산청 동의보감촌", 함양: "함양 지리산",
  거창: "거창 수승대", 합천: "합천 황매산",
};

const regionCoordinates: Record<string, { lat: number; lng: number }> = {
  "경남 전체": { lat: 35.2383, lng: 128.6924 }, 창원: { lat: 35.2279, lng: 128.6811 }, 진주: { lat: 35.1800, lng: 128.1076 },
  통영: { lat: 34.8544, lng: 128.4332 }, 사천: { lat: 35.0038, lng: 128.0642 }, 김해: { lat: 35.2285, lng: 128.8893 },
  밀양: { lat: 35.5038, lng: 128.7464 }, 거제: { lat: 34.8806, lng: 128.6211 }, 양산: { lat: 35.3350, lng: 129.0372 },
  의령: { lat: 35.3222, lng: 128.2617 }, 함안: { lat: 35.2725, lng: 128.4065 }, 창녕: { lat: 35.5446, lng: 128.4923 },
  고성: { lat: 34.9731, lng: 128.3223 }, 남해: { lat: 34.8377, lng: 127.8925 }, 하동: { lat: 35.0672, lng: 127.7513 },
  산청: { lat: 35.4156, lng: 127.8735 }, 함양: { lat: 35.5205, lng: 127.7252 }, 거창: { lat: 35.6867, lng: 127.9095 }, 합천: { lat: 35.5667, lng: 128.1658 },
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

function commonParams(rows = "12") {
  return {
    numOfRows: rows,
    pageNo: "1",
    MobileOS: "WEB",
    MobileApp: "WAVE",
    _type: "json",
  };
}

function clean(value: unknown, max = 240) {
  return String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

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

function normalizeItems(data: unknown): KtoResult {
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
  return { items: items as KtoItem[], total: Number(body.totalCount || items.length || 0) };
}

function normalizeExpresswayItems(data: unknown): KtoResult {
  const root = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const list = root.list || root.items || root.data;
  const items = Array.isArray(list) ? list : list && typeof list === "object" ? [list] : [];
  return { items: items as KtoItem[], total: Number(root.count || root.totalCount || items.length || 0) };
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

/**
 * 일부 공공데이터 API는 JSON을 명시해도 XML만 반환한다. 외부 패키지 없이
 * 반복 item 노드의 직계 필드를 안전하게 평탄화해 기존 관광 데이터 모델로 넘긴다.
 */
function normalizeXmlItems(xml: string): KtoResult {
  const errorMessage = xml.match(/<(?:resultMsg|returnAuthMsg|errMsg)>([\s\S]*?)<\/(?:resultMsg|returnAuthMsg|errMsg)>/i)?.[1];
  const resultCode = clean(xml.match(/<resultCode>([\s\S]*?)<\/resultCode>/i)?.[1]);
  if (resultCode && !["0", "00", "0000"].includes(resultCode)) {
    throw new Error(clean(decodeXml(errorMessage || "공공데이터 API 오류"), 120));
  }
  const blocks = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  const items = blocks.map((block) => {
    const item: KtoItem = {};
    for (const field of block.matchAll(/<([A-Za-z_][\w.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
      item[field[1]] = clean(decodeXml(field[2]), 2000);
    }
    return item;
  });
  const total = Number(clean(xml.match(/<totalCount>([\s\S]*?)<\/totalCount>/i)?.[1]) || items.length);
  return { items, total };
}

async function fetchKto(env: Env, service: string, operation: string, params: Record<string, string>): Promise<KtoResult> {
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

function publicTransportKey(env: Env) {
  return env.TAGO_API_KEY?.trim()
    || env.KORAIL_API_KEY?.trim()
    || env.TOUR_API_SERVICE_KEY_ENCODED?.trim()
    || "";
}

async function fetchPublicTransport(env: Env, serviceUrl: string, operation: string, params: Record<string, string> = {}): Promise<KtoResult> {
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

function koreaYmd(offsetDays = 0) {
  const date = new Date(Date.now() + (9 * 60 * 60 * 1000) + (offsetDays * 24 * 60 * 60 * 1000));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function transportProvider(
  id: string,
  name: string,
  role: string,
  hasKey: boolean,
  result?: Attempt | null,
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

async function attempt(promise: Promise<KtoResult>): Promise<Attempt> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? clean(error.message, 120) : "호출 확인 필요" };
  }
}

async function fetchRegionalList(env: Env, service: string, operation: string, params: Record<string, string>, districts: string[]) {
  const calls = districts.length
    ? districts.map((district) => attempt(fetchKto(env, service, operation, { ...params, lDongSignguCd: district })))
    : [attempt(fetchKto(env, service, operation, params))];
  const results = await Promise.all(calls);
  const successes = results.filter((result): result is Extract<Attempt, { ok: true }> => result.ok);
  if (!successes.length) return results[0];
  const items = successes.flatMap((result) => result.value.items);
  const unique = [...new Map(items.map((item) => [clean(item.contentid || item.title), item])).values()];
  return { ok: true, value: { items: unique, total: unique.length } } as Attempt;
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

async function fetchPhoto(env: Env, region: string) {
  const keyword = region === "경남 전체" ? "경상남도 관광" : (regionPhotoKeywords[region] || region);
  return attempt(fetchKto(env, "PhotoGalleryService1", "gallerySearchList1", {
    ...commonParams("12"), arrange: "C", keyword,
  }));
}

async function fetchSpotPhoto(env: Env, region: string, title: string) {
  const keyword = clean(title || region, 80);
  const [gallery, tour] = await Promise.all([
    attempt(fetchKto(env, "PhotoGalleryService1", "gallerySearchList1", { ...commonParams("8"), arrange: "C", keyword })),
    attempt(fetchKto(env, "KorService2", "searchKeyword2", { ...commonParams("8"), arrange: "Q", keyword })),
  ]);
  const galleryItem = gallery.ok ? gallery.value.items.find((item) => clean(item.galWebImageUrl)) : undefined;
  const tourItem = tour.ok ? tour.value.items.find((item) => clean(item.firstimage || item.firstimage2)) : undefined;
  const image = clean(galleryItem?.galWebImageUrl || tourItem?.firstimage || tourItem?.firstimage2).replace(/^http:\/\//, "https://");
  return { image, source: galleryItem ? "한국관광공사 관광사진" : tourItem ? "한국관광공사 관광정보" : "", matchedTitle: clean(galleryItem?.galTitle || tourItem?.title || title), status: gallery.ok || tour.ok ? (image ? "live" : "empty") : "error" };
}

function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if ([1, 2].includes(code)) return "대체로 맑음";
  if (code === 3) return "흐림";
  if ([45, 48].includes(code)) return "안개";
  if ([51, 53, 55, 56, 57].includes(code)) return "이슬비";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "비";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "눈";
  if ([95, 96, 99].includes(code)) return "천둥번개";
  return "날씨 변화";
}

function weatherAdvice(daily: { max: number; min: number; rainProbability: number; rain: number; snow: number; uv: number }) {
  const messages: string[] = [];
  if (daily.rainProbability >= 50 || daily.rain >= 1) messages.push("우산과 미끄럼 방지 신발을 챙기세요.");
  if (daily.snow > 0) messages.push("눈 예보가 있어 방수 신발과 보온 장갑이 좋아요.");
  if (daily.uv >= 6) messages.push("자외선이 강해 선크림·모자·선글라스를 권해요.");
  if (daily.max <= 2) messages.push("패딩과 보온 내의를 준비하세요.");
  else if (daily.min < 10) messages.push("아침저녁 외투나 얇은 패딩이 필요해요.");
  else if (daily.max >= 28) messages.push("통풍이 잘되는 얇은 옷과 물을 챙기세요.");
  else messages.push("가벼운 겉옷을 겹쳐 입으면 편안해요.");
  return messages;
}

async function handleWeatherApi(request: Request) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const url = new URL(request.url);
  const requested = clean(url.searchParams.get("region"), 20);
  const region = regionCoordinates[requested] ? requested : "창원";
  const point = regionCoordinates[region];
  const params = new URLSearchParams({ latitude: String(point.lat), longitude: String(point.lng), timezone: "Asia/Seoul", forecast_days: "7", current: "temperature_2m,apparent_temperature,weather_code,is_day,precipitation,rain,showers,snowfall,wind_speed_10m", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,snowfall_sum,uv_index_max" });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`날씨 응답 ${response.status}`);
    const raw = await response.json() as Record<string, unknown>;
    const current = (raw.current || {}) as Record<string, number | string>;
    const daily = (raw.daily || {}) as Record<string, unknown>;
    const values = (key: string) => Array.isArray(daily[key]) ? daily[key] as Array<number | string> : [];
    const days = values("time").slice(0, 7).map((time, index) => ({ date: String(time), code: Number(values("weather_code")[index] || 0), label: weatherLabel(Number(values("weather_code")[index] || 0)), max: Number(values("temperature_2m_max")[index] || 0), min: Number(values("temperature_2m_min")[index] || 0), rainProbability: Number(values("precipitation_probability_max")[index] || 0), rain: Number(values("rain_sum")[index] || 0), snow: Number(values("snowfall_sum")[index] || 0), uv: Number(values("uv_index_max")[index] || 0) }));
    return json({ region, source: "Open-Meteo", updatedAt: new Date().toISOString(), current: { temperature: Number(current.temperature_2m || 0), apparent: Number(current.apparent_temperature || 0), code: Number(current.weather_code || 0), label: weatherLabel(Number(current.weather_code || 0)), wind: Number(current.wind_speed_10m || 0), precipitation: Number(current.precipitation || 0), isDay: Boolean(current.is_day) }, days: days.map((day, index) => ({ ...day, advice: index === 0 ? weatherAdvice(day) : [] })), advice: days[0] ? weatherAdvice(days[0]) : [] }, 200, true);
  } catch (error) {
    return json({ error: error instanceof Error ? clean(error.message, 120) : "날씨 정보를 불러오지 못했습니다." }, 502);
  }
}

async function handleLocationSearch(request: Request, env: Env) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const key = env.KAKAO_REST_API_KEY?.trim();
  if (!key) return json({ error: "카카오 장소 검색 키가 연결되지 않았습니다." }, 503);
  const url = new URL(request.url);
  const query = clean(url.searchParams.get("q"), 100);
  if (query.length < 2) return json({ error: "두 글자 이상 입력해 주세요." }, 400);
  try {
    const params = new URLSearchParams({ query, size: "10", sort: "accuracy" });
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`, { signal: AbortSignal.timeout(7000), headers: { Authorization: `KakaoAK ${key}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(`장소 검색 응답 ${response.status}`);
    const data = await response.json() as { documents?: Array<Record<string, string>> };
    return json({ places: (data.documents || []).map((item) => ({ id: clean(item.id), name: clean(item.place_name), address: clean(item.road_address_name || item.address_name), category: clean(item.category_group_name || item.category_name), mapX: clean(item.x), mapY: clean(item.y), placeUrl: clean(item.place_url) })) }, 200, true);
  } catch (error) {
    return json({ error: error instanceof Error ? clean(error.message, 120) : "장소를 검색하지 못했습니다." }, 502);
  }
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
  const total = Math.max(unique.length, 1);
  const matchRate = matched.length / total;
  const knownRate = known.length / total;
  const score = Math.max(36, Math.min(98, Math.round(48 + matchRate * 39 + knownRate * 9 + (item.firstimage ? 2 : 0) - index)));
  const confidence = Math.round(knownRate * 100);
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
    unknownFields: total - known.length,
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
  return {
    id: clean(item.contentId || item.contentid || item.contentID || item.facltNm || item.koTitle || item.stdRestCd || item.serviceAreaCode || item.travelId || item.courseId || item.title),
    title: clean(item.title || item.contentTitle || item.facltNm || item.koTitle || item.stdRestNm || item.serviceAreaName || item.travelNm || item.travelName || item.courseNm || item.courseName || item.spotNm || item.tourNm || item.name || "이름 없는 콘텐츠"),
    address: clean(item.addr1 || item.baseAddr || item.address || item.addr || item.svarAddr || item.serviceAreaAddress || item.koFilmst || item.region),
    summary: clean(item.overview || item.intro || item.lineIntro || item.course || item.contents || item.content || item.description || item.themeDetail || item.themeDtl || item.featureNm || item.koKeyword, 260),
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

async function buildEnrichment(request: Request, env: Env) {
  const url = new URL(request.url);
  const requested = clean(url.searchParams.get("region"), 20);
  const region = regionCodes[requested] ? requested : "창원";
  const theme = contentTypes[clean(url.searchParams.get("theme"), 20)] ? clean(url.searchParams.get("theme"), 20) : "nature";
  const locale = languageServices[clean(url.searchParams.get("locale"), 20)] ? clean(url.searchParams.get("locale"), 20) : "ko";
  const language = languageServices[locale === "ko" ? "en" : locale];
  const districts = regionCodes[region].legal;
  const baseLocation = { ...commonParams("10"), arrange: "Q", lDongRegnCd: "48" };
  const [visitorPack, camping, pet, wellness, medical, languageTour, awards, demandPack, waterCourses, waterPlaces, themeRests] = await Promise.all([
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
  ];
  return {
    generatedAt: new Date().toISOString(),
    visitor: { total: visitorTotal, byType: visitorByType, startYmd: visitorPack.startYmd, endYmd: visitorPack.endYmd },
    demand: demandItems.map((item) => ({ name: clean(item.tarSvcDemIxNm), value: Number(item.tarSvcDemIxVal || 0), baseYm: clean(item.baseYm || demandPack.baseYm) })).slice(0, 8),
    camping: spots(camping, "고캠핑"), pet: spots(pet, "반려동물 동반여행"), wellness: spots(wellness, "웰니스 관광"),
    medical: spots(medical, "의료 관광"), language: spots(languageTour, language.source), awards: spots(awards, "관광공모전 수상작"),
    water: [...spots(waterCourses, "낙동강 수변 코스"), ...spots(waterPlaces, "낙동강 수변 명소")].slice(0, 8),
    rests: spots(themeRests, "한국도로공사 테마휴게소"),
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
  const places = baseItems.map((item, index) => placeFrom(item, details[index]?.ok ? details[index].value.items[0] || {} : {}, region, profiles, index));

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
    note: index === 0 ? `${place.features.slice(0, 2).join("·")} 정보를 먼저 확인해요.` : place.summary,
    source: place.source,
  }));
  hubItems.slice(0, Math.max(0, 3 - stops.length)).forEach((item) => stops.push({
    title: clean(item.hubTatsNm),
    note: `${clean(item.signguNm || region)} 중심관광지 ${clean(item.hubRank)}순위로 연결성이 높은 후보입니다.`,
    source: `기초지자체 중심 관광지 · ${hubPack.baseYm}`,
  }));
  if (stops.length < 4 && relatedPack.result.ok) {
    relatedPack.result.value.items.slice(0, 4 - stops.length).forEach((item) => stops.push({
      title: clean(item.rlteTatsNm),
      note: `${clean(item.tAtsNm || firstTitle)}와 함께 찾는 연관 관광지 ${clean(item.rlteRank || "")}순위 후보입니다.`,
      source: `연관 관광지 · ${relatedPack.baseYm}`,
    }));
  }
  if (course && stops.length < 4) stops.push({ title: course.name, note: course.summary, source: "두루누비 걷기 코스" });

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

function json(data: unknown, status = 200, cache = false) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache ? "public, max-age=300, s-maxage=1800" : "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function finiteCoordinate(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function handleRouteApi(request: Request, env: Env) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const url = new URL(request.url);
  const startLng = finiteCoordinate(url.searchParams.get("startLng"), 120, 135);
  const startLat = finiteCoordinate(url.searchParams.get("startLat"), 30, 40);
  const endLng = finiteCoordinate(url.searchParams.get("endLng"), 120, 135);
  const endLat = finiteCoordinate(url.searchParams.get("endLat"), 30, 40);
  if ([startLng, startLat, endLng, endLat].some((value) => value === null)) return json({ error: "출발·도착 좌표를 확인해 주세요." }, 400);
  const straightDistance = haversine(startLat!, startLng!, endLat!, endLng!);
  const transportKey = publicTransportKey(env);
  const korailKey = Boolean(env.KORAIL_API_KEY?.trim() || env.TOUR_API_SERVICE_KEY_ENCODED?.trim());
  const tagoKey = Boolean(env.TAGO_API_KEY?.trim() || env.TOUR_API_SERVICE_KEY_ENCODED?.trim());
  const runYmd = koreaYmd();
  const [korailPlans, nearbyStops, trainCatalog, expressCatalog, intercityCatalog] = transportKey
    ? await Promise.all([
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/B551457/run/v2", "travelerTrainRunPlan2", {
          returnType: "JSON",
          numOfRows: "10",
          "cond[run_ymd::GTE]": runYmd,
          "cond[run_ymd::LTE]": runYmd,
        })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/BusSttnInfoInqireService", "getCrdntPrxmtSttnList", { gpsLati: String(endLat), gpsLong: String(endLng), numOfRows: "8" })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/TrainInfo", "GetCtyCodeList", { numOfRows: "100" })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/ExpBusInfo", "GetExpBusTrminlList", { numOfRows: "100" })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/SuburbsBusInfo", "GetSuberbsBusTrminlList", { numOfRows: "100" })),
      ])
    : [null, null, null, null, null];

  let arrivalItems: KtoItem[] = [];
  if (nearbyStops?.ok && nearbyStops.value.items.length) {
    const stop = nearbyStops.value.items[0];
    const cityCode = clean(stop.citycode || stop.cityCode);
    const nodeId = clean(stop.nodeid || stop.nodeId);
    if (cityCode && nodeId) {
      const arrival = await attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/ArvlInfoInqireService", "getSttnAcctoArvlPrearngeInfoList", { cityCode, nodeId, numOfRows: "8" }));
      if (arrival.ok) arrivalItems = arrival.value.items;
    }
  }
  const providers = [
    transportProvider("kakao-drive", "KAKAO DRIVE", "자동차 시간·거리·통행료", Boolean(env.KAKAO_REST_API_KEY?.trim())),
    transportProvider("odsay", "ODsay", "대중교통 시간·요금·환승", Boolean(env.ODSAY_API_KEY?.trim())),
    transportProvider("korail", "KORAIL", "여객열차 운행계획", korailKey, korailPlans),
    transportProvider("tago-bus", "TAGO BUS", `정류장·도착 ${arrivalItems.length ? `${arrivalItems.length}건` : ""}`.trim(), tagoKey, nearbyStops),
    transportProvider("tago-rail", "TAGO RAIL", "열차·지하철", tagoKey, trainCatalog),
    transportProvider("tago-regional", "TAGO EXPRESS", "고속·시외버스", tagoKey, expressCatalog?.ok ? expressCatalog : intercityCatalog),
    transportProvider("tago-mobility", "TAGO MOVE", "항공·선박·카셰어링·PM", tagoKey),
  ];

  const alternatives: Array<Record<string, unknown>> = [];
  if (env.ODSAY_API_KEY?.trim()) {
    try {
      const params = new URLSearchParams({ apiKey: env.ODSAY_API_KEY.trim(), output: "json", lang: "0", SX: String(startLng), SY: String(startLat), EX: String(endLng), EY: String(endLat), OPT: "0" });
      const response = await fetch(`https://api.odsay.com/v1/api/searchPubTransPathT?${params.toString()}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
      if (response.ok) {
        const body = await response.json() as Record<string, unknown>;
        const result = body.result as Record<string, unknown> | undefined;
        const rawPaths = Array.isArray(result?.path) ? result.path as Array<Record<string, unknown>> : [];
        rawPaths.slice(0, 4).forEach((path, index) => {
    const info = (path.info || {}) as Record<string, unknown>;
    const rawSegments = Array.isArray(path.subPath) ? path.subPath as Array<Record<string, unknown>> : [];
    const geometry: Array<{ lat: number; lng: number }> = [{ lat: startLat!, lng: startLng! }];
    const segments = rawSegments.map((segment) => {
      const traffic = Number(segment.trafficType || 3);
      const lane = Array.isArray(segment.lane) ? segment.lane[0] as Record<string, unknown> | undefined : undefined;
      const sLat = Number(segment.startY); const sLng = Number(segment.startX);
      const eLat = Number(segment.endY); const eLng = Number(segment.endX);
      if (Number.isFinite(sLat) && Number.isFinite(sLng)) geometry.push({ lat: sLat, lng: sLng });
      if (Number.isFinite(eLat) && Number.isFinite(eLng)) geometry.push({ lat: eLat, lng: eLng });
      return {
        type: traffic === 1 ? "subway" : traffic === 2 ? "bus" : traffic >= 4 ? "intercity" : "walk",
        name: clean(lane?.busNo || lane?.name || segment.startName || (traffic === 3 ? "도보" : "대중교통"), 60),
        minutes: Number(segment.sectionTime || 0),
      };
    });
    geometry.push({ lat: endLat!, lng: endLng! });
    alternatives.push({
      id: `odsay-${index + 1}`, label: index === 0 ? "대중교통 추천" : `대중교통 ${index + 1}안`, provider: "ODsay", mode: "transit",
      totalTime: Number(info.totalTime || 0), payment: Number.isFinite(Number(info.payment)) ? Number(info.payment) : null,
      totalWalk: Number(info.totalWalk || 0), transfers: Number(info.busTransitCount || 0) + Number(info.subwayTransitCount || 0),
      totalDistance: Number(info.totalDistance || info.trafficDistance || straightDistance), configured: true, segments, geometry,
    });
        });
      }
    } catch { /* another provider or preview remains available */ }
  }

  if (env.KAKAO_REST_API_KEY?.trim()) {
    const kakaoProvider = providers.find((provider) => provider.id === "kakao-drive");
    try {
      const query = new URLSearchParams({
        origin: `${startLng},${startLat}`,
        destination: `${endLng},${endLat}`,
        priority: "RECOMMEND",
        alternatives: "false",
        road_details: "false",
      });
      const response = await fetch(`https://apis-navi.kakaomobility.com/v1/directions?${query.toString()}`, {
        headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY.trim()}`, Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });
      if (response.ok) {
        const body = await response.json() as Record<string, unknown>;
        const routes = Array.isArray(body.routes) ? body.routes as Array<Record<string, unknown>> : [];
        const route = routes[0];
        if (route) {
          const summary = (route.summary || {}) as Record<string, unknown>;
          const fare = (summary.fare || {}) as Record<string, unknown>;
          const sections = Array.isArray(route.sections) ? route.sections as Array<Record<string, unknown>> : [];
          const geometry: Array<{ lat: number; lng: number }> = [{ lat: startLat!, lng: startLng! }];
          sections.forEach((section) => {
            const roads = Array.isArray(section.roads) ? section.roads as Array<Record<string, unknown>> : [];
            roads.forEach((road) => {
              const vertices = Array.isArray(road.vertexes) ? road.vertexes.map(Number) : [];
              for (let i = 0; i + 1 < vertices.length; i += 2) {
                if (Number.isFinite(vertices[i]) && Number.isFinite(vertices[i + 1])) geometry.push({ lng: vertices[i], lat: vertices[i + 1] });
              }
            });
          });
          geometry.push({ lat: endLat!, lng: endLng! });
          const durationSeconds = Number(summary.duration || 0);
          const toll = Number(fare.toll || 0);
          alternatives.push({
            id: "kakao-car", label: "카카오 자동차 추천", provider: "Kakao Mobility", mode: "car",
            totalTime: Math.max(1, Math.round(durationSeconds / 60)), payment: Number.isFinite(toll) ? toll : null,
            totalWalk: 0, transfers: 0, totalDistance: Math.round(Number(summary.distance || straightDistance)), configured: true,
            segments: [{ type: "car", name: "추천 자동차 경로", minutes: Math.max(1, Math.round(durationSeconds / 60)) }], geometry,
          });
          if (kakaoProvider) {
            kakaoProvider.state = "connected";
            kakaoProvider.detail = "카카오모빌리티 자동차 경로 응답을 확인했습니다.";
          }
        }
      } else if (kakaoProvider) {
        kakaoProvider.state = "error";
        kakaoProvider.detail = `카카오모빌리티 응답 ${response.status}`;
      }
    } catch {
      if (kakaoProvider) {
        kakaoProvider.state = "error";
        kakaoProvider.detail = "카카오모빌리티 경로 요청을 완료하지 못했습니다.";
      }
    }
  }

  if (!alternatives.length) alternatives.push({
    id: "preview", label: "직선 연결 미리보기", provider: "W.A.V.E", mode: "preview", totalTime: Math.max(1, Math.round(straightDistance / 450)),
    payment: null, totalWalk: 0, transfers: 0, totalDistance: Math.round(straightDistance), configured: false,
    segments: [{ type: "intercity", name: "교통 API 연결 대기", minutes: Math.max(1, Math.round(straightDistance / 450)) }],
    geometry: [{ lat: startLat, lng: startLng }, { lat: endLat, lng: endLng }],
  });
  const context = {
    nearbyStops: nearbyStops?.ok ? nearbyStops.value.items.slice(0, 6).map((item) => ({
      id: clean(item.nodeid || item.nodeId),
      name: clean(item.nodenm || item.nodeNm || item.sttnNm || "인근 정류장"),
      cityCode: clean(item.citycode || item.cityCode),
    })) : [],
    arrivals: arrivalItems.slice(0, 6).map((item) => ({
      route: clean(item.routeno || item.routeNo || item.routenm || item.routeNm || "버스"),
      minutes: Number(item.arrtime || item.arrTime) > 0 ? Math.max(1, Math.round(Number(item.arrtime || item.arrTime) / 60)) : null,
      stops: Number(item.arrprevstationcnt || item.arrPrevStationCnt || 0),
    })),
    korail: korailPlans?.ok ? korailPlans.value.items.slice(0, 6).map((item) => ({
      trainNo: clean(item.trn_no || item.trnNo || item.trainNo || item.trainno || "열차"),
      departure: clean(item.dptre_stn_nm || item.dptreStnNm || item.depPlaceNm || item.depplacename || item.stdepplacename),
      arrival: clean(item.arvl_stn_nm || item.arvlStnNm || item.arrPlaceNm || item.arrplacename || item.starrplacename),
      departureTime: clean(item.trn_plan_dptre_dt || item.trnPlanDptreDt || item.depplandtime || item.depPlandTime),
    })) : [],
    catalog: {
      trainCities: trainCatalog?.ok ? trainCatalog.value.total : 0,
      expressTerminals: expressCatalog?.ok ? expressCatalog.value.total : 0,
      intercityTerminals: intercityCatalog?.ok ? intercityCatalog.value.total : 0,
    },
    datasets: [
      { id: "bus-stop", name: "버스정류소", state: nearbyStops?.ok ? (nearbyStops.value.items.length ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "bus-route", name: "버스노선", state: tagoKey ? "ready" : "missing" },
      { id: "bus-location", name: "버스위치", state: tagoKey ? "ready" : "missing" },
      { id: "bus-arrival", name: "버스도착", state: arrivalItems.length ? "live" : tagoKey ? "ready" : "missing" },
      { id: "subway", name: "지하철", state: tagoKey ? "ready" : "missing" },
      { id: "express-arrival", name: "고속버스도착", state: tagoKey ? "ready" : "missing" },
      { id: "train", name: "열차", state: trainCatalog?.ok ? (trainCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "express", name: "고속버스", state: expressCatalog?.ok ? (expressCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "intercity", name: "시외버스", state: intercityCatalog?.ok ? (intercityCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "air", name: "국내항공", state: tagoKey ? "ready" : "missing" },
      { id: "ship", name: "국내선박", state: tagoKey ? "ready" : "missing" },
      { id: "carshare", name: "카셰어링", state: tagoKey ? "ready" : "missing" },
      { id: "pm", name: "공유PM", state: tagoKey ? "ready" : "missing" },
      { id: "korail-plan", name: "KORAIL 운행계획", state: korailPlans?.ok ? (korailPlans.value.total ? "live" : "ready") : korailKey ? "error" : "missing" },
    ],
  };
  const hasRealRoute = alternatives.some((item) => item.configured);
  const hasTransportKey = providers.some((item) => item.configured);
  const hasTransportData = providers.some((item) => item.state === "connected" || item.state === "ready");
  return json({
    configured: hasRealRoute,
    alternatives,
    providers,
    context,
    message: hasRealRoute
      ? "연결된 교통 API의 경로를 비교합니다."
      : hasTransportData
        ? "KORAIL·TAGO 데이터가 연결되었습니다. 전체 경로는 ODsay 연결 전까지 미리보기로 표시합니다."
        : hasTransportKey
          ? "교통 인증키는 연결되어 있으며 제공기관 요청조건을 확인하고 있습니다."
          : "교통 API 키를 등록하면 실제 시간·요금·환승 정보로 전환됩니다.",
  }, 200, true);
}

function handleMapConfig(env: Env) {
  return json({ provider: env.KAKAO_MAP_JAVASCRIPT_KEY?.trim() ? "kakao" : "osm", javascriptKey: env.KAKAO_MAP_JAVASCRIPT_KEY?.trim() || "" });
}

function handleHealthApi(env: Env) {
  const publicData = Boolean(publicTransportKey(env));
  return json({
    checkedAt: new Date().toISOString(),
    keys: [
      { id: "tour", name: "관광·공공데이터포털", state: env.TOUR_API_SERVICE_KEY_ENCODED?.trim() ? "configured" : "missing", optional: false, note: "관광 API와 승인된 KORAIL·TAGO API가 함께 사용하는 공공데이터포털 인증키" },
      { id: "kakao-map", name: "Kakao Map", state: env.KAKAO_MAP_JAVASCRIPT_KEY?.trim() ? "configured" : "missing", optional: false, note: "지도 표시용 JavaScript 키" },
      { id: "kakao-route", name: "Kakao Mobility", state: env.KAKAO_REST_API_KEY?.trim() ? "configured" : "missing", optional: false, note: "자동차 경로·시간·거리·통행료 조회" },
      { id: "public-transport", name: "KORAIL·TAGO", state: publicData ? "configured" : "missing", optional: false, note: "별도 키가 아니라 승인된 API에 공공데이터포털 인증키를 사용" },
      { id: "odsay", name: "ODsay", state: env.ODSAY_API_KEY?.trim() ? "configured" : "optional", optional: true, note: "문 앞까지 대중교통 통합 경로가 필요할 때만 추가" },
      { id: "expressway", name: "테마휴게소", state: env.EXPRESSWAY_API_KEY?.trim() ? "configured" : "optional", optional: true, note: "한국도로공사 별도 포털 키가 있을 때 활성화" },
    ],
  });
}

async function ensureDb(env: Env) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS itineraries (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS itineraries_expires_idx ON itineraries (expires_at)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS place_feedback (id TEXT PRIMARY KEY, place_id TEXT NOT NULL, place_name TEXT NOT NULL, field TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'received', created_at INTEGER NOT NULL)"),
  ]);
}

async function handleTripsApi(request: Request, env: Env) {
  await ensureDb(env);
  const url = new URL(request.url);
  const id = clean(url.pathname.split("/").filter(Boolean)[2], 64);
  if (request.method === "GET") {
    if (!id) return json({ error: "공유 여행 ID가 필요합니다." }, 400);
    if (!env.DB) {
      const row = portableTrips.get(id);
      if (!row || row.expiresAt <= Date.now()) {
        portableTrips.delete(id);
        return json({ error: "공유 여행을 찾을 수 없거나 보관 기간이 지났습니다." }, 404);
      }
      return json({ id, ...JSON.parse(row.payload), createdAt: row.createdAt, expiresAt: row.expiresAt }, 200, true);
    }
    const row = await env.DB.prepare("SELECT payload, created_at, expires_at FROM itineraries WHERE id = ? AND expires_at > ?").bind(id, Date.now()).first<{ payload: string; created_at: number; expires_at: number }>();
    if (!row) return json({ error: "공유 여행을 찾을 수 없거나 보관 기간이 지났습니다." }, 404);
    return json({ id, ...JSON.parse(row.payload), createdAt: row.created_at, expiresAt: row.expires_at }, 200, true);
  }
  if (request.method !== "POST") return json({ error: "지원하지 않는 요청입니다." }, 405);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.plan !== "object" || !body.plan) return json({ error: "저장할 여행 계획이 필요합니다." }, 400);
  const payload = JSON.stringify({ plan: body.plan, selections: body.selections || {}, origin: body.origin || null });
  if (payload.length > 65000) return json({ error: "여행 계획이 너무 큽니다." }, 413);
  const newId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const now = Date.now();
  const expiresAt = now + 1000 * 60 * 60 * 24 * 30;
  if (env.DB) {
    await env.DB.prepare("INSERT INTO itineraries (id, payload, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(newId, payload, now, expiresAt).run();
  } else {
    portableTrips.set(newId, { payload, createdAt: now, expiresAt });
  }
  return json({ id: newId, url: `${url.origin}/trip/${newId}`, expiresAt }, 201);
}

async function handleFeedbackApi(request: Request, env: Env) {
  if (request.method !== "POST") return json({ error: "POST 요청만 지원합니다." }, 405);
  await ensureDb(env);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const placeId = clean(body?.placeId, 80); const placeName = clean(body?.placeName, 100);
  const field = clean(body?.field || "접근성 정보", 60); const message = clean(body?.message, 800);
  if (!placeId || !placeName || message.length < 5) return json({ error: "장소와 5자 이상의 제보 내용을 입력해 주세요." }, 400);
  const id = crypto.randomUUID();
  if (env.DB) {
    await env.DB.prepare("INSERT INTO place_feedback (id, place_id, place_name, field, message, status, created_at) VALUES (?, ?, ?, ?, ?, 'received', ?)").bind(id, placeId, placeName, field, message, Date.now()).run();
  } else {
    portableFeedback.push({ id, placeId, placeName, field, message, status: "received", createdAt: Date.now() });
  }
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
    if (!title) return json({ error: "사진을 찾을 장소명이 필요합니다." }, 400);
    return json(await fetchSpotPhoto(env, region, title), 200, true);
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
  if (url.pathname === "/api/feedback") return handleFeedbackApi(request, env);
  return json({ error: "지원하지 않는 API 경로입니다." }, 404);
}

const worker = {
  async fetch(request: Request, env: Env | undefined, ctx: ExecutionContext): Promise<Response> {
    const runtimeEnv = env ?? portableEnv();
    const url = new URL(request.url);

    if (url.pathname === "/api/wave") return handleWaveApi(request, runtimeEnv);
    if (url.pathname === "/api/weather") return handleWeatherApi(request);
    if (url.pathname === "/api/location-search") return handleLocationSearch(request, runtimeEnv);
    if (url.pathname === "/api/route") return handleRouteApi(request, runtimeEnv);
    if (url.pathname === "/api/map-config") return handleMapConfig(runtimeEnv);
    if (url.pathname === "/api/health") return handleHealthApi(runtimeEnv);
    if (url.pathname === "/api/trips" || url.pathname.startsWith("/api/trips/")) return handleTripsApi(request, runtimeEnv);
    if (url.pathname === "/api/feedback") return handleFeedbackApi(request, runtimeEnv);

    if (url.pathname === "/_vinext/image" && runtimeEnv.ASSETS && runtimeEnv.IMAGES) {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => runtimeEnv.ASSETS!.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await runtimeEnv.IMAGES!.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, runtimeEnv, ctx);
  },
};

export default worker;
