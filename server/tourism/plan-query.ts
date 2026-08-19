import { clean } from "../shared/http";
import { commonParams } from "../shared/provider-data";
import { contentTypes, languageServices, profileFields, regionCodes } from "./catalog";

export function readPlanQuery(request: Request) {
  const url = new URL(request.url);
  const requestedRegion = clean(url.searchParams.get("region"), 20);
  const region = regionCodes[requestedRegion] ? requestedRegion : "창원";
  const requestedTheme = clean(url.searchParams.get("theme"), 20);
  const theme = contentTypes[requestedTheme] ? requestedTheme : "nature";
  const requestedLocale = clean(url.searchParams.get("locale"), 20);
  const locale = languageServices[requestedLocale] ? requestedLocale : "ko";
  const language = languageServices[locale];
  const profiles = clean(url.searchParams.get("profiles"), 100).split(",").filter((item) => profileFields[item]).slice(0, 6);
  const locationParams = { ...commonParams("12"), arrange: "Q", contentTypeId: contentTypes[theme], lDongRegnCd: "48" };
  return { region, theme, locale, language, profiles, districts: regionCodes[region].legal, locationParams };
}
