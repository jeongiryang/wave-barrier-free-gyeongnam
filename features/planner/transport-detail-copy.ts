import type { TransportContext, TransportProvider } from "./types";
import { providerFailureMessage } from "../../lib/provider-failure.js";

type Dataset = TransportContext["datasets"][number];
export type DatasetResult = "data" | "empty" | "unqueried" | "unknown" | "error" | "missing";

export function datasetResult(dataset?: Dataset | null): DatasetResult {
  if (!dataset) return "unknown";
  if (dataset.state === "error" || dataset.queryStatus === "error") return "error";
  if (dataset.state === "missing") return "missing";
  if (dataset.queryStatus === "not-requested") return "unqueried";
  if (dataset.queryStatus === "success") {
    if (dataset.resultCount === 0) return dataset.state === "ready" ? "empty" : "unknown";
    if (!Number.isSafeInteger(dataset.resultCount) || (dataset.resultCount ?? -1) < 0) return "unknown";
  }
  return dataset.state === "live" ? "data" : "unknown";
}

const names: Record<string, [string, string]> = {
  "bus-stop": ["버스정류소", "Bus stops"], "bus-arrival": ["버스도착", "Bus arrivals"],
  train: ["철도 지역코드", "Rail service areas"], express: ["고속버스 터미널", "Express bus terminals"],
  intercity: ["시외버스 터미널", "Intercity bus terminals"], "korail-plan": ["KORAIL 운행계획", "KORAIL timetables"],
};
export function datasetName(id: string, english: boolean, fallback = "") {
  return names[id]?.[english ? 1 : 0] || fallback || (english ? "Transport information" : "교통정보");
}

const descriptions: Record<string, [string, string]> = {
  "bus-stop": ["목적지 주변 정류장 목록입니다. 정류장의 이동 편의는 별도 확인이 필요합니다.", "Stops near your destination. Check each stop's access facilities separately."],
  "bus-arrival": ["가까운 정류장의 현재 도착 예정 정보입니다. 실제 탑승 가능 여부는 별도 확인하세요.", "Current arrival information for a nearby stop. Check boarding access separately."],
  train: ["철도 정보가 제공되는 지역 목록입니다. 실제 운행편이나 좌석 정보가 아닙니다.", "Areas covered by the rail information service. This is not a list of trains or available seats."],
  express: ["전국 고속버스 터미널 목록입니다. 실제 운행편과 좌석은 공식 예매에서 확인하세요.", "A national terminal list. Check actual services and seats with the official booking service."],
  intercity: ["전국 시외버스 터미널 목록입니다. 실제 운행편과 좌석은 공식 예매에서 확인하세요.", "A national terminal list. Check actual services and seats with the official booking service."],
  "korail-plan": ["조회일의 열차 운행계획입니다. 선택한 출발·도착 구간이나 여행 날짜로 조회한 승차권이 아닙니다.", "Train plans for the query date. These are not tickets filtered to your journey or travel dates."],
};
export const datasetDescription = (id: string, english: boolean) => descriptions[id]?.[english ? 1 : 0] || "";

const statusNames: Record<DatasetResult, [string, string]> = {
  data: ["정보 수신", "Information received"], empty: ["현재 결과 없음", "No current results"],
  unqueried: ["조회 전", "Not requested"], unknown: ["확인 필요", "Needs checking"],
  error: ["조회 실패", "Could not check"], missing: ["제공되지 않음", "Unavailable"],
};
export function datasetStatus(dataset: Dataset, english: boolean) {
  if (dataset.failure) return providerFailureMessage(dataset.failure, english);
  const state = datasetResult(dataset);
  if (state === "data" && ["train", "express", "intercity"].includes(dataset.id)) return english ? "List received" : "목록 확인";
  if (state === "data" && dataset.id === "korail-plan") return english ? "Timetable received" : "운행계획 수신";
  return statusNames[state][english ? 1 : 0];
}

export function resultMessage(state: DatasetResult, id: string, english: boolean) {
  if (state === "unqueried") return id === "bus-arrival"
    ? (english ? "Arrival information has not been requested yet." : "아직 도착정보를 조회하지 않았습니다.")
    : (english ? "This information has not been requested yet." : "아직 이 정보를 조회하지 않았습니다.");
  const copy: Record<Exclude<DatasetResult, "unqueried">, [string, string]> = {
    data: ["", ""], empty: ["조회했지만 현재 조건의 결과가 없습니다.", "The request returned no results for these conditions."],
    unknown: ["현재 조회 상태를 확인할 수 없습니다.", "The current request status is unknown."],
    error: ["운행정보를 확인하지 못했습니다.", "Transport information could not be checked."],
    missing: ["이 교통정보는 현재 제공되지 않습니다.", "This transport information is currently unavailable."],
  };
  return copy[state][english ? 1 : 0];
}

const roles: Record<string, [string, string]> = {
  "kakao-drive": ["자동차 경로", "Driving routes"], kakao: ["자동차 경로", "Driving routes"],
  odsay: ["대중교통 경로", "Public transport routes"], korail: ["열차 운행계획", "Train timetables"],
  "tago-bus-stop": ["주변 정류장", "Nearby stops"], "tago-bus-arrival": ["버스 도착정보", "Bus arrival information"],
  "tago-rail-catalog": ["철도 지역 목록", "Rail area list"], "tago-express-catalog": ["고속버스 터미널 목록", "Express terminal list"],
  "tago-intercity-catalog": ["시외버스 터미널 목록", "Intercity terminal list"],
};
export function providerRole(provider: TransportProvider, english: boolean) {
  return roles[provider.id]?.[english ? 1 : 0] || provider.role;
}
export function providerStatus(provider: TransportProvider, english: boolean) {
  if (provider.failure) return providerFailureMessage(provider.failure, english);
  if (provider.state === "checking") return english ? "Checking" : "조회 중";
  if (provider.state === "error") return statusNames.error[english ? 1 : 0];
  if (!provider.configured || provider.state === "missing") return statusNames.missing[english ? 1 : 0];
  if (provider.queryStatus === "success" && provider.resultCount === 0) return statusNames.empty[english ? 1 : 0];
  if (provider.state === "connected") return statusNames.data[english ? 1 : 0];
  return statusNames[provider.queryStatus === "not-requested" ? "unqueried" : "unknown"][english ? 1 : 0];
}

export const bookingEnglish: Record<string, [string, string]> = {
  korail: ["KORAIL tickets", "KTX and other trains"], kobus: ["KOBUS tickets", "Express bus booking"],
  bustago: ["BUSTAGO tickets", "Intercity bus booking"],
};
