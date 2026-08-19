import type { DestinationCrowd, WeatherData } from "../types";
import type { TripImpact } from "../view-model";

interface SituationImpactPanelProps {
  tripImpact: TripImpact;
  impactCrowd: DestinationCrowd | null;
  weather: WeatherData | null;
  weatherLoading: boolean;
  onImpactAction: (action: "culture" | "alternative") => void;
}

export default function SituationImpactPanel({
  tripImpact,
  impactCrowd,
  weather,
  weatherLoading,
  onImpactAction,
}: SituationImpactPanelProps) {
  const levelLabel = tripImpact.level === "critical"
    ? "변경 권장"
    : tripImpact.level === "warning"
      ? "대안 확인"
      : tripImpact.level === "watch" ? "준비 보완" : "일정 유지";

  return <section className={`impact-response ${tripImpact.level}`} data-reveal aria-labelledby="impact-response-title">
    <p className="sr-only" role="status" aria-live="polite">{tripImpact.headline}</p>
    <header>
      <div><small>상황 감지 → 일정 영향 → 대안</small><h3 id="impact-response-title">{tripImpact.headline}</h3></div>
      <span className={`impact-level ${tripImpact.level}`}><i />{levelLabel}</span>
    </header>
    <div className="impact-signal-grid">
      {tripImpact.signals.map((signal, index) => <article className={signal.level} key={signal.id}>
        <span><b>{String(index + 1).padStart(2, "0")}</b>{signal.label}</span>
        <strong>{signal.title}</strong>
        <p>{signal.detail}</p>
      </article>)}
      <article className="action-card">
        <span><b>{String(tripImpact.signals.length + 1).padStart(2, "0")}</b>지금 할 수 있는 일</span>
        <strong>{tripImpact.actions.length ? "조건을 유지하면서 대안을 바로 비교합니다." : "현재 일정과 이동 경로를 계속 확인하세요."}</strong>
        <div className="impact-actions">
          {tripImpact.actions.map((action) => <button type="button" key={action.id} onClick={() => onImpactAction(action.id as "culture" | "alternative")}>{action.label}<i aria-hidden="true">→</i></button>)}
          {!tripImpact.actions.length && <button type="button" onClick={() => document.getElementById("navigation")?.scrollIntoView({ behavior: "smooth" })}>이동 경로 확인<i aria-hidden="true">→</i></button>}
        </div>
      </article>
    </div>
    <footer>
      <span>날씨: {weather?.source || (weatherLoading ? "조회 중" : "조회 실패")}{weather?.updatedAt ? ` · ${new Date(weather.updatedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 조회` : ""}</span>
      <span>{impactCrowd ? `관광 집중률: 한국관광공사 예측값 · 기준 ${impactCrowd.baseYmd || "최신값"} · 정확한 실시간 방문자 수가 아닙니다.` : "관광 집중률: 조회하지 못함 · 추천 장소와 경로는 계속 이용할 수 있습니다."}</span>
    </footer>
  </section>;
}
