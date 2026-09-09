import { Fragment } from "react";
import type { TransportContext } from "../types";
import { originalLanguage } from "../place-copy";
import { arrivalTime } from "../transport-time-copy";
import ArrivalRetrievedAt from "./ArrivalRetrievedAt";

export default function TransportLiveSummary({ transportContext, english }: { transportContext: TransportContext; english: boolean }) {
  return <div className="transport-live-rail" aria-live="polite">
    <div><span>{english ? "Nearby stops" : "가까운 정류장"}</span><strong>{transportContext.nearbyStops.length ? transportContext.nearbyStops.slice(0, 3).map((item, index) => <Fragment key={item.id || index}>{index > 0 && " · "}<b lang={originalLanguage(item.name)}>{item.name}</b></Fragment>) : (english ? "Needs checking" : "확인 필요")}</strong></div>
    <div><span>{english ? "Bus arrivals" : "버스 도착"}</span><strong>{transportContext.arrivals.length ? transportContext.arrivals.slice(0, 3).map((item, index) => <Fragment key={index}>{index > 0 && " · "}<b lang={originalLanguage(item.route)}>{item.route}</b>{" "}{arrivalTime(item.minutes, english)}</Fragment>) : (english ? "Arrival information needs checking" : "도착정보 확인 필요")}</strong>{transportContext.arrivals.length > 0 && <ArrivalRetrievedAt value={transportContext.arrivalRetrievedAt} english={english} />}</div>
    <div><span>{english ? "Train plans" : "열차 운행계획"}</span><strong>{transportContext.korail.length ? (english ? "Timetable received" : "운행계획 수신") : (english ? "Timetable needs checking" : "운행계획 확인 필요")}</strong></div>
  </div>;
}
