import { transportDatasetMeta } from "../constants";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place } from "../types";

export default function TransportDatasetPanel({ activePlaces, route }: { activePlaces: Place[]; route: ReturnType<typeof useRoutePlanning> }) {
  const { privateOrigin, routeDestination, routeLoading, transportContext, loadRoutes, selectedDataset } = route;
  if (!transportContext || !selectedDataset) return null;
  return <section className="transport-data-panel" aria-live="polite">
    <div className="transport-data-heading"><div><span>운행정보</span><h3>{selectedDataset.name}</h3><p>{transportDatasetMeta[selectedDataset.id]?.description}</p></div><button type="button" onClick={() => activePlaces[0] && void loadRoutes(routeDestination || activePlaces[0])} disabled={routeLoading || privateOrigin}>{routeLoading ? "확인 중" : "현재 조건 다시 확인"}</button></div>
    <div className="transport-data-results" aria-busy={routeLoading}>
      {routeLoading && [0, 1, 2, 3].map((item) => <article className="transport-result-skeleton" key={`transport-skeleton-${item}`} aria-hidden="true"><i /><b /><span /></article>)}
      {!routeLoading && <>
      {selectedDataset.id === "bus-stop" && transportContext.nearbyStops.map((item) => <article key={item.id || item.name}><small>도착지 주변 정류장</small><strong>{item.name}</strong><span>버스 도착정보에서 운행 여부를 확인하세요.</span></article>)}
      {selectedDataset.id === "bus-arrival" && transportContext.arrivals.map((item, index) => <article key={`${item.route}-${index}`}><small>도착 예정</small><strong>{item.route}</strong><span>{item.minutes ? `${item.minutes}분 후` : "운행 중"} · {item.stops ? `${item.stops}개 정류장 전` : "정류장 접근 중"}</span></article>)}
      {selectedDataset.id === "korail-plan" && transportContext.korail.map((item, index) => <article key={`${item.trainNo}-${index}`}><small>{item.departureTime || "운행계획"}</small><strong>{item.trainNo || "여객열차"}</strong><span>{item.departure || "출발역"} → {item.arrival || "도착역"}</span></article>)}
      {selectedDataset.id === "train" && <article><small>TAGO 철도</small><strong>지역코드 {transportContext.catalog.trainCities}개 확인</strong><span>열차 운행편은 KORAIL 운행계획과 공식 예매에서 확인하세요.</span></article>}
      {selectedDataset.id === "express" && <article><small>고속버스</small><strong>터미널 {transportContext.catalog.expressTerminals}개 확인</strong><span>실제 운행편과 좌석은 공식 예매에서 확인하세요.</span></article>}
      {selectedDataset.id === "intercity" && <article><small>시외버스</small><strong>터미널 {transportContext.catalog.intercityTerminals}개 확인</strong><span>실제 운행편과 좌석은 공식 예매에서 확인하세요.</span></article>}
      {((selectedDataset.id === "bus-stop" && !transportContext.nearbyStops.length) || (selectedDataset.id === "bus-arrival" && !transportContext.arrivals.length) || (selectedDataset.id === "korail-plan" && !transportContext.korail.length)) && <div className="transport-data-empty"><strong>현재 조건의 결과가 없습니다.</strong><span>목적지나 출발지를 바꾼 뒤 다시 조회해 보세요.</span></div>}
      </>}
    </div>
  </section>;
}
