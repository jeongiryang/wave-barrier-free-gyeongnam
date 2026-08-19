import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import PlannerAccessibilityProfiles from "./PlannerAccessibilityProfiles";
import PlannerJourneyBasics from "./PlannerJourneyBasics";
import PlannerThemeDates from "./PlannerThemeDates";

interface PlannerConditionsPanelProps {
  t: (key: string, fallback: string) => string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  route: ReturnType<typeof useRoutePlanning>;
  tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
}

export default function PlannerConditionsPanel(props: PlannerConditionsPanelProps) {
  return <section className="planner-section" id="planner">
    <div className="workspace-heading" data-reveal><div><span>01</span><h2>여행 조건</h2></div><p>출발지 · 지역 · 테마 · 편의</p></div>
    <div className="planner-bento" data-reveal>
      <PlannerJourneyBasics t={props.t} activePlaces={props.activePlaces} planController={props.planController} route={props.route} />
      <PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} />
      <PlannerAccessibilityProfiles t={props.t} planController={props.planController} onGenerate={props.onGenerate} />
    </div>
  </section>;
}
