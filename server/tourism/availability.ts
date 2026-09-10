import type { Env } from "../shared/env";
import { clean, json } from "../shared/http";
import { attemptProvider, commonParams, fetchRegionalList, fetchTourismData, type ProviderAttempt } from "../shared/provider-data";
import { contentTypes, profileFields } from "./catalog";
import { readPlanQuery } from "./plan-query";
import { placeFrom } from "./accessibility-model";
import { mergePlaces } from "./provider-model";
import { mergeThemeResults } from "../../lib/planner-criteria.js";
import { budgetClock, eachWithinBudget, PLAN_TOTAL_BUDGET_MS } from "../../lib/request-budget.js";

/** The same bounded candidate search as the planner, without photos, audio or transport calls. */
export async function handleAvailability(request: Request, env: Env) {
  const { region, themes, districts, barrierLocationParams } = readPlanQuery(request);
  const remaining = budgetClock(PLAN_TOTAL_BUDGET_MS);
  const overBudget = (): ProviderAttempt => ({ ok: false, error: "조회 시간이 초과됐습니다." });
  const lists = await eachWithinBudget(["KorWithService2", "KorService2"].flatMap(service => themes.map(theme =>
    fetchRegionalList(env, service, "areaBasedList2", { ...barrierLocationParams, contentTypeId: contentTypes[theme] }, districts),
  )), Math.min(6_000, remaining()), overBudget);
  const group = (attempts: ProviderAttempt[]) => mergeThemeResults(attempts.map(result => result.ok ? result.value.items : []));
  const items = mergePlaces(group(lists.slice(0, themes.length)), group(lists.slice(themes.length))).slice(0, 12);
  const details = await eachWithinBudget(items.map(item => attemptProvider(fetchTourismData(env, "KorWithService2", "detailWithTour2", {
    ...commonParams("1"), contentId: clean(item.contentid),
  }))), remaining(), overBudget);
  const partial = [...lists, ...details].some(result => !result.ok || result.value.partial);
  if (!lists.some(result => result.ok)) return json({ error: "검색 결과를 확인하지 못했습니다." }, 502);
  const candidates = items.map((item, index) => {
    const detail = details[index];
    const place = placeFrom(item, detail?.ok ? detail.value.items[0] || {} : {}, region, Object.keys(profileFields), index);
    const confirmed = new Set(place.accessibility.filter(field => field.state === "confirmed").map(field => field.key));
    return { id: place.id, profiles: Object.entries(profileFields).filter(([, fields]) => fields.some(([key]) => confirmed.has(key))).map(([id]) => id) };
  });
  return json({ region, themes, candidates, limit: 12, status: { state: candidates.length ? "live" : "empty", partial } }, 200, true);
}
