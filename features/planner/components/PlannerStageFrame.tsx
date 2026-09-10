import type { ReactNode } from "react";
import type { JourneyStep, JourneyStepId } from "../hooks/useJourneyProgress";
import type { PlannerStageView } from "../hooks/usePlannerStageView";
import { useSitePreferences } from "../../../components/SitePreferences";

interface PlannerStageFrameProps {
  view: PlannerStageView;
  step: JourneyStep;
  steps: JourneyStep[];
  activeStepId: JourneyStepId;
  interactive: boolean;
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
    question: "출발 전, 무엇을 확인할까요?",
    detail: "날씨·혼잡·교통·장소 근거의 최신 상태와 다시 확인할 항목을 한곳에서 점검하세요.",
  },
};

const englishQuestions: typeof questions = {
  conditions: { eyebrow: "Tell us your needs", question: "What makes a trip comfortable?", detail: "Choose a region, dates, activities and facilities to find places using official information." },
  places: { eyebrow: "Compare the evidence", question: "Why could this place suit you?", detail: "Check the available facility information, then add places to your itinerary." },
  itinerary: { eyebrow: "Plan your journey", question: "Which order works for you?", detail: "Set dates and order, then review routes and estimates separately." },
  "departure-readiness": { eyebrow: "Check before you leave", question: "What needs another check?", detail: "Review the latest weather, crowds, transport and place information, including anything still unconfirmed." },
};

export default function PlannerStageFrame({
  view, step, steps, activeStepId, interactive, onStepChange, onShowOverview, children,
}: PlannerStageFrameProps) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const active = activeStepId === step.id;
  const previous = steps[step.index - 2];
  const next = steps[step.index];
  const prompt = (en ? englishQuestions : questions)[step.id];
  const nextLockMessage = next?.id === "places"
    ? en ? "Choose a region, facilities and activities, then search for places." : "지역·필요한 편의·여행 취향을 고른 뒤 여행지를 찾아 주세요."
    : next?.id === "itinerary"
      ? en ? "Add at least one place to your itinerary." : "여행지를 한 곳 이상 일정에 추가해 주세요."
      : en ? "Review your itinerary dates, order and every travel leg." : "일정의 날짜·순서와 이동 구간을 확인해 주세요.";

  return <div
    className="journey-stage-panel"
    data-step={step.id}
    data-active={active || undefined}
    hidden={view === "guided" && !active}
  >
    {view === "guided" && step.id !== "conditions" && <header className="guided-stage-prompt">
      <span><b>{String(step.index).padStart(2, "0")}</b> {prompt.eyebrow}</span>
      <h2>{prompt.question}</h2>
      <p>{prompt.detail}</p>
    </header>}
    {children}
    {view === "guided" && step.id !== "conditions" && <footer className="guided-stage-actions" aria-label={en ? `${step.label} navigation` : `${step.label} 단계 이동`}>
      <div>
        <span>{step.complete ? en ? "This step is complete." : "이 단계의 준비를 마쳤어요." : en ? "Prepare your trip with your choices." : "선택한 조건으로 여행을 준비하세요."}</span>
        <button type="button" disabled={!interactive} onClick={onShowOverview}>{en ? "See all trip information" : "전체 정보 한눈에 보기"}</button>
      </div>
      <nav aria-label={en ? "Previous or next trip step" : "이전 또는 다음 여행 단계"}>
        {previous && <button type="button" className="secondary" disabled={!interactive} onClick={() => onStepChange(previous.id)}><span aria-hidden="true">←</span> {en ? "Previous" : "이전"}: {previous.label}</button>}
        {next && <><button type="button" disabled={!interactive || !next.available} aria-describedby={!next.available ? `locked-${step.id}` : undefined} onClick={() => onStepChange(next.id)}>{en ? "Next" : "다음"}: {next.label} <span aria-hidden="true">→</span></button>{!next.available && <small id={`locked-${step.id}`}>{nextLockMessage}</small>}</>}
        {!next && <button type="button" disabled={!interactive} onClick={onShowOverview}>{en ? "See your complete trip" : "완성된 여행 전체 보기"} <span aria-hidden="true">↗</span></button>}
      </nav>
    </footer>}
  </div>;
}
