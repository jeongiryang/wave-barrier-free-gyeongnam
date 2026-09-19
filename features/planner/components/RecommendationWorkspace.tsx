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
    {!props.planController.plan && !props.planController.loading && <p className="simple-naru-intro">나루가 당신에게 맞는 경남 여행을 함께 찾아드려요</p>}
    <RecommendationCarousel {...props} />
    {props.tripSelection.saved.length > 0 && <div lang="ko" className="simple-result-notice" aria-label="담은 장소로 이어가기"><p>담은 장소 {props.tripSelection.saved.length}곳 · {props.tripSelection.travelStart ? '날짜·순서·이동을 내 일정에서 확인해요.' : '날짜와 출발지를 정하면 시간표로 이어져요.'}</p><button type="button" onClick={props.onBuildItinerary}>{props.tripSelection.travelStart ? '담은 장소의 일정 보기' : '담은 장소로 일정 정하기'}</button></div>}
  </div>;
}
