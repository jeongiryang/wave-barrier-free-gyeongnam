import { clean } from "../shared/http";
import { resolveFacilityKeys } from "../../lib/facility-selection.js";
import { normalizeThemes } from "../../lib/planner-criteria.js";
import { commonParams } from "../shared/provider-data";
import { contentTypes, languageServices, multilingualContentTypes, regionCodes } from "./catalog";

export function readPlanQuery(request: Request) {
  const url = new URL(request.url);
  const requestedRegion = clean(url.searchParams.get("region"), 20);
  const region = regionCodes[requestedRegion] ? requestedRegion : "창원";
  const themes = normalizeThemes(clean(url.searchParams.get("themes") || url.searchParams.get("theme"), 100));
  const theme = themes[0];
  const requestedLocale = clean(url.searchParams.get("locale"), 20);
  const locale = languageServices[requestedLocale] ? requestedLocale : "ko";
  const language = languageServices[locale];
  const profiles = resolveFacilityKeys(url.searchParams.has("facilityKeys")
    ? { facilityKeys: clean(url.searchParams.get("facilityKeys"), 500) }
    : { profiles: clean(url.searchParams.get("profiles"), 500) });
  const pageSlots = Math.max(1, regionCodes[region].legal.length) * themes.length * 2;
  const page = Math.max(1, Math.min(pageSlots * 5, Math.floor(Number(url.searchParams.get("page")) || 1)));
  const providerPage = Math.floor((page - 1) / pageSlots) + 1;
  const pageOffset = (page - 1) % pageSlots * 12;
  const baseLocationParams = { ...commonParams("12"), pageNo: String(providerPage), arrange: "Q", lDongRegnCd: "48" };
  const barrierLocationParams = { ...baseLocationParams, contentTypeId: contentTypes[theme] };
  const localizedLocationParams = {
    ...baseLocationParams,
    contentTypeId: locale === "ko" ? contentTypes[theme] : multilingualContentTypes[theme],
  };
  return { region, theme, themes, page, pageSlots, providerPage, pageOffset, locale, language, profiles, districts: regionCodes[region].legal, barrierLocationParams, localizedLocationParams };
}
