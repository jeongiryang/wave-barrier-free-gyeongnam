import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import {
  attemptProvider as attempt,
  commonParams,
  fetchRegionalList,
  fetchTourismData as fetchKto,
  type ProviderAttempt as Attempt,
} from "../shared/provider-data";
import { regionCodes } from "./catalog";

export async function fetchCamping(env: Env, region: string) {
  const keyword = region === "경남 전체" ? "경상남도" : region;
  const primary = await attempt(fetchKto(env, "GoCamping", "searchList", { ...commonParams("24"), keyword }));
  if (primary.ok && primary.value.items.length) return primary;
  const catalog = await attempt(fetchKto(env, "GoCamping", "basedList", { ...commonParams("1000") }));
  if (!catalog.ok) return primary.ok ? catalog : primary;
  const matched = catalog.value.items.filter((item) => {
    const address = clean(item.addr1 || item.addr2 || item.doNm || item.sigunguNm);
    return region === "경남 전체" ? /경상남도|경남/.test(address) : address.includes(region);
  });
  return { ok: true, value: { items: matched, total: matched.length } } as Attempt;
}

export async function provinceFallback(primary: Promise<Attempt>, fallback: () => Promise<Attempt>) {
  const result = await primary;
  if (!result.ok || result.value.items.length) return result;
  const broader = await fallback();
  return broader.ok && broader.value.items.length ? broader : result;
}

export function fetchRegionalEvents(env: Env, region: string, startDate: string, endDate: string): Promise<Attempt> {
  const districts = regionCodes[region].legal;
  const base = {
    ...commonParams("16"),
    arrange: "A",
    lDongRegnCd: "48",
    eventStartDate: startDate,
    eventEndDate: endDate,
  };
  return provinceFallback(
    fetchRegionalList(env, "KorService2", "searchFestival2", base, districts),
    () => fetchRegionalList(env, "KorService2", "searchFestival2", base, []),
  );
}

export function fetchRegionalLodging(env: Env, region: string): Promise<Attempt> {
  const districts = regionCodes[region].legal;
  const base = { ...commonParams("12"), arrange: "Q", lDongRegnCd: "48", contentTypeId: "32" };
  return provinceFallback(
    fetchRegionalList(env, "KorService2", "areaBasedList2", base, districts),
    () => fetchRegionalList(env, "KorService2", "areaBasedList2", base, []),
  );
}
