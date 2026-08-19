import RouteMap from "../../../components/RouteMap";
import type { MapPlace } from "../../routing/types";
import {
  departurePresets,
  officialBookingLinks,
  transportDatasetMeta,
  transportModes,
  transportStateLabel,
} from "../constants";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, PlanData, TransportProvider } from "../types";
import { routeModeLabel } from "../utils";

interface NavigationWorkspaceProps {
  t: (key: string, fallback: string) => string;
  activePlaces: Place[];
  planCrowd: PlanData["crowd"];
  effectiveProviders: TransportProvider[];
  route: ReturnType<typeof useRoutePlanning>;
  locationSearch: ReturnType<typeof useLocationSearch>;
  onChoosePoint: (place: Place) => void;
  onCopyBookingRoute: (provider: string) => Promise<void>;
  onMapDestination: (place: MapPlace) => void;
}

export default function NavigationWorkspace({
  t,
  activePlaces,
  planCrowd,
  effectiveProviders,
  route,
  locationSearch,
  onChoosePoint,
  onCopyBookingRoute,
  onMapDestination,
}: NavigationWorkspaceProps) {
  const {
    origin,
    originLabel,
    privateOrigin,
    routeAlternatives,
    routeDestination,
    destinationCrowd,
    routeLoading,
    routeNotice,
    transportContext,
    loadRoutes,
    updateOrigin,
    setActiveRouteId,
    routeSort,
    setRouteSort,
    transportMode,
    setTransportMode,
    selectedTransportDataset,
    setSelectedTransportDataset,
    sortedRouteAlternatives,
    activeRoute,
    selectedDataset,
    activeTransportMode,
  } = route;
  const {
    pointPicker,
    setPointPicker,
    placeQuery,
    setPlaceQuery,
    placeSearchResults,
    placeSearchLoading,
    searchLocations,
    searchableToPlace,
  } = locationSearch;

  return <section className="navigation-section" id="navigation">
    <div className="workspace-heading" data-reveal>
      <div><span>04</span><h2>{t("navigationTitle", "통합 길찾기")}</h2></div>
      <p>시간 · 요금 · 환승 · 도보</p>
    </div>
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
        {!["bus-stop", "bus-arrival", "train", "korail-plan", "express", "intercity", "subway"].includes(selectedDataset.id) && <div className="transport-data-empty"><strong>{selectedDataset.state === "live" ? "현재 운행정보를 확인했습니다." : selectedDataset.state === "ready" ? "지역이나 노선을 선택해 주세요." : "제공기관 정보를 잠시 확인하고 있습니다."}</strong><span>도시·노선·정류소·터미널을 선택하면 자세한 운행정보가 표시됩니다.</span></div>}
        </>}
      </div>
    </section>}
    <div className="navigation-workspace" data-reveal>
      <div className="map-panel">
        <div className="map-toolbar"><button type="button" className={pointPicker === "origin" ? "point-active" : "point-button"} onClick={() => setPointPicker((value) => value === "origin" ? null : "origin")}><span>출발 · 눌러서 변경</span><strong>{originLabel}</strong></button><i>→</i><button type="button" className={pointPicker === "destination" ? "point-active" : "point-button"} onClick={() => setPointPicker((value) => value === "destination" ? null : "destination")}><span>도착 · 눌러서 변경</span><strong>{routeDestination?.name || activePlaces[0]?.name || "여행지 선택 전"}</strong></button><button type="button" className="recalculate-button" onClick={() => activePlaces[0] && void loadRoutes(routeDestination || activePlaces[0])} disabled={!activePlaces.length || routeLoading}>{routeLoading ? "경로 확인 중" : "다시 계산"}</button></div>
        {pointPicker && <section className="trip-point-picker" aria-label={pointPicker === "origin" ? "출발지 선택" : "도착지 선택"}>
          <header><div><small>{pointPicker === "origin" ? "START POINT" : "DESTINATION"}</small><strong>{pointPicker === "origin" ? "어디에서 출발할까요?" : "어디로 이동할까요?"}</strong></div><button type="button" onClick={() => setPointPicker(null)} aria-label="선택 창 닫기">×</button></header>
          <div className="trip-point-comparison"><article><small>W.A.V.E 기본 추천</small><strong>{pointPicker === "origin" ? departurePresets[0].name : activePlaces[0]?.name || "검색 후 추천"}</strong><span>{pointPicker === "origin" ? departurePresets[0].detail : activePlaces[0]?.summary || "조건에 맞는 여행지를 계산합니다."}</span></article><article className="selected"><small>내 선택</small><strong>{pointPicker === "origin" ? originLabel : routeDestination?.name || "아직 선택하지 않음"}</strong><span>{pointPicker === "origin" ? "선택한 위치에서 경로 재계산" : "선택 즉시 혼잡·교통정보 갱신"}</span></article></div>
          <form onSubmit={(event) => { event.preventDefault(); void searchLocations(); }}><input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="장소명·역·터미널·관광지를 직접 입력" aria-label="장소 검색" /><button type="submit" disabled={placeSearchLoading || placeQuery.trim().length < 2}>{placeSearchLoading ? "검색 중" : "검색"}</button></form>
          <div className="trip-point-list">
            {pointPicker === "origin" && departurePresets.map((item) => <button type="button" key={item.id} onClick={() => { updateOrigin(item.point, item.name); if (routeDestination || activePlaces[0]) void loadRoutes(routeDestination || activePlaces[0], item.point, false, item.name); setPointPicker(null); }}><i>S</i><span><strong>{item.name}</strong><small>{item.detail}</small></span></button>)}
            {activePlaces.slice(0, 8).map((place, index) => <button type="button" key={`${pointPicker}-${place.id}`} onClick={() => onChoosePoint(place)}><i>{index + 1}</i><span><strong>{place.name}</strong><small>{place.address || place.summary}</small></span>{index === 0 && <em>W.A.V.E 추천</em>}</button>)}
            {placeSearchResults.map((item) => <button type="button" key={`search-${item.id}`} onClick={() => onChoosePoint(searchableToPlace(item))}><i>⌕</i><span><strong>{item.name}</strong><small>{item.address || item.category}</small></span><em>직접 검색</em></button>)}
            {!placeSearchLoading && placeQuery && !placeSearchResults.length && <p>검색 버튼을 누르면 입력한 값으로 실제 장소를 찾습니다.</p>}
          </div>
        </section>}
        <RouteMap origin={origin} places={activePlaces.slice(0, 6)} route={activeRoute} crowd={routeDestination ? destinationCrowd : planCrowd} crowdPlaceId={(routeDestination || activePlaces[0])?.id} onOriginChange={(point, label) => {
          updateOrigin(point, label, label === "현재 위치");
          if (label !== "현재 위치" && (routeDestination || activePlaces[0])) void loadRoutes(routeDestination || activePlaces[0], point, false, label);
        }} onDestinationChange={onMapDestination} />
        <div className="map-legend"><span><i className="origin" /> 출발지</span><span><i className="destination" /> 추천 여행지</span><span><i className={activeRoute?.configured ? "real" : "preview"} /> {activeRoute?.configured ? "실제 이동 구간" : "직선 미리보기"}</span></div>
      </div>
      <aside className="route-compare-panel">
        <div className="sort-tabs" role="tablist" aria-label="경로 정렬 기준">
          {([['time', '가장 빠름'], ['fare', '가장 저렴함'], ['transfer', '환승 최소'], ['walk', '걷기 최소']] as const).map(([id, label]) => <button type="button" key={id} className={routeSort === id ? "active" : ""} onClick={() => setRouteSort(id)}>{label}</button>)}
        </div>
        <p className="route-notice" aria-live="polite"><span className={activeRoute?.configured ? "live-dot" : "ready-dot"} />{routeNotice}</p>
        <div className="route-options" aria-busy={routeLoading}>
          {routeLoading && [0, 1, 2].map((item) => <div className="route-option-skeleton" key={`route-skeleton-${item}`} aria-hidden="true"><i /><div><b /><span /></div><em /></div>)}
          {!routeLoading && !sortedRouteAlternatives.length && <div className="route-empty"><span>↗</span><h3>{routeAlternatives.length ? `${activeTransportMode.label} 운행정보를 위에서 확인하세요.` : "경로를 계산할 여행지를 선택하세요."}</h3><p>{routeAlternatives.length ? "TAGO·KORAIL은 운행 데이터를 제공하며, 문 앞까지의 통합 경로는 경로 엔진이 연결된 교통수단만 표시됩니다." : "관광지를 검색한 뒤 카드의 ‘이곳까지 길찾기’를 누르면 비교 결과가 표시됩니다."}</p></div>}
          {!routeLoading && sortedRouteAlternatives.map((item, index) => <button type="button" key={item.id} className={(activeRoute?.id === item.id ? "active " : "") + "route-option"} onClick={() => setActiveRouteId(item.id)}>
            <span className="route-option-rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.label}</strong><small>{routeModeLabel(item)}</small></div><dl><div><dt>시간</dt><dd>{item.totalTime || "—"}분</dd></div><div><dt>예상 요금</dt><dd>{item.payment !== null ? `${item.payment.toLocaleString()}원` : "정보 없음"}</dd></div><div><dt>환승</dt><dd>{item.configured ? `${item.transfers}회` : "—"}</dd></div><div><dt>도보</dt><dd>{item.configured ? `${item.totalWalk}m` : "—"}</dd></div></dl>
            {item.segments.length > 0 && <span className="segment-summary">{item.segments.slice(0, 4).map((segment) => segment.name).join(" → ")}</span>}
          </button>)}
        </div>
      </aside>
    </div>
  </section>;
}
