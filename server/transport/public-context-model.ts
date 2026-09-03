import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import { transportProvider } from "../shared/provider-data";
import type { PublicTransportSnapshot } from "./public-provider-queries";

export function buildPublicTransportContext(env: Env, snapshot: PublicTransportSnapshot) {
  const { korailKey, tagoKey, korailPlans, nearbyStops, trainCatalog, expressCatalog, intercityCatalog, arrivals } = snapshot;
  const arrivalItems = arrivals?.ok ? arrivals.value.items : [];
  const providers = [
    transportProvider("kakao-drive", "KAKAO DRIVE", "자동차 시간·거리·통행료", Boolean(env.KAKAO_REST_API_KEY?.trim())),
    transportProvider("odsay", "ODsay", "대중교통 시간·요금·환승", Boolean(env.ODSAY_API_KEY?.trim())),
    transportProvider("korail", "KORAIL", "여객열차 운행계획", korailKey, korailPlans),
    transportProvider("tago-bus-stop", "TAGO BUS", "목적지 주변 버스정류장", tagoKey, nearbyStops),
    transportProvider("tago-bus-arrival", "TAGO ARRIVAL", "가까운 정류장 도착 예정", tagoKey, arrivals),
    transportProvider("tago-rail-catalog", "TAGO RAIL", "철도 지역코드", tagoKey, trainCatalog),
    transportProvider("tago-express-catalog", "TAGO EXPRESS", "고속버스 터미널", tagoKey, expressCatalog),
    transportProvider("tago-intercity-catalog", "TAGO INTERCITY", "시외버스 터미널", tagoKey, intercityCatalog),
  ];

  const context = {
    nearbyStops: nearbyStops?.ok ? nearbyStops.value.items.slice(0, 6).map((item) => ({
      id: clean(item.nodeid || item.nodeId), name: clean(item.nodenm || item.nodeNm || item.sttnNm || "인근 정류장"), cityCode: clean(item.citycode || item.cityCode),
    })) : [],
    arrivals: arrivalItems.slice(0, 6).map((item) => ({
      route: clean(item.routeno || item.routeNo || item.routenm || item.routeNm || "버스"),
      minutes: Number(item.arrtime || item.arrTime) > 0 ? Math.max(1, Math.round(Number(item.arrtime || item.arrTime) / 60)) : null,
      stops: Number(item.arrprevstationcnt || item.arrPrevStationCnt || 0),
    })),
    korail: korailPlans?.ok ? korailPlans.value.items.slice(0, 6).map((item) => ({
      trainNo: clean(item.trn_no || item.trnNo || item.trainNo || item.trainno || "열차"),
      departure: clean(item.dptre_stn_nm || item.dptreStnNm || item.depPlaceNm || item.depplacename || item.stdepplacename),
      arrival: clean(item.arvl_stn_nm || item.arvlStnNm || item.arrPlaceNm || item.arrplacename || item.starrplacename),
      departureTime: clean(item.trn_plan_dptre_dt || item.trnPlanDptreDt || item.depplandtime || item.depPlandTime),
    })) : [],
    catalog: {
      trainCities: trainCatalog?.ok ? trainCatalog.value.total : 0,
      expressTerminals: expressCatalog?.ok ? expressCatalog.value.total : 0,
      intercityTerminals: intercityCatalog?.ok ? intercityCatalog.value.total : 0,
    },
    datasets: [
      { id: "bus-stop", name: "버스정류소", state: nearbyStops?.ok ? (nearbyStops.value.items.length ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "bus-arrival", name: "버스도착", state: arrivals?.ok ? (arrivalItems.length ? "live" : "ready") : arrivals ? "error" : tagoKey ? "ready" : "missing" },
      { id: "train", name: "철도 지역코드", state: trainCatalog?.ok ? (trainCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "express", name: "고속버스 터미널", state: expressCatalog?.ok ? (expressCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "intercity", name: "시외버스 터미널", state: intercityCatalog?.ok ? (intercityCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "korail-plan", name: "KORAIL 운행계획", state: korailPlans?.ok ? (korailPlans.value.total ? "live" : "ready") : korailKey ? "error" : "missing" },
    ],
  };
  return { providers, context };
}
