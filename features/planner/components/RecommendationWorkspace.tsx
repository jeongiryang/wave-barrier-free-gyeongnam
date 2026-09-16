import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import RecommendationCarousel from "./RecommendationCarousel";
import DirectPlaceSearch from "./DirectPlaceSearch";

interface RecommendationWorkspaceProps {
  region: string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean, requestedTheme?: string) => void | Promise<void>;
  onSelectPlace: (place: Place) => void;
  onMore?: () => void | Promise<void>;
  onRegionSelect: (region: string) => void;
  onBuildItinerary: () => void;
}

export default function RecommendationWorkspace(props: RecommendationWorkspaceProps) {
  return <div className="journey-workspace-block places-section" id="places">
    <DirectPlaceSearch region={props.region} trip={props.tripSelection} onRegionSelect={props.onRegionSelect} onBuildItinerary={props.onBuildItinerary} />
    {!props.planController.plan && !props.planController.loading && <p className="simple-empty">나루가 당신에게 맞는 경남 여행을 함께 찾아드려요</p>}
    <RecommendationCarousel {...props} />
  </div>;
}
