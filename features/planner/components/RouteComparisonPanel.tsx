import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import { routeModeLabel } from "../utils";

/** 경로 이름이 이미 말하는 것을 다시 적지 않는다. 덧붙일 게 없으면 비운다. */
function modeNote(route: Parameters<typeof routeModeLabel>[0]) {
  const note = routeModeLabel(route);
  return route.label.includes(note) ? "" : note;
}

/** 구간이 하나뿐이고 이름이 경로 제목과 같으면 같은 말을 반복하는 것이다. */
function segmentSummary(route: { label: string; segments: Array<{ name: string }> }) {
  const names = route.segments.slice(0, 4).map((segment) => segment.name).filter(Boolean);
  if (!names.length) return "";
  const summary = names.join(" → ");
  return names.length === 1 && route.label.includes(names[0]) ? "" : summary;
}

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
    {/*
      탭 목록이 아니라 선택 버튼 묶음이다. 이 목록은 예상 시간이 도착하면 빠른
      순서로 다시 정렬된다(바로 아래 안내 문구). 탭 목록은 화살표로 옆 탭에 가는
      것이 표준인데, 고르는 순간 순서가 바뀌면 옆이 어디인지 말할 수 없다.
    */}
    <div className="route-mode-sections" role="group" aria-label="이동수단별 예상 시간">
      {routeModeSummaries.map((mode, index) => <button
        type="button"
        aria-pressed={routeTravelMode === mode.id}
        key={mode.id}
        className={routeTravelMode === mode.id ? "active" : ""}
        onClick={() => setRouteTravelMode(mode.id)}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div><b>{mode.label}</b><small>{mode.description}</small></div>
        <strong className={mode.minutes !== null ? "" : "route-mode-unknown"}>{mode.minutes !== null ? `${mode.minutes}분` : "시간 정보 없음"}</strong>
      </button>)}
    </div>
    <p className="route-mode-order-note">실제 API 예상 시간이 있는 이동수단부터 빠른 순서로 정렬합니다. 시간이 없으면 카카오맵에서 이어서 확인합니다.</p>
    <p className="route-notice" aria-live="polite"><span className={activeRoute?.configured ? "live-dot" : "ready-dot"} />{routeNotice}</p>
    <div className="route-options" aria-busy={routeLoading}>
      {routeLoading && [0, 1, 2].map((item) => <div className="route-option-skeleton" key={`route-skeleton-${item}`} aria-hidden="true"><i /><div><b /><span /></div><em /></div>)}
      {!routeLoading && !routeDestination && <div className="route-empty"><span>↗</span><h3>경로를 계산할 여행지를 선택하세요.</h3><p>관광지 카드의 ‘이곳까지 길찾기’를 누르면 도보·자전거·대중교통·자동차를 시간순으로 비교합니다.</p></div>}
      {!routeLoading && routeDestination && !configuredRoutes.length && <div className="route-empty route-kakao-fallback"><span>↗</span><h3>{selectedSummary?.label || "선택한 이동수단"} 경로는 현재 API에서 직접 계산하지 못했습니다.</h3><p>없는 시간을 임의로 만들지 않습니다. 카카오맵에서 도착지를 그대로 열어 해당 이동수단 경로를 확인하세요.</p><a href={kakaoHref} target="_blank" rel="noreferrer">카카오맵에서 {selectedSummary?.label || "경로"} 확인 <b>↗</b></a></div>}
      {!routeLoading && configuredRoutes.map((item, index) => <button type="button" key={item.id} className={(activeRoute?.id === item.id ? "active " : "") + "route-option"} onClick={() => setActiveRouteId(item.id)}>
        <span className="route-option-rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.label}</strong>{modeNote(item) && <small>{modeNote(item)}</small>}</div><dl><div><dt>예상 시간</dt><dd>{item.totalTime}분</dd></div><div><dt>예상 요금</dt><dd>{item.payment !== null ? `${item.payment.toLocaleString()}원` : "정보 없음"}</dd></div><div><dt>환승</dt><dd>{`${item.transfers}회`}</dd></div><div><dt>도보</dt><dd>{`${item.totalWalk}m`}</dd></div></dl>
        {segmentSummary(item) && <span className="segment-summary">{segmentSummary(item)}</span>}
      </button>)}
      {!routeLoading && configuredRoutes.length > 0 && <a className="route-kakao-secondary" href={kakaoHref} target="_blank" rel="noreferrer">카카오맵에서도 경로 확인 ↗</a>}
      {!routeLoading && routeAlternatives.length > 0 && !configuredRoutes.length && !routeDestination && <p className="sr-only">현재 경로 데이터는 미리보기만 제공합니다.</p>}
    </div>
  </aside>;
}
