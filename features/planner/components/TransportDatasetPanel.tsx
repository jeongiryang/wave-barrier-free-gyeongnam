import { useRef } from "react";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";
import { arrivalTime, remainingStops } from "../transport-time-copy";
import { datasetDescription, datasetName, datasetResult, resultMessage } from "../transport-detail-copy";
import { useReadinessFocus } from "../hooks/useReadinessFocus";
import { providerFailureMessage } from "../../../lib/provider-failure.js";

export default function TransportDatasetPanel({ activePlaces, route }: { activePlaces: Place[]; route: ReturnType<typeof useRoutePlanning> }) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const focus = useReadinessFocus();
  const pending = useRef(false);
  const { privateOrigin, routeDestination, routeLoading, routeFailed, transportContext, loadRoutes, selectedDataset, selectedTransportDataset } = route;
  const id = selectedDataset?.id || selectedTransportDataset;
  const destination = routeDestination || activePlaces[0];
  const unavailable = privateOrigin || !destination;
  const result = routeFailed ? "error" : !transportContext ? "unqueried" : datasetResult(selectedDataset);
  async function retry() {
    if (pending.current || routeLoading || unavailable) return;
    pending.current = true;
    try { await loadRoutes(destination); } finally { pending.current = false; }
  }
  return <section className="transport-data-panel" aria-labelledby="transport-data-title" {...focus}>
    <div className="transport-data-heading"><div><span>{english ? "Transport information" : "교통정보"}</span><h3 id="transport-data-title">{datasetName(id, english, selectedDataset?.name)}</h3><p>{datasetDescription(id, english)}</p></div><button type="button" onClick={() => void retry()} disabled={unavailable} aria-disabled={unavailable || routeLoading} aria-busy={routeLoading}>{routeLoading ? (english ? "Checking…" : "확인 중") : (english ? "Check these conditions again" : "현재 조건 다시 확인")}</button></div>
    {english && <p className="transport-source-note">Stop, route and station names are shown in their original language.</p>}
    <div className="transport-data-results" aria-busy={routeLoading} aria-live="polite">
      {routeLoading ? <p role="status">{english ? "Checking current transport information…" : "현재 교통정보를 확인하고 있습니다…"}</p> : privateOrigin ? <p>{english ? "Choose a public departure point to request transport information, or check directly in the map provider's app." : "교통정보를 조회하려면 공개 출발 거점을 선택하거나 지도 앱에서 직접 확인해 주세요."}</p> : result !== "data" ? <div className="transport-data-empty"><strong>{selectedDataset?.failure ? providerFailureMessage(selectedDataset.failure, english) : resultMessage(result, id, english)}</strong><span>{english ? "Check again after reviewing your departure and destination, or use official booking." : "출발지·목적지를 확인해 다시 조회하거나 공식 예매에서 확인하세요."}</span></div> : transportContext && <>
        {id === "bus-stop" && transportContext.nearbyStops.map((item) => <article key={item.id || item.name}><small>{english ? "Stop near the destination" : "도착지 주변 정류장"}</small><strong lang={originalLanguage(item.name)}>{item.name}</strong><span>{english ? "Check current service and boarding access separately." : "현재 운행과 탑승 편의는 별도로 확인하세요."}</span></article>)}
        {id === "bus-arrival" && transportContext.arrivals.map((item, index) => <article key={item.route + index}><small>{english ? "Arrival information" : "도착 예정 정보"}</small><strong lang={originalLanguage(item.route)}>{item.route}</strong><span>{arrivalTime(item.minutes, english)} · {remainingStops(item.stops, english)}</span></article>)}
        {id === "korail-plan" && transportContext.korail.map((item, index) => <article key={item.trainNo + index}><small>{item.departureTime || (english ? "Departure time not provided" : "출발시간 미제공")}</small><strong lang={originalLanguage(item.trainNo)}>{item.trainNo || (english ? "Train" : "여객열차")}</strong><span><b lang={originalLanguage(item.departure)}>{item.departure || (english ? "Departure station not provided" : "출발역 미제공")}</b> → <b lang={originalLanguage(item.arrival)}>{item.arrival || (english ? "Arrival station not provided" : "도착역 미제공")}</b></span></article>)}
        {id === "train" && <article><small>{english ? "Rail service areas" : "철도 지역 목록"}</small><strong>{english ? transportContext.catalog.trainCities + " area codes" : "지역코드 " + transportContext.catalog.trainCities + "개"}</strong><span>{english ? "This list does not confirm a train service or available seat." : "이 목록으로 실제 운행편이나 좌석을 확인할 수는 없습니다."}</span></article>}
        {(id === "express" || id === "intercity") && <article><small>{datasetName(id, english)}</small><strong>{(id === "express" ? transportContext.catalog.expressTerminals : transportContext.catalog.intercityTerminals) + (english ? " terminals" : "개 터미널")}</strong><span>{english ? "Check actual services and seats with official booking." : "실제 운행편과 좌석은 공식 예매에서 확인하세요."}</span></article>}
      </>}
    </div>
  </section>;
}
