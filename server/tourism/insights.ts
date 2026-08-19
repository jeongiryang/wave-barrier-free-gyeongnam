import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import {
  attemptProvider as attempt,
  commonParams,
  fetchRegionalList,
  fetchTourismData as fetchKto,
  normalizeExpresswayItems,
  normalizeItems,
  normalizeXmlItems,
  type ProviderAttempt as Attempt,
} from "../shared/provider-data";
import { contentTypes, languageServices, regionCodes } from "./catalog";
import { apiStatus, richSpot } from "./models";

function previousMonth(offset = 2) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - offset);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
export async function fetchHub(env: Env, region: string) {
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


export async function fetchRelated(env: Env, region: string, preferredYm = "") {
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

export async function fetchCrowd(env: Env, region: string, title: string) {
  const code = regionCodes[region]?.full?.[0] || regionCodes["창원"].full[0];
  return attempt(fetchKto(env, "TatsCnctrRateService", "tatsCnctrRatedList", {
    ...commonParams("10"), areaCd: "48", signguCd: code, ...(title ? { tAtsNm: title } : {}),
  }));
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

export async function buildEnrichment(request: Request, env: Env) {
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
