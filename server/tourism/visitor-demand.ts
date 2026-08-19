import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import {
  attemptProvider as attempt,
  commonParams,
  fetchTourismData as fetchKto,
  type ProviderAttempt as Attempt,
} from "../shared/provider-data";
import { regionCodes } from "./catalog";
import { previousMonth } from "./date-utils";

function ymd(daysAgo: number) {
  const date = new Date(Date.now() - daysAgo * 86400000);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

export async function fetchVisitorInsight(env: Env, region: string) {
  let last: Attempt = { ok: true, value: { items: [], total: 0 } };
  for (const offset of [7, 30, 60, 90, 150]) {
    const result = await attempt(fetchKto(env, "DataLabService", "locgoRegnVisitrDDList", {
      ...commonParams("1000"), MobileOS: "ETC", startYmd: ymd(offset + 6), endYmd: ymd(offset),
    }));
    last = result;
    if (result.ok && result.value.items.length) {
      const items = result.value.items.filter((item) => {
        const name = clean(item.signguNm);
        const code = clean(item.signguCode || item.signguCd);
        return region === "경남 전체" ? code.startsWith("48") : name.includes(region) || regionCodes[region]?.full.includes(code);
      });
      if (items.length) return { result: { ok: true, value: { items, total: items.length } } as Attempt, startYmd: ymd(offset + 6), endYmd: ymd(offset) };
    }
  }
  return { result: last, startYmd: "", endYmd: "" };
}

export async function fetchDemandInsight(env: Env, region: string) {
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
