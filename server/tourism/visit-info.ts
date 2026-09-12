import type { Env } from "../shared/env";
import type { VisitInfo } from "../../lib/visit-hours.js";
import { clean, json } from "../shared/http";
import { attemptProvider, commonParams, fetchTourismData } from "../shared/provider-data";
import { supportedPlacePoint } from "../../lib/map-coordinates.js";
import { SERVER_BUDGET_MS, budgetClock, withinBudget } from "../../lib/request-budget.js";
import { indoorEvidence } from "../../lib/indoor-evidence.js";

const fields: Record<string, { hours?: string; rest?: string; fees?: string; phone: string }> = {
  "12": { hours: "usetime", rest: "restdate", phone: "infocenter" },
  "14": { hours: "usetimeculture", rest: "restdateculture", fees: "usefee", phone: "infocenterculture" },
  "15": { hours: "playtime", fees: "usetimefestival", phone: "sponsor1tel" },
  "25": { phone: "infocentertourcourse" },
  "28": { hours: "usetimeleports", rest: "restdateleports", fees: "usefeeleports", phone: "infocenterleports" },
  "32": { phone: "infocenterlodging" },
  "38": { hours: "opentime", rest: "restdateshopping", phone: "infocentershopping" },
  "39": { hours: "opentimefood", rest: "restdatefood", phone: "infocenterfood" },
};

// The client supplies one public ID, never a provider type, location or itinerary.
export async function handleVisitInfo(url: URL, env: Env, parentSignal?: AbortSignal) {
  const id = url.searchParams.get("contentId") || "";
  if (!/^[1-9]\d{0,11}$/.test(id)) return json({ status: "invalid-id" }, 400);
  const deadline = AbortSignal.any([AbortSignal.timeout(SERVER_BUDGET_MS.visitInfo), ...(parentSignal ? [parentSignal] : [])]);
  const remaining = budgetClock(SERVER_BUDGET_MS.visitInfo);
  const lookup = (operation: string, params: Record<string, string>) => withinBudget(
    attemptProvider(fetchTourismData(env, "KorService2", operation, params, deadline)), remaining(),
    () => ({ ok: false as const, error: "Visit information timed out" }),
  );
  const common = await lookup("detailCommon2", { ...commonParams("1"), contentId: id });
  if (!common.ok || common.value.partial) return json({ id, status: "provider-error" }, 502);
  const base = { id, checkedAt: new Date().toISOString(), source: "ⓒ한국관광공사" };
  if (!common.value.items.length) return json({ ...base, status: "empty" });
  const place = common.value.items.find(item => String(item.contentid) === id);
  if (!place) return json({ id, status: "invalid-response" }, 502);
  // KorService2 replaces the deprecated areacode with the legal province code.
  if (String(place.lDongRegnCd) !== "48" || !supportedPlacePoint(place.mapx, place.mapy)) return json({ ...base, status: "location-unconfirmed" });
  const contentTypeId = String(place.contenttypeid || "");
  const mapping = fields[contentTypeId];
  if (!mapping) return json({ ...base, status: "unsupported" });
  const intro = await lookup("detailIntro2", { ...commonParams("1"), contentId: id, contentTypeId });
  if (!intro.ok || intro.value.partial) return json({ id, status: "provider-error" }, 502);
  if (!intro.value.items.length) return json({ ...base, setting: indoorEvidence(place.overview), status: "empty" });
  const item = intro.value.items.find(value => String(value.contentid) === id && String(value.contenttypeid) === contentTypeId);
  if (!item) return json({ id, status: "invalid-response" }, 502);
  const read = (key?: string) => key ? clean(item[key], 1200) : "";
  const info: VisitInfo = {
    ...base, checkedAt: new Date().toISOString(), status: "available",
    setting: indoorEvidence(place.overview),
    hours: read(mapping.hours), restDays: read(mapping.rest), fees: read(mapping.fees),
    phone: clean(item[mapping.phone] || place.tel, 160),
    eventStart: contentTypeId === "15" ? read("eventstartdate") : "",
    eventEnd: contentTypeId === "15" ? read("eventenddate") : "",
    checkIn: contentTypeId === "32" ? read("checkintime") : "",
    checkOut: contentTypeId === "32" ? read("checkouttime") : "",
  };
  // Published data only; failed responses and unchecked locations are not cached.
  return json(info, 200, true);
}
