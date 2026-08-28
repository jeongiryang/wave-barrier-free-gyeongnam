import type { RouteAlternative } from "../../routing/types";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";

const MODE_ORDER = ["walk", "bicycle", "transit", "car"] as const;
type JourneyMode = typeof MODE_ORDER[number];

const MODE_META: Record<JourneyMode, { label: string; detail: string; kakaoMode: "walk" | "bicycle" | "traffic" | "car" }> = {
  walk: { label: "도보", detail: "보행 경로", kakaoMode: "walk" },
  bicycle: { label: "자전거", detail: "자전거 경로", kakaoMode: "bicycle" },
  transit: { label: "대중교통", detail: "지하철 · 기차 · 버스", kakaoMode: "traffic" },
  car: { label: "자동차", detail: "도로 교통 경로", kakaoMode: "car" },
};

function bestAlternative(mode: JourneyMode, alternatives: RouteAlternative[]) {
  const matches = alternatives.filter((item) => {
    if (!item.configured) return false;
    if (mode === "transit") return item.mode === "transit" || item.mode === "train" || item.mode === "bus";
    return item.mode === mode;
  });
  return matches.sort((a, b) => a.totalTime - b.totalTime)[0] ?? null;
}

function kakaoRouteHref(mode: JourneyMode, route: ReturnType<typeof useRoutePlanning>) {
  const destination = route.routeDestination;
  const endLat = Number(destination?.mapY);
  const endLng = Number(destination?.mapX);
  if (!destination || !Number.isFinite(endLat) || !Number.isFinite(endLng)) return "";
  const startName = encodeURIComponent(route.originLabel || "출발지");
  const endName = encodeURIComponent(destination.name || "도착지");
  const kakaoMode = MODE_META[mode].kakaoMode;
  return `https://map.kakao.com/link/by/${kakaoMode}/${startName},${route.origin.lat},${route.origin.lng}/${endName},${endLat},${endLng}`;
}

export default function RouteComparisonPanel({ route }: { route: ReturnType<typeof useRoutePlanning> }) {
  const {
    routeAlternatives, routeLoading, routeNotice, setActiveRouteId, activeRoute,
  } = route;

  const modes = MODE_ORDER.map((mode, order) => ({
    mode,
    order,
    alternative: bestAlternative(mode, routeAlternatives),
    href: kakaoRouteHref(mode, route),
  })).sort((a, b) => {
    const aTime = a.alternative?.totalTime ?? Number.POSITIVE_INFINITY;
    const bTime = b.alternative?.totalTime ?? Number.POSITIVE_INFINITY;
    return aTime - bTime || a.order - b.order;
  });

  return <aside className="route-compare-panel">
    <div className="route-mode-heading">
      <div><small>이동수단 비교</small><h3>확인된 예상 시간이 짧은 순서예요.</h3></div>
      <span>실제 API 응답만 시간으로 표시</span>
    </div>
    <p className="route-notice" aria-live="polite"><span className={activeRoute?.configured ? "live-dot" : "ready-dot"} />{routeNotice}</p>
    <div className="route-mode-options" aria-busy={routeLoading}>
      {routeLoading && MODE_ORDER.map((mode) => <div className="route-mode-card route-option-skeleton" key={`route-skeleton-${mode}`} aria-hidden="true"><i /><div><b /><span /></div><em /></div>)}
      {!routeLoading && modes.map(({ mode, alternative, href }, index) => {
        const meta = MODE_META[mode];
        const live = Boolean(alternative);
        return <article className={`route-mode-card${alternative && activeRoute?.id === alternative.id ? " active" : ""}`} key={mode}>
          <header><span className="route-option-rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{meta.label}</strong><small>{meta.detail}</small></div><b className={live ? "route-time-live" : "route-time-pending"}>{live ? `${alternative!.totalTime}분` : "카카오맵 확인"}</b></header>
          {live ? <>
            <dl><div><dt>예상 시간</dt><dd>{alternative!.totalTime}분</dd></div><div><dt>예상 요금</dt><dd>{alternative!.payment !== null ? `${alternative!.payment.toLocaleString()}원` : "정보 없음"}</dd></div><div><dt>환승</dt><dd>{mode === "transit" ? `${alternative!.transfers}회` : "해당 없음"}</dd></div><div><dt>제공</dt><dd>{alternative!.provider || "연결 API"}</dd></div></dl>
            {alternative!.segments.length > 0 && <span className="segment-summary">{alternative!.segments.slice(0, 4).map((segment) => segment.name).join(" → ")}</span>}
            <div className="route-mode-actions"><button type="button" onClick={() => setActiveRouteId(alternative!.id)}>지도에 경로 표시</button>{href && <a href={href} target="_blank" rel="noreferrer">카카오맵에서 열기 ↗</a>}</div>
          </> : <>
            <p>현재 W.A.V.E에 이 수단의 문 앞까지 경로 시간을 제공하는 API가 연결되지 않았습니다. 시간을 임의로 계산하지 않고 카카오맵의 해당 이동수단 화면으로 이어갑니다.</p>
            <div className="route-mode-actions">{href ? <a className="route-mode-primary-link" href={href} target="_blank" rel="noreferrer">{meta.label} 길찾기 열기 ↗</a> : <span>먼저 도착 여행지를 선택해 주세요.</span>}</div>
          </>}
        </article>;
      })}
    </div>
  </aside>;
}
