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
}

export default function PlannerConditionsPanel(props: PlannerConditionsPanelProps) {
  return <div className="journey-workspace-block journey-conditions" id="conditions">
    <div className="journey-subheading" data-reveal><div><span aria-hidden="true">1</span><h2>여행 조건 정하기</h2></div><p>출발지, 날짜, 테마와 필요한 편의를 고르세요.</p></div>
    <div className="planner-bento" data-reveal>
      <PlannerJourneyBasics t={props.t} activePlaces={props.activePlaces} planController={props.planController} route={props.route} />
      <PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} />
      <PlannerAccessibilityProfiles t={props.t} planController={props.planController} />
    </div>
  </div>;
}
