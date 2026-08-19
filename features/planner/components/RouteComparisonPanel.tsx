import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import { routeModeLabel } from "../utils";

export default function RouteComparisonPanel({ route }: { route: ReturnType<typeof useRoutePlanning> }) {
  const {
    routeAlternatives, routeLoading, routeNotice, setActiveRouteId, routeSort,
    setRouteSort, sortedRouteAlternatives, activeRoute, activeTransportMode,
  } = route;

  return <aside className="route-compare-panel">
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
  </aside>;
}
