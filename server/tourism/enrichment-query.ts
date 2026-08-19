import { clean } from "../shared/http";
import { contentTypes, languageServices, regionCodes } from "./catalog";
import { safeYmd, todayYmd } from "./date-utils";

export function readEnrichmentQuery(request: Request) {
  const url = new URL(request.url);
  const requested = clean(url.searchParams.get("region"), 20);
  const region = regionCodes[requested] ? requested : "창원";
  const requestedTheme = clean(url.searchParams.get("theme"), 20);
  const theme = contentTypes[requestedTheme] ? requestedTheme : "nature";
  const requestedLocale = clean(url.searchParams.get("locale"), 20);
  const locale = languageServices[requestedLocale] ? requestedLocale : "ko";
  const eventStartDate = safeYmd(url.searchParams.get("startDate"), todayYmd());
  const eventEndDate = safeYmd(url.searchParams.get("endDate"), eventStartDate);
  return { region, theme, locale, eventStartDate, eventEndDate };
}
