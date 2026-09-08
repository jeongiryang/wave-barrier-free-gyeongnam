import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import {
  attemptProvider as attempt,
  fetchPublicTransportData as fetchPublicTransport,
  koreaYmd,
  publicTransportKey,
  type ProviderAttempt,
} from "../shared/provider-data";

export type PublicTransportSnapshot = {
  korailKey: boolean;
  tagoKey: boolean;
  korailPlans: ProviderAttempt | null;
  nearbyStops: ProviderAttempt | null;
  trainCatalog: ProviderAttempt | null;
  expressCatalog: ProviderAttempt | null;
  intercityCatalog: ProviderAttempt | null;
  arrivals: ProviderAttempt | null;
};

/** A failed prerequisite is different from a successful empty stop search. */
export function arrivalDependencyFailure(nearbyStops: ProviderAttempt | null): ProviderAttempt | null {
  if (nearbyStops && !nearbyStops.ok) {
    return { ok: false, error: "주변 정류장을 확인하지 못해 버스 도착 정보를 조회하지 못했습니다." };
  }
  if (nearbyStops?.ok && nearbyStops.value.items.length) {
    const stop = nearbyStops.value.items[0];
    if (!clean(stop.citycode || stop.cityCode) || !clean(stop.nodeid || stop.nodeId)) {
      return { ok: false, error: "정류장 식별정보가 부족해 도착 정보를 조회하지 않았습니다." };
    }
  }
  return null;
}

export async function fetchPublicTransportSnapshot(env: Env, endLat: number, endLng: number): Promise<PublicTransportSnapshot> {
  const korailKey = Boolean(publicTransportKey(env, "korail"));
  const tagoKey = Boolean(publicTransportKey(env, "tago"));
  const runYmd = koreaYmd();
  const [korailPlans, nearbyStops, trainCatalog, expressCatalog, intercityCatalog] = await Promise.all([
        korailKey ? attempt(fetchPublicTransport(env, "korail", "https://apis.data.go.kr/B551457/run/v2", "travelerTrainRunPlan2", {
          returnType: "JSON", numOfRows: "10", "cond[run_ymd::GTE]": runYmd, "cond[run_ymd::LTE]": runYmd,
        })) : null,
        tagoKey ? attempt(fetchPublicTransport(env, "tago", "https://apis.data.go.kr/1613000/BusSttnInfoInqireService", "getCrdntPrxmtSttnList", { gpsLati: String(endLat), gpsLong: String(endLng), numOfRows: "8" })) : null,
        tagoKey ? attempt(fetchPublicTransport(env, "tago", "https://apis.data.go.kr/1613000/TrainInfo", "GetCtyCodeList")) : null,
        tagoKey ? attempt(fetchPublicTransport(env, "tago", "https://apis.data.go.kr/1613000/ExpBusInfo", "GetExpBusTrminlList", { numOfRows: "100" })) : null,
        tagoKey ? attempt(fetchPublicTransport(env, "tago", "https://apis.data.go.kr/1613000/SuburbsBusInfo", "GetSuberbsBusTrminlList", { numOfRows: "100" })) : null,
      ]);

  let arrivals: ProviderAttempt | null = arrivalDependencyFailure(nearbyStops);
  if (nearbyStops?.ok && nearbyStops.value.items.length) {
    const stop = nearbyStops.value.items[0];
    const cityCode = clean(stop.citycode || stop.cityCode);
    const nodeId = clean(stop.nodeid || stop.nodeId);
    if (cityCode && nodeId) {
      arrivals = await attempt(fetchPublicTransport(env, "tago", "https://apis.data.go.kr/1613000/ArvlInfoInqireService", "getSttnAcctoArvlPrearngeInfoList", { cityCode, nodeId, numOfRows: "8" }));
    }
  }
  return { korailKey, tagoKey, korailPlans, nearbyStops, trainCatalog, expressCatalog, intercityCatalog, arrivals };
}
