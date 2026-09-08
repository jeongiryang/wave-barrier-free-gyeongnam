import type { ReturnTypeOfUseJourneyProgress } from "../journey-progress-types";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { usePlanRequest } from "../hooks/usePlanRequest";

interface PlannerJourneyRailProps {
  journey: ReturnTypeOfUseJourneyProgress;
  interactive: boolean;
  selectedProfileCount: number;
  recommendedCount: number;
  requestState: ReturnType<typeof usePlanRequest>["requestState"];
  savedCount: number;
  routeDestinationName: string;
}

export default function PlannerJourneyRail({
  journey,
  interactive,
  selectedProfileCount,
  recommendedCount,
  requestState,
  savedCount,
  routeDestinationName,
}: PlannerJourneyRailProps) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const recommendationState = requestState === "loading" ? en ? "Loading" : "불러오는 중"
    : requestState === "error" ? en ? "Try again" : "다시 시도 필요"
      : requestState === "dirty" ? en ? "Search again" : "다시 검색 필요"
        : requestState === "empty" ? en ? "No matching places" : "조건에 맞는 장소 없음"
          : requestState === "success" ? en ? `${recommendedCount} places` : `${recommendedCount}곳`
            : en ? "Not searched" : "검색 전";
  return <aside className="journey-rail" aria-label={en ? "Trip planning progress" : "여행 계획 진행 상황"} aria-busy={!interactive}>
    <div className="journey-rail-inner">
      <header>
        <p>{en ? "YOUR TRIP" : "나의 여행 준비"}</p>
        <div><strong>{journey.completedCount}/4</strong><span>{en ? "steps complete" : "준비 단계 완료"}</span></div>
        <div className="journey-progress" role="progressbar" aria-label={en ? "Trip preparation progress" : "여행 준비 진행률"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={journey.progress}>
          <i style={{ width: `${journey.progress}%` }} />
        </div>
      </header>
      <nav aria-label={en ? "Trip planning steps" : "여행 계획 단계 이동"}>
        <ol>{journey.steps.map((step) => {
          const active = journey.activeStepId === step.id;
          return <li key={step.id}>
            <button
              type="button"
              disabled={!interactive || !step.available}
              className={step.complete ? "complete" : ""}
              data-active={active || undefined}
              aria-current={active ? "step" : undefined}
              onClick={() => journey.goToStep(step.id)}
            >
              <span aria-hidden="true">{step.complete ? "✓" : step.index}</span>
              <b>{step.label}</b>
              <small>{step.detail}</small>
              <i aria-hidden="true">{active ? en ? "Now" : "현재" : "→"}</i>
            </button>
          </li>;
        })}</ol>
      </nav>
      <dl className="journey-live-summary">
        <div><dt>{en ? "Facilities" : "편의 조건"}</dt><dd>{selectedProfileCount ? en ? selectedProfileCount : `${selectedProfileCount}개` : en ? "Not selected" : "선택 전"}</dd></div>
        <div><dt>{en ? "Recommendations" : "공식 추천"}</dt><dd><span role="status">{recommendationState}</span></dd></div>
        <div><dt>{en ? "Itinerary" : "내 일정"}</dt><dd>{savedCount ? en ? `${savedCount} places` : `${savedCount}곳` : en ? "Empty" : "비어 있음"}</dd></div>
        <div><dt>{en ? "Current route" : "현재 경로"}</dt><dd>{routeDestinationName || (en ? "Not checked" : "미확인")}</dd></div>
      </dl>
      <button className="journey-next-action" type="button" disabled={!interactive} onClick={() => journey.goToStep(journey.nextStep.id)}>
        <span>{en ? "Next step" : "다음 행동"}</span><strong>{journey.nextStep.label}</strong><i aria-hidden="true">↘</i>
      </button>
    </div>
  </aside>;
}
