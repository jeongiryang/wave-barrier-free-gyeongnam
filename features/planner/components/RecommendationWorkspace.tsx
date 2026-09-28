import { useSitePreferences } from "../../../components/SitePreferences";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place, WeatherData } from "../types";
import RecommendationCarousel from "./RecommendationCarousel";
import OfficialExploration from "./OfficialExploration";
import DirectPlaceSearch from "./DirectPlaceSearch";

interface RecommendationWorkspaceProps {
  region: string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  tripSelection: ReturnType<typeof useTripSelection>;
  weather: WeatherData | null;
  weatherDate: string;
  onGenerate: (revealResults?: boolean, requestedTheme?: string) => void | Promise<void>;
  onSelectPlace: (place: Place) => void;
  onMore?: () => void | Promise<void>;
  onRegionSelect: (region: string) => void;
  onBuildItinerary: () => void;
}

export default function RecommendationWorkspace(props: RecommendationWorkspaceProps) {
  const en = useSitePreferences().locale === 'en';
  return <div className="journey-workspace-block places-section" id="places" data-place-view="grid">
    <header className="places-results-heading"><h2>{en ? "Explore travel destinations" : "여행지 찾아보기"}</h2></header>
    <DirectPlaceSearch officialPlaces={props.activePlaces} profiles={props.planController.selected} onPlace={props.onSelectPlace} region={props.region} trip={props.tripSelection} onRegionSelect={props.onRegionSelect} onBuildItinerary={props.onBuildItinerary} />

    <RecommendationCarousel {...props} />
    <OfficialExploration trip={props.tripSelection} plan={props.planController.plan} current={props.planController.resultCurrent} profiles={props.planController.selected} onPlace={props.onSelectPlace} />
    {props.tripSelection.saved.length > 0 && <div lang="ko" className="simple-journey-guidance" aria-label="담은 장소로 이어가기"><p>담은 장소 {props.tripSelection.saved.length}곳</p><button type="button" onClick={props.onBuildItinerary}>{props.tripSelection.travelStart ? '내 일정 보기' : '날짜 정하기'}</button></div>}
  </div>;
}
