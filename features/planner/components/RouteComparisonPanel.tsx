import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import { routeModeLabel } from "../utils";

export default function RouteComparisonPanel({ route }: { route: ReturnType<typeof useRoutePlanning> }) {
  const {
    routeAlternatives, routeLoading, routeNotice, setActiveRouteId,
    sortedRouteAlternatives, activeRoute, routeTravelMode, setRouteTravelMode,
    routeModeSummaries, routeDestination,
  } = route;
  const configuredRoutes = sortedRouteAlternatives.filter((item) => item.configured && item.totalTime > 0);
  const destinationLat = Number(routeDestination?.mapY);
  const destinationLng = Number(routeDestination?.mapX);
  const hasDestination = routeDestination && Number.isFinite(destinationLat) && Number.isFinite(destinationLng);
  const kakaoHref = hasDestination
    ? `https://map.kakao.com/link/to/${encodeURIComponent(routeDestination.name)},${destinationLat},${destinationLng}`
    : routeDestination
      ? `https://map.kakao.com/link/search/${encodeURIComponent(routeDestination.name)}`
      : "https://map.kakao.com/";
  const selectedSummary = routeModeSummaries.find((item) => item.id === routeTravelMode);

  return <aside className="route-compare-panel">
    <div className="route-mode-sections" role="tablist" aria-label="이동수단별 예상 시간">
      {routeModeSummaries.map((mode, index) => <button
        type="button"
        role="tab"
        aria-selected={routeTravelMode === mode.id}
        key={mode.id}
        className={routeTravelMode === mode.id ? "active" : ""}
        onClick={() => setRouteTravelMode(mode.id)}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div><b>{mode.label}</b><small>{mode.description}</small></div>
        <strong>{mode.minutes !== null ? `${mode.minutes}분` : "카카오 확인"}</strong>
      </button>)}
    </div>
    <p className="route-mode-order-note">실제 API 예상 시간이 있는 이동수단부터 빠른 순서로 정렬합니다. 시간이 없으면 카카오맵에서 이어서 확인합니다.</p>
    <p className="route-notice" aria-live="polite"><span className={activeRoute?.configured ? "live-dot" : "ready-dot"} />{routeNotice}</p>
    <div className="route-options" aria-busy={routeLoading}>
      {routeLoading && [0, 1, 2].map((item) => <div className="route-option-skeleton" key={`route-skeleton-${item}`} aria-hidden="true"><i /><div><b /><span /></div><em /></div>)}
      {!routeLoading && !routeDestination && <div className="route-empty"><span>↗</span><h3>경로를 계산할 여행지를 선택하세요.</h3><p>관광지 카드의 ‘이곳까지 길찾기’를 누르면 도보·자전거·대중교통·자동차를 시간순으로 비교합니다.</p></div>}
      {!routeLoading && routeDestination && !configuredRoutes.length && <div className="route-empty route-kakao-fallback"><span>↗</span><h3>{selectedSummary?.label || "선택한 이동수단"} 경로는 현재 API에서 직접 계산하지 못했습니다.</h3><p>없는 시간을 임의로 만들지 않습니다. 카카오맵에서 도착지를 그대로 열어 해당 이동수단 경로를 확인하세요.</p><a href={kakaoHref} target="_blank" rel="noreferrer">카카오맵에서 {selectedSummary?.label || "경로"} 확인 <b>↗</b></a></div>}
      {!routeLoading && configuredRoutes.map((item, index) => <button type="button" key={item.id} className={(activeRoute?.id === item.id ? "active " : "") + "route-option"} onClick={() => setActiveRouteId(item.id)}>
        <span className="route-option-rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.label}</strong><small>{routeModeLabel(item)}</small></div><dl><div><dt>예상 시간</dt><dd>{item.totalTime}분</dd></div><div><dt>예상 요금</dt><dd>{item.payment !== null ? `${item.payment.toLocaleString()}원` : "정보 없음"}</dd></div><div><dt>환승</dt><dd>{`${item.transfers}회`}</dd></div><div><dt>도보</dt><dd>{`${item.totalWalk}m`}</dd></div></dl>
        {item.segments.length > 0 && <span className="segment-summary">{item.segments.slice(0, 4).map((segment) => segment.name).join(" → ")}</span>}
      </button>)}
      {!routeLoading && configuredRoutes.length > 0 && <a className="route-kakao-secondary" href={kakaoHref} target="_blank" rel="noreferrer">카카오맵에서도 경로 확인 ↗</a>}
      {!routeLoading && routeAlternatives.length > 0 && !configuredRoutes.length && !routeDestination && <p className="sr-only">현재 경로 데이터는 미리보기만 제공합니다.</p>}
    </div>
  </aside>;
}
