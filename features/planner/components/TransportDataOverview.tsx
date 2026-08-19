import {
  officialBookingLinks,
  transportDatasetMeta,
  transportModes,
  transportStateLabel,
} from "../constants";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, TransportProvider } from "../types";

interface TransportDataOverviewProps {
  activePlaces: Place[];
  effectiveProviders: TransportProvider[];
  route: ReturnType<typeof useRoutePlanning>;
  onCopyBookingRoute: (provider: string) => Promise<void>;
}

export default function TransportDataOverview({
  activePlaces,
  effectiveProviders,
  route,
  onCopyBookingRoute,
}: TransportDataOverviewProps) {
  const {
    privateOrigin,
    routeDestination,
    routeLoading,
    transportContext,
    loadRoutes,
    transportMode,
    setTransportMode,
    selectedTransportDataset,
    setSelectedTransportDataset,
    selectedDataset,
  } = route;

  return <>
    <div className="transport-mode-filter" role="tablist" aria-label="교통수단별 결과 필터">
      {transportModes.map((mode) => <button type="button" role="tab" aria-selected={transportMode === mode.id} key={mode.id} className={transportMode === mode.id ? "active" : ""} onClick={() => setTransportMode(mode.id)}><b>{mode.label}</b><small>{mode.description}</small></button>)}
    </div>
    {transportContext && (transportContext.nearbyStops.length > 0 || transportContext.arrivals.length > 0 || transportContext.korail.length > 0) && <div className="transport-live-rail" aria-live="polite">
      <div><span>도착지 인근 정류장</span><strong>{transportContext.nearbyStops.slice(0, 3).map((item) => item.name).join(" · ") || "조회 중"}</strong></div>
      <div><span>버스 도착</span><strong>{transportContext.arrivals.slice(0, 3).map((item) => `${item.route} ${item.minutes ? `${item.minutes}분` : "운행 중"}`).join(" · ") || "도착 정보 없음"}</strong></div>
      <div><span>KORAIL 운행계획</span><strong>{transportContext.korail.length ? `${transportContext.korail.length}개 열차 응답` : "승인 상태 확인"}</strong></div>
    </div>}
    <details className="transport-details">
      <summary>교통정보 제공 범위 자세히 보기 <span>선택 사항</span></summary>
      <div className="transport-provider-strip" aria-label="교통정보 연결 상태">
        {effectiveProviders.map((provider) => <span key={provider.id} className={provider.state} title={provider.detail || provider.role}><i /> <b>{provider.role}</b><small>{transportStateLabel[provider.state]}</small></span>)}
      </div>
      {transportContext?.datasets?.length ? <div className="transport-dataset-grid" aria-label="교통정보 데이터 범위">
        {transportContext.datasets.map((dataset) => <button type="button" aria-pressed={selectedTransportDataset === dataset.id} key={dataset.id} className={`${dataset.state}${selectedTransportDataset === dataset.id ? " selected" : ""}`} onClick={() => { setSelectedTransportDataset(dataset.id); setTransportMode(transportDatasetMeta[dataset.id]?.mode || "all"); }}><i />{dataset.name}<small>{dataset.state === "live" ? "운행 확인" : dataset.state === "ready" ? "이용 가능" : dataset.state === "error" ? "잠시 지연" : "준비 중"}</small></button>)}
      </div> : null}
    </details>
    {officialBookingLinks.some((link) => (link.modes as readonly string[]).includes(transportMode)) && <div className="official-booking-strip" aria-label="공식 교통 승차권 예매">
      <span><b>공식 예매</b><small>운행정보 확인 후 제공기관에서 결제</small></span>
      {officialBookingLinks.filter((link) => (link.modes as readonly string[]).includes(transportMode)).map((link) => <a key={link.id} href={link.href} target="_blank" rel="noreferrer" onClick={() => void onCopyBookingRoute(link.label)}><i>↗</i><strong>{link.label}</strong><small>{link.detail} · 출발·도착 복사</small></a>)}
    </div>}
    {transportContext && selectedDataset && <section className="transport-data-panel" aria-live="polite">
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
    </section>}
  </>;
}
