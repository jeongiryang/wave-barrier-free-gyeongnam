import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import RecommendationCarousel from "./RecommendationCarousel";

interface RecommendationWorkspaceProps {
  region: string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
  onSelectPlace: (place: Place) => void;
}

export default function RecommendationWorkspace(props: RecommendationWorkspaceProps) {
  return <div className="journey-workspace-block places-section" id="places">
    <RecommendationCarousel {...props} />
  </div>;
}
