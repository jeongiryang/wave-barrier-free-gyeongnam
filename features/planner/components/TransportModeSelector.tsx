import { transportModes } from "../constants";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";

export default function TransportModeSelector({ route }: { route: ReturnType<typeof useRoutePlanning> }) {
  const { transportContext, transportMode, setTransportMode } = route;
  return <>
    {/*
      탭 목록이 아니라 필터다. 고른 값이 아래 한 패널이 아니라 예매 안내·운행정보
      패널·경로 목록 세 곳을 함께 바꾸므로 `aria-controls`로 가리킬 대상이 없다.
      게시판 필터와 같은 `role="group"` + `aria-pressed`로 맞춘다.
    */}
    <div className="transport-mode-filter" role="group" aria-label="교통수단별 결과 필터">
      {transportModes.map((mode) => <button type="button" aria-pressed={transportMode === mode.id} key={mode.id} className={transportMode === mode.id ? "active" : ""} onClick={() => setTransportMode(mode.id)}><b>{mode.label}</b><small>{mode.description}</small></button>)}
    </div>
    {transportContext && (transportContext.nearbyStops.length > 0 || transportContext.arrivals.length > 0 || transportContext.korail.length > 0) && <div className="transport-live-rail" aria-live="polite">
      <div><span>도착지 인근 정류장</span><strong>{transportContext.nearbyStops.slice(0, 3).map((item) => item.name).join(" · ") || "조회 중"}</strong></div>
      <div><span>버스 도착</span><strong>{transportContext.arrivals.slice(0, 3).map((item) => `${item.route} ${item.minutes ? `${item.minutes}분` : "운행 중"}`).join(" · ") || "도착 정보 없음"}</strong></div>
      <div><span>KORAIL 운행계획</span><strong>{transportContext.korail.length ? `${transportContext.korail.length}개 열차 응답` : "승인 상태 확인"}</strong></div>
    </div>}
  </>;
}
