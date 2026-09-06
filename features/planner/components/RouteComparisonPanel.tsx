import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import { routeModeLabel } from "../utils";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";
import { routeTitle } from "../route-copy";

const englishModes = {
  walk: ["Walking", "Travel on foot"], bicycle: ["Cycling", "Travel by bicycle"],
  transit: ["Public transport", "Metro · rail · bus"], car: ["Car", "Driving routes"],
};

/** 경로 이름이 이미 말하는 것을 다시 적지 않는다. 덧붙일 게 없으면 비운다. */
function modeNote(route: Parameters<typeof routeModeLabel>[0], english: boolean) {
  const note = routeModeLabel(route, english);
  return routeTitle(route, english).includes(note) ? "" : note;
}

/** 구간이 하나뿐이고 이름이 경로 제목과 같으면 같은 말을 반복하는 것이다. */
function segmentSummary(route: { label: string; segments: Array<{ name: string }> }) {
  const names = route.segments.slice(0, 4).map((segment) => segment.name).filter(Boolean);
  if (!names.length) return "";
  const summary = names.join(" → ");
  return names.length === 1 && route.label.includes(names[0]) ? "" : summary;
}

function paymentDetails(route: { payment: number | null; paymentType?: "fare" | "toll" }, english: boolean) {
  const label = route.paymentType === "toll" ? (english ? "Toll" : "통행료") : (english ? "Estimated fare" : "예상 요금");
  if (route.paymentType === "toll" && route.payment === 0) return { label, value: english ? "No toll" : "통행료 없음" };
  if (route.payment === null || route.payment <= 0) return { label, value: english ? "Not provided" : "제공기관 미제공" };
  return { label, value: english ? `KRW ${route.payment.toLocaleString("en-US")}` : `${route.payment.toLocaleString("ko-KR")}원` };
}

export default function RouteComparisonPanel({ route }: { route: ReturnType<typeof useRoutePlanning> }) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
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
  const selectedLabel = selectedSummary ? (english ? englishModes[selectedSummary.id][0] : selectedSummary.label) : (english ? "this travel mode" : "선택한 이동수단");
  const hasOriginalNames = configuredRoutes.some((item) => originalLanguage(routeTitle(item, english)) || originalLanguage(segmentSummary(item)));

  return <aside className="route-compare-panel">
    {/*
      탭 목록이 아니라 선택 버튼 묶음이다. 이 목록은 예상 시간이 도착하면 빠른
      순서로 다시 정렬된다(바로 아래 안내 문구). 탭 목록은 화살표로 옆 탭에 가는
      것이 표준인데, 고르는 순간 순서가 바뀌면 옆이 어디인지 말할 수 없다.
    */}
    <div className="route-mode-sections" role="group" aria-label={english ? "Estimated time by travel mode" : "이동수단별 예상 시간"}>
      {routeModeSummaries.map((mode, index) => <button
        type="button"
        aria-pressed={routeTravelMode === mode.id}
        key={mode.id}
        className={routeTravelMode === mode.id ? "active" : ""}
        onClick={() => setRouteTravelMode(mode.id)}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div><b>{english ? englishModes[mode.id][0] : mode.label}</b><small>{english ? englishModes[mode.id][1] : mode.description}</small></div>
        <strong className={mode.minutes !== null ? "" : "route-mode-unknown"}>{mode.minutes !== null ? `${mode.minutes}${english ? " min" : "분"}` : (english ? "Time unavailable" : "시간 정보 없음")}</strong>
      </button>)}
    </div>
    <p className="route-mode-order-note">{english ? "Modes with available estimated times appear first, fastest to slowest. Check missing times in Kakao Maps." : "확인된 예상 시간이 있는 이동수단부터 빠른 순서로 정렬합니다. 시간이 없으면 카카오맵에서 이어서 확인합니다."}</p>
    <p className="route-notice" aria-live="polite"><span className={activeRoute?.configured ? "live-dot" : "ready-dot"} />{routeNotice[locale]}{routeNotice.subject && <> <span lang={originalLanguage(routeNotice.subject)}>{routeNotice.subject}</span></>}</p>
    {english && hasOriginalNames && <p className="route-mode-order-note">Route and stop names may be shown in their original language.</p>}
    <div className="route-options" aria-busy={routeLoading}>
      {routeLoading && [0, 1, 2].map((item) => <div className="route-option-skeleton" key={`route-skeleton-${item}`} aria-hidden="true"><i /><div><b /><span /></div><em /></div>)}
      {!routeLoading && !routeDestination && <div className="route-empty"><span>↗</span><h3>{english ? "Choose a place to check routes." : "경로를 계산할 여행지를 선택하세요."}</h3><p>{english ? "Add a place to your itinerary, then check each journey leg. Times and routes appear only when available." : "장소를 일정에 추가한 뒤 이동 구간을 조회하세요. 확인된 이동수단만 시간과 경로를 표시합니다."}</p></div>}
      {!routeLoading && routeDestination && !configuredRoutes.length && <div className="route-empty route-kakao-fallback"><span>↗</span><h3>{english ? `No verified journey time for ${selectedLabel}.` : `${selectedLabel} 예상 시간을 확인하지 못했습니다.`}</h3><p>{english ? "We do not invent missing times. Open this destination in Kakao Maps to check a route for your travel mode." : "확인되지 않은 시간을 임의로 표시하지 않습니다. 카카오맵에서 도착지를 그대로 열어 해당 이동수단 경로를 확인하세요."}</p><a href={kakaoHref} target="_blank" rel="noreferrer">{english ? `Check ${selectedLabel} in Kakao Maps` : `카카오맵에서 ${selectedLabel} 확인`} <b>↗</b></a></div>}
      {!routeLoading && configuredRoutes.map((item, index) => { const payment = paymentDetails(item, english); const title = routeTitle(item, english); const note = modeNote(item, english); return <button type="button" key={item.id} className={(activeRoute?.id === item.id ? "active " : "") + "route-option"} aria-pressed={activeRoute?.id === item.id} onClick={() => setActiveRouteId(item.id)}>
        <span className="route-option-rank" aria-hidden="true">{activeRoute?.id === item.id ? "✓" : String(index + 1).padStart(2, "0")}</span><div><strong lang={originalLanguage(title)}>{title}</strong>{note && <small>{note}</small>}{item.provider === "ODsay" && <small className="route-provider-attribution">powered by www.ODsay.com</small>}</div><dl><div><dt>{english ? "Estimated time" : "예상 시간"}</dt><dd>{item.totalTime}{english ? " min" : "분"}</dd></div><div><dt>{payment.label}</dt><dd>{payment.value}</dd></div><div><dt>{english ? "Transfers" : "환승"}</dt><dd>{item.transfers}{english ? "" : "회"}</dd></div><div><dt>{english ? "Walking" : "도보"}</dt><dd>{`${item.totalWalk}${english ? " m" : "m"}`}</dd></div></dl>
        {segmentSummary(item) && <span className="segment-summary" lang={originalLanguage(segmentSummary(item))}>{segmentSummary(item)}</span>}
      </button>; })}
      {!routeLoading && configuredRoutes.length > 0 && <a className="route-kakao-secondary" href={kakaoHref} target="_blank" rel="noreferrer">{english ? "Also check the route in Kakao Maps" : "카카오맵에서도 경로 확인"} ↗</a>}
      {!routeLoading && routeAlternatives.length > 0 && !configuredRoutes.length && !routeDestination && <p className="sr-only">{english ? "Only a connection preview is available." : "현재 경로 데이터는 미리보기만 제공합니다."}</p>}
    </div>
  </aside>;
}
