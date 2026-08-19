import RouteMap from "../../../components/RouteMap";
import type { MapPlace } from "../../routing/types";
import { departurePresets } from "../constants";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, PlanData } from "../types";
import { routeModeLabel } from "../utils";

interface RouteMapWorkspaceProps {
  activePlaces: Place[];
  planCrowd: PlanData["crowd"];
  route: ReturnType<typeof useRoutePlanning>;
  locationSearch: ReturnType<typeof useLocationSearch>;
  onChoosePoint: (place: Place) => void;
  onMapDestination: (place: MapPlace) => void;
}

export default function RouteMapWorkspace({ activePlaces, planCrowd, route, locationSearch, onChoosePoint, onMapDestination }: RouteMapWorkspaceProps) {
  const {
    origin,
    originLabel,
    routeAlternatives,
    routeDestination,
    destinationCrowd,
    routeLoading,
    routeNotice,
    loadRoutes,
    updateOrigin,
    setActiveRouteId,
    routeSort,
    setRouteSort,
    sortedRouteAlternatives,
    activeRoute,
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

  return <div className="navigation-workspace" data-reveal>
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
  </div>;
}
