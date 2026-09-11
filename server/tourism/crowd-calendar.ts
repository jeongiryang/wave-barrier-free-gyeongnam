import type { Env } from "../shared/env";
import { clean, json } from "../shared/http";
import { attemptProvider, commonParams, fetchTourismData } from "../shared/provider-data";
import { supportedPlacePoint } from "../../lib/map-coordinates.js";
import { SERVER_BUDGET_MS, budgetClock, withinBudget } from "../../lib/request-budget.js";
import { crowdCalendar } from "../../lib/tourism/crowd-calendar.js";
import { regionCodes } from "./catalog";
import { todayYmd } from "./date-utils";

// Resolve the attraction and district from the official public ID. The client
// cannot supply another province, a guessed name, location or private itinerary.
export async function handleCrowdCalendar(url: URL, env: Env) {
  const id = url.searchParams.get("contentId") || "";
  if (!/^[1-9]\d{0,11}$/.test(id)) return json({ status: "invalid-id" }, 400);
  const signal = AbortSignal.timeout(SERVER_BUDGET_MS.visitInfo);
  const remaining = budgetClock(SERVER_BUDGET_MS.visitInfo);
  const lookup = (service: string, operation: string, params: Record<string, string>) => withinBudget(
    attemptProvider(fetchTourismData(env, service, operation, params, signal)), remaining(),
    () => ({ ok: false as const, error: "Forecast information timed out" }),
  );
  const common = await lookup("KorService2", "detailCommon2", { ...commonParams("1"), contentId: id });
  if (!common.ok || common.value.partial) return json({ id, status: "provider-error" }, 502);
  const base = { id, title: "", checkedAt: new Date().toISOString(), source: "ⓒ한국관광공사 · KT 관광 집중률 예측", days: [] };
  if (!common.value.items.length) return json({ ...base, status: "empty" });
  const place = common.value.items.find(item => String(item.contentid) === id);
  if (!place) return json({ id, status: "invalid-response" }, 502);
  const province = String(place.lDongRegnCd), legalCity = String(place.lDongSignguCd || "");
  const city = /^\d{3}$/.test(legalCity) ? `48${legalCity}` : legalCity;
  const knownCity = Object.values(regionCodes).some(region => region.full.includes(city));
  const title = clean(place.title, 100);
  if (province !== "48" || !knownCity || !supportedPlacePoint(place.mapx, place.mapy) || !title) return json({ ...base, status: "location-unconfirmed" });
  const forecast = await lookup("TatsCnctrRateService", "tatsCnctrRatedList", {
    ...commonParams("100"), areaCd: "48", signguCd: city, tAtsNm: title,
  });
  if (!forecast.ok || forecast.value.partial) return json({ id, status: "provider-error" }, 502);
  const ymd = todayYmd(), today = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  const exactRegion = forecast.value.items.filter(item => String(item.areaCd) === "48" && String(item.signguCd) === city);
  const days = crowdCalendar(exactRegion, title, today);
  return json({ ...base, title, checkedAt: new Date().toISOString(), days, status: days.length ? "available" : "empty" }, 200, days.length > 0);
}
