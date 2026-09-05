import type { Env } from "../shared/env";
import {
  attemptProvider as attempt,
  commonParams,
  fetchTourismData as fetchKto,
  type ProviderAttempt as Attempt,
} from "../shared/provider-data";
import { regionCodes } from "./catalog";
import { previousMonth } from "./date-utils";

export async function fetchHub(env: Env, region: string, remaining: () => number = () => Infinity) {
  const codes = regionCodes[region]?.full?.length ? regionCodes[region].full : regionCodes["창원"].full;
  let last: Attempt = { ok: true, value: { items: [], total: 0 } };
  for (let offset = 2; offset <= 14; offset += 1) {
    if (remaining() <= 0) break;
    const baseYm = previousMonth(offset);
    const results = await Promise.all(codes.map((code) => attempt(fetchKto(env, "LocgoHubTarService1", "areaBasedList1", {
      ...commonParams("6"), baseYm, areaCd: "48", signguCd: code,
    }))));
    const available = results.filter((result): result is Extract<Attempt, { ok: true }> => result.ok);
    if (available.length) {
      const items = available.flatMap((result) => result.value.items);
      last = { ok: true, value: { items, total: items.length } };
      if (items.length) return { result: last, baseYm };
    } else if (results[0]) last = results[0];
  }
  return { result: last, baseYm: "" };
}

export async function fetchRelated(env: Env, region: string, preferredYm = "", remaining: () => number = () => Infinity) {
  const codes = regionCodes[region]?.full?.length ? regionCodes[region].full : regionCodes["창원"].full;
  const months = [...new Set([preferredYm, ...Array.from({ length: 12 }, (_, index) => previousMonth(index + 2))].filter(Boolean))];
  let last: Attempt = { ok: true, value: { items: [], total: 0 } };
  for (const baseYm of months) {
    if (remaining() <= 0) break;
    const results = await Promise.all(codes.map((code) => attempt(fetchKto(env, "TarRlteTarService1", "areaBasedList1", {
      ...commonParams("10"), baseYm, areaCd: "48", signguCd: code,
    }))));
    const available = results.filter((result): result is Extract<Attempt, { ok: true }> => result.ok);
    if (available.length) {
      const items = available.flatMap((result) => result.value.items);
      last = { ok: true, value: { items, total: items.length } };
      if (items.length) return { result: last, baseYm };
    } else if (results[0]) last = results[0];
  }
  return { result: last, baseYm: preferredYm };
}

export async function fetchCrowd(env: Env, region: string, title: string) {
  const code = regionCodes[region]?.full?.[0] || regionCodes["창원"].full[0];
  return attempt(fetchKto(env, "TatsCnctrRateService", "tatsCnctrRatedList", {
    ...commonParams("10"), areaCd: "48", signguCd: code, ...(title ? { tAtsNm: title } : {}),
  }));
}
