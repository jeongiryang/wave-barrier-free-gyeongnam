import type { PlannerStageView } from "../hooks/usePlannerStageView";

interface PlannerJourneyModeToggleProps {
  view: PlannerStageView;
  onChange: (view: PlannerStageView) => void;
}

export default function PlannerJourneyModeToggle({ view, onChange }: PlannerJourneyModeToggleProps) {
  return <section className="journey-mode-toggle" aria-labelledby="journey-mode-title">
    <div>
      <strong id="journey-mode-title">어떻게 여행을 만들까요?</strong>
      <span>{view === "guided" ? "한 번에 한 가지 선택만 보여드려요." : "모든 정보와 도구를 한 화면에서 보여드려요."}</span>
    </div>
    <div role="group" aria-label="여행 설계 보기 방식">
      <button type="button" aria-pressed={view === "guided"} onClick={() => onChange("guided")}><i aria-hidden="true">1</i> 한 단계씩</button>
      <button type="button" aria-pressed={view === "overview"} onClick={() => onChange("overview")}><i aria-hidden="true">4</i> 전체 보기</button>
    </div>
  </section>;
}
