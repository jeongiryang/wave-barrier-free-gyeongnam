import { clean } from "../shared/http";
import { normalizeThemes } from "../../lib/planner-criteria.js";
import { commonParams } from "../shared/provider-data";
import { contentTypes, languageServices, multilingualContentTypes, profileFields, regionCodes } from "./catalog";

export function readPlanQuery(request: Request) {
  const url = new URL(request.url);
  const requestedRegion = clean(url.searchParams.get("region"), 20);
  const region = regionCodes[requestedRegion] ? requestedRegion : "창원";
  const themes = normalizeThemes(clean(url.searchParams.get("themes") || url.searchParams.get("theme"), 100));
  const theme = themes[0];
  const requestedLocale = clean(url.searchParams.get("locale"), 20);
  const locale = languageServices[requestedLocale] ? requestedLocale : "ko";
  const language = languageServices[locale];
  const profiles = clean(url.searchParams.get("profiles"), 100).split(",").filter((item) => profileFields[item]).slice(0, 6);
  const baseLocationParams = { ...commonParams("12"), arrange: "Q", lDongRegnCd: "48" };
  const barrierLocationParams = { ...baseLocationParams, contentTypeId: contentTypes[theme] };
  const localizedLocationParams = {
    ...baseLocationParams,
    contentTypeId: locale === "ko" ? contentTypes[theme] : multilingualContentTypes[theme],
  };
  return { region, theme, themes, locale, language, profiles, districts: regionCodes[region].legal, barrierLocationParams, localizedLocationParams };
}
