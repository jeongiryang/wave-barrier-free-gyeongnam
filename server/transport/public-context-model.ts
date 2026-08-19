import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import { transportProvider } from "../shared/provider-data";
import type { PublicTransportSnapshot } from "./public-provider-queries";

export function buildPublicTransportContext(env: Env, snapshot: PublicTransportSnapshot) {
  const { korailKey, tagoKey, korailPlans, nearbyStops, trainCatalog, expressCatalog, intercityCatalog, arrivalItems } = snapshot;
  const providers = [
    transportProvider("kakao-drive", "KAKAO DRIVE", "자동차 시간·거리·통행료", Boolean(env.KAKAO_REST_API_KEY?.trim())),
    transportProvider("odsay", "ODsay", "대중교통 시간·요금·환승", Boolean(env.ODSAY_API_KEY?.trim())),
    transportProvider("korail", "KORAIL", "여객열차 운행계획", korailKey, korailPlans),
    transportProvider("tago-bus", "TAGO BUS", `정류장·도착 ${arrivalItems.length ? `${arrivalItems.length}건` : ""}`.trim(), tagoKey, nearbyStops),
    transportProvider("tago-rail", "TAGO RAIL", "열차·지하철", tagoKey, trainCatalog),
    transportProvider("tago-regional", "TAGO EXPRESS", "고속·시외버스", tagoKey, expressCatalog?.ok ? expressCatalog : intercityCatalog),
    transportProvider("tago-mobility", "TAGO MOVE", "항공·선박·카셰어링·PM", tagoKey),
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
      { id: "bus-route", name: "버스노선", state: tagoKey ? "ready" : "missing" },
      { id: "bus-location", name: "버스위치", state: tagoKey ? "ready" : "missing" },
      { id: "bus-arrival", name: "버스도착", state: arrivalItems.length ? "live" : tagoKey ? "ready" : "missing" },
      { id: "subway", name: "지하철", state: tagoKey ? "ready" : "missing" },
      { id: "express-arrival", name: "고속버스도착", state: tagoKey ? "ready" : "missing" },
      { id: "train", name: "열차", state: trainCatalog?.ok ? (trainCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "express", name: "고속버스", state: expressCatalog?.ok ? (expressCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "intercity", name: "시외버스", state: intercityCatalog?.ok ? (intercityCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "air", name: "국내항공", state: tagoKey ? "ready" : "missing" },
      { id: "ship", name: "국내선박", state: tagoKey ? "ready" : "missing" },
      { id: "carshare", name: "카셰어링", state: tagoKey ? "ready" : "missing" },
      { id: "pm", name: "공유PM", state: tagoKey ? "ready" : "missing" },
      { id: "korail-plan", name: "KORAIL 운행계획", state: korailPlans?.ok ? (korailPlans.value.total ? "live" : "ready") : korailKey ? "error" : "missing" },
    ],
  };
  return { providers, context };
}
