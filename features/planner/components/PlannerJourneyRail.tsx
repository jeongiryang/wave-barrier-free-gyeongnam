import type { ReturnTypeOfUseJourneyProgress } from "../journey-progress-types";

interface PlannerJourneyRailProps {
  journey: ReturnTypeOfUseJourneyProgress;
  interactive: boolean;
  selectedProfileCount: number;
  recommendedCount: number;
  savedCount: number;
  routeDestinationName: string;
}

export default function PlannerJourneyRail({
  journey,
  interactive,
  selectedProfileCount,
  recommendedCount,
  savedCount,
  routeDestinationName,
}: PlannerJourneyRailProps) {
  return <aside className="journey-rail" aria-label="여행 계획 진행 상황" aria-busy={!interactive}>
    <div className="journey-rail-inner">
      <header>
        <p>JOURNEY CONTROL</p>
        <div><strong>{journey.completedCount}/4</strong><span>준비 단계 완료</span></div>
        <div className="journey-progress" role="progressbar" aria-label="여행 준비 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={journey.progress}>
          <i style={{ width: `${journey.progress}%` }} />
        </div>
      </header>
      <nav aria-label="여행 계획 단계 이동">
        <ol>{journey.steps.map((step) => {
          const active = journey.activeStepId === step.id;
          return <li key={step.id}>
            <button
              type="button"
              disabled={!interactive}
              className={step.complete ? "complete" : ""}
              data-active={active || undefined}
              aria-current={active ? "step" : undefined}
              onClick={() => journey.goToStep(step.id)}
            >
              <span aria-hidden="true">{step.complete ? "✓" : step.index}</span>
              <b>{step.label}</b>
              <small>{step.detail}</small>
              <i aria-hidden="true">{active ? "현재" : "→"}</i>
            </button>
          </li>;
        })}</ol>
      </nav>
      <dl className="journey-live-summary">
        <div><dt>편의 조건</dt><dd>{selectedProfileCount ? `${selectedProfileCount}개` : "선택 전"}</dd></div>
        <div><dt>공식 추천</dt><dd>{recommendedCount ? `${recommendedCount}곳` : "불러오는 중"}</dd></div>
        <div><dt>이 기기 일정</dt><dd>{savedCount ? `${savedCount}곳` : "비어 있음"}</dd></div>
        <div><dt>현재 경로</dt><dd>{routeDestinationName || "미확인"}</dd></div>
      </dl>
      <button className="journey-next-action" type="button" disabled={!interactive} onClick={() => journey.goToStep(journey.nextStep.id)}>
        <span>다음 행동</span><strong>{journey.nextStep.label}</strong><i aria-hidden="true">↘</i>
      </button>
    </div>
  </aside>;
}
