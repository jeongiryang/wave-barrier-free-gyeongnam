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
      {selectedDataset.id === "bus-stop" && transportContext.nearbyStops.map((item) => <article key={item.id || item.name}><small>정류장 ID {item.id || "확인 중"}</small><strong>{item.name}</strong><span>도시 코드 {item.cityCode || "—"}</span></article>)}
      {selectedDataset.id === "bus-arrival" && transportContext.arrivals.map((item, index) => <article key={`${item.route}-${index}`}><small>도착 예정</small><strong>{item.route}</strong><span>{item.minutes ? `${item.minutes}분 후` : "운행 중"} · {item.stops ? `${item.stops}개 정류장 전` : "정류장 접근 중"}</span></article>)}
      {(selectedDataset.id === "train" || selectedDataset.id === "korail-plan") && transportContext.korail.map((item, index) => <article key={`${item.trainNo}-${index}`}><small>{item.departureTime || "운행계획"}</small><strong>{item.trainNo || "여객열차"}</strong><span>{item.departure || "출발역"} → {item.arrival || "도착역"}</span></article>)}
      {selectedDataset.id === "express" && <article><small>고속버스 터미널 카탈로그</small><strong>{transportContext.catalog.expressTerminals.toLocaleString()}개</strong><span>전국 터미널 조회 응답</span></article>}
      {selectedDataset.id === "intercity" && <article><small>시외버스 터미널 카탈로그</small><strong>{transportContext.catalog.intercityTerminals.toLocaleString()}개</strong><span>전국 터미널 조회 응답</span></article>}
      {selectedDataset.id === "subway" && <article><small>철도 도시 데이터</small><strong>{transportContext.catalog.trainCities.toLocaleString()}개</strong><span>지역 선택 후 역·노선 조회 가능</span></article>}
      {((selectedDataset.id === "bus-stop" && !transportContext.nearbyStops.length) || (selectedDataset.id === "bus-arrival" && !transportContext.arrivals.length) || ((selectedDataset.id === "train" || selectedDataset.id === "korail-plan") && !transportContext.korail.length)) && <div className="transport-data-empty"><strong>현재 조건의 결과가 없습니다.</strong><span>목적지나 출발지를 바꾼 뒤 다시 조회해 보세요.</span></div>}
      {!['bus-stop', 'bus-arrival', 'train', 'korail-plan', 'express', 'intercity', 'subway'].includes(selectedDataset.id) && <div className="transport-data-empty"><strong>{selectedDataset.state === "live" ? "현재 운행정보를 확인했습니다." : selectedDataset.state === "ready" ? "지역이나 노선을 선택해 주세요." : "제공기관 정보를 잠시 확인하고 있습니다."}</strong><span>도시·노선·정류소·터미널을 선택하면 자세한 운행정보가 표시됩니다.</span></div>}
      </>}
    </div>
  </section>;
}
