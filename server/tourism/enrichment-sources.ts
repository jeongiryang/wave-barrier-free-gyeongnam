import type { Env } from "../shared/env";
import {
  attemptProvider as attempt,
  commonParams,
  fetchRegionalList,
  fetchTourismData as fetchKto,
} from "../shared/provider-data";
import { contentTypes, languageServices, regionCodes } from "./catalog";
import { fetchThemeRests } from "./expressway-rests";
import {
  fetchCamping,
  fetchRegionalEvents,
  fetchRegionalLodging,
  provinceFallback,
} from "./regional-enrichment";
import { fetchDemandInsight, fetchVisitorInsight } from "./visitor-demand";
import { fetchWaterTravel } from "./water-travel";

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
