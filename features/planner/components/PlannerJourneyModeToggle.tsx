import type { PlannerStageView } from "../hooks/usePlannerStageView";
import { useSitePreferences } from "../../../components/SitePreferences";

interface PlannerJourneyModeToggleProps {
  view: PlannerStageView;
  interactive: boolean;
  onChange: (view: PlannerStageView) => void;
}

export default function PlannerJourneyModeToggle({ view, interactive, onChange }: PlannerJourneyModeToggleProps) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <section className="journey-mode-toggle" aria-labelledby="journey-mode-title" aria-busy={!interactive}>
    <div>
      <strong id="journey-mode-title">{en ? "How would you like to plan?" : "어떻게 여행을 만들까요?"}</strong>
      <span>{view === "guided" ? en ? "Make one choice at a time." : "한 번에 한 가지 선택만 보여드려요." : en ? "See all information and tools together." : "모든 정보와 도구를 한 화면에서 보여드려요."}</span>
    </div>
    <div role="group" aria-label={en ? "Planning view" : "여행 설계 보기 방식"}>
      <button type="button" disabled={!interactive} aria-pressed={view === "guided"} onClick={() => onChange("guided")}><i aria-hidden="true">1</i> {en ? "Step by step" : "한 단계씩"}</button>
      <button type="button" disabled={!interactive} aria-pressed={view === "overview"} onClick={() => onChange("overview")}><i aria-hidden="true">4</i> {en ? "Overview" : "전체 보기"}</button>
    </div>
  </section>;
}
