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
import { fetchDemandInsight, fetchVisitorInsight } from "./visitor-demand";

async function fetchWaterTravel(env: Env, searchTypeCd: "01" | "02") {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!key) return { ok: false, error: "서버 인증키가 등록되지 않았습니다." } as Attempt;
  const params = new URLSearchParams({ pageNo: "1", numOfRows: "8", searchTypeCd });
  try {
    const response = await fetch(`https://apis.data.go.kr/B500001/myportal/travel/travellist?serviceKey=${key}&${params.toString()}`, { signal: AbortSignal.timeout(9500), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`물과 여행 응답 ${response.status}`);
    const raw = await response.text();
    const trimmed = raw.trim();
    return { ok: true, value: trimmed.startsWith("<") ? normalizeXmlItems(trimmed) : normalizeItems(JSON.parse(trimmed)) } as Attempt;
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
    return region === "경남 전체" ? /경상남도|경남/.test(address) : address.includes(region);
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

export async function fetchEnrichmentSources(env: Env, region: string, theme: string, locale: string, eventStartDate: string, eventEndDate: string) {
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
  return { language, visitorPack, camping, pet, wellness, medical, languageTour, awards, demandPack, waterCourses, waterPlaces, themeRests, events, lodging };
}
