import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import RecommendationCarousel from "./RecommendationCarousel";
import TripDayPlanner from "./TripDayPlanner";

interface RecommendationWorkspaceProps {
  t: (key: string, fallback: string) => string;
  region: string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  route: ReturnType<typeof useRoutePlanning>;
  tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
  onSelectPlace: (place: Place) => void;
}

export default function RecommendationWorkspace(props: RecommendationWorkspaceProps) {
  return <div className="journey-workspace-block places-section" id="places">
    <RecommendationCarousel {...props} />
    <TripDayPlanner tripSelection={props.tripSelection} route={props.route} />
  </div>;
}
