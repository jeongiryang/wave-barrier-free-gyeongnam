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

export async function fetchPublicTransportSnapshot(env: Env, endLat: number, endLng: number): Promise<PublicTransportSnapshot> {
  const transportKey = publicTransportKey(env);
  const korailKey = Boolean(env.KORAIL_API_KEY?.trim() || env.TOUR_API_SERVICE_KEY_ENCODED?.trim());
  const tagoKey = Boolean(env.TAGO_API_KEY?.trim() || env.TOUR_API_SERVICE_KEY_ENCODED?.trim());
  const runYmd = koreaYmd();
  const [korailPlans, nearbyStops, trainCatalog, expressCatalog, intercityCatalog] = transportKey
    ? await Promise.all([
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/B551457/run/v2", "travelerTrainRunPlan2", {
          returnType: "JSON", numOfRows: "10", "cond[run_ymd::GTE]": runYmd, "cond[run_ymd::LTE]": runYmd,
        })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/BusSttnInfoInqireService", "getCrdntPrxmtSttnList", { gpsLati: String(endLat), gpsLong: String(endLng), numOfRows: "8" })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/TrainInfo", "GetCtyCodeList", { numOfRows: "100" })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/ExpBusInfo", "GetExpBusTrminlList", { numOfRows: "100" })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/SuburbsBusInfo", "GetSuberbsBusTrminlList", { numOfRows: "100" })),
      ])
    : [null, null, null, null, null];

  let arrivals: ProviderAttempt | null = null;
  if (nearbyStops?.ok && nearbyStops.value.items.length) {
    const stop = nearbyStops.value.items[0];
    const cityCode = clean(stop.citycode || stop.cityCode);
    const nodeId = clean(stop.nodeid || stop.nodeId);
    if (cityCode && nodeId) {
      arrivals = await attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/ArvlInfoInqireService", "getSttnAcctoArvlPrearngeInfoList", { cityCode, nodeId, numOfRows: "8" }));
    }
  }
  return { korailKey, tagoKey, korailPlans, nearbyStops, trainCatalog, expressCatalog, intercityCatalog, arrivals };
}
