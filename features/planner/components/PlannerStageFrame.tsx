import type { ReactNode } from "react";
import type { JourneyStep, JourneyStepId } from "../hooks/useJourneyProgress";
import type { PlannerStageView } from "../hooks/usePlannerStageView";

interface PlannerStageFrameProps {
  view: PlannerStageView;
  step: JourneyStep;
  steps: JourneyStep[];
  activeStepId: JourneyStepId;
  onStepChange: (id: JourneyStepId) => void;
  onShowOverview: () => void;
  children: ReactNode;
}

const questions: Record<JourneyStepId, { eyebrow: string; question: string; detail: string }> = {
  conditions: {
    eyebrow: "먼저 알려주세요",
    question: "어떤 여행이 편안할까요?",
    detail: "출발지·날짜·취향과 필요한 편의를 고르면 공식 정보에서 맞는 장소를 찾습니다.",
  },
  places: {
    eyebrow: "근거를 비교해 보세요",
    question: "왜 이 장소가 나에게 맞을까요?",
    detail: "공식 편의정보가 확인된 추천만 살펴보고 마음에 드는 곳을 일정에 담으세요.",
  },
  itinerary: {
    eyebrow: "움직임을 설계해 보세요",
    question: "어떤 순서로 움직이면 편할까요?",
    detail: "날짜와 순서를 정하고 실제 경로와 추정값을 구분해 이동 부담을 확인하세요.",
  },
  "departure-readiness": {
    eyebrow: "마지막으로 확인하세요",
    question: "지금 출발해도 괜찮을까요?",
    detail: "날씨·혼잡·교통·장소 근거의 최신 상태와 다시 확인할 항목을 한곳에서 점검하세요.",
  },
};

export default function PlannerStageFrame({
  view, step, steps, activeStepId, onStepChange, onShowOverview, children,
}: PlannerStageFrameProps) {
  const active = activeStepId === step.id;
  const previous = steps[step.index - 2];
  const next = steps[step.index];
  const prompt = questions[step.id];

  return <div
    className="journey-stage-panel"
    data-step={step.id}
    data-active={active || undefined}
    hidden={view === "guided" && !active}
  >
    {view === "guided" && <header className="guided-stage-prompt">
      <span><b>{String(step.index).padStart(2, "0")}</b> {prompt.eyebrow}</span>
      <h2>{prompt.question}</h2>
      <p>{prompt.detail}</p>
    </header>}
    {children}
    {view === "guided" && <footer className="guided-stage-actions" aria-label={`${step.label} 단계 이동`}>
      <div>
        <span>{step.complete ? "이 단계의 준비를 마쳤어요." : "선택 내용은 이 기기에서 바로 반영돼요."}</span>
        <button type="button" onClick={onShowOverview}>전체 정보 한눈에 보기</button>
      </div>
      <nav aria-label="이전 또는 다음 여행 단계">
        {previous && <button type="button" className="secondary" onClick={() => onStepChange(previous.id)}><span aria-hidden="true">←</span> 이전: {previous.label}</button>}
        {next && <button type="button" onClick={() => onStepChange(next.id)}>다음 질문: {next.label} <span aria-hidden="true">→</span></button>}
        {!next && <button type="button" onClick={onShowOverview}>완성된 여행 전체 보기 <span aria-hidden="true">↗</span></button>}
      </nav>
    </footer>}
  </div>;
}
