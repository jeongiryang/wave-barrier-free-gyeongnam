import { useSyncExternalStore } from "react";
import NightIcon from "../../../components/NightIcon";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place, WeatherData } from "../types";
import RecommendationCarousel from "./RecommendationCarousel";
import OfficialExploration from "./OfficialExploration";
import DirectPlaceSearch from "./DirectPlaceSearch";

type PlaceView = 'list' | 'grid';
const viewKey = 'wave-place-view-v1';
let temporaryView: PlaceView | null = null;
function readView(): PlaceView {
  if (temporaryView) return temporaryView;
  try { return localStorage.getItem(viewKey) === 'grid' ? 'grid' : 'list'; } catch { return 'list'; }
}
function subscribeView(notify: () => void) {
  const stored = (event: StorageEvent) => { if (event.key === viewKey || event.key === null) notify(); };
  window.addEventListener('storage', stored);
  window.addEventListener(viewKey, notify);
  return () => { window.removeEventListener('storage', stored); window.removeEventListener(viewKey, notify); };
}
const serverView = (): PlaceView => 'list';

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
  const view = useSyncExternalStore(subscribeView, readView, serverView);
  const en = useSitePreferences().locale === 'en';
  function changeView(next: PlaceView) {
    try { localStorage.setItem(viewKey, next); temporaryView = null; } catch { temporaryView = next; }
    window.dispatchEvent(new Event(viewKey));
  }
  return <div className="journey-workspace-block places-section" id="places" data-place-view={view}>
    <header className="places-results-heading"><h2>{en ? "Explore travel destinations" : "여행지 찾아보기"}</h2><div className="simple-view-switch" role="group" aria-label={en ? 'Place view' : '여행지 보기 형식'}>
      <button type="button" data-icon-action="" title={en ? 'List' : '목록형'} aria-label={en ? 'List' : '목록형'} aria-pressed={view === 'list'} onClick={() => changeView('list')}><NightIcon name="list" size={20}/></button>
      <button type="button" data-icon-action="" title={en ? 'Grid' : '격자형'} aria-label={en ? 'Grid' : '격자형'} aria-pressed={view === 'grid'} onClick={() => changeView('grid')}><NightIcon name="grid" size={20}/></button>
    </div></header>
    <DirectPlaceSearch officialPlaces={props.activePlaces} profiles={props.planController.selected} onPlace={props.onSelectPlace} region={props.region} trip={props.tripSelection} onRegionSelect={props.onRegionSelect} onBuildItinerary={props.onBuildItinerary} />

    <RecommendationCarousel {...props} />
    <OfficialExploration trip={props.tripSelection} plan={props.planController.plan} current={props.planController.resultCurrent} profiles={props.planController.selected} onPlace={props.onSelectPlace} />
    {props.tripSelection.saved.length > 0 && <div lang="ko" className="simple-journey-guidance" aria-label="담은 장소로 이어가기"><p>담은 장소 {props.tripSelection.saved.length}곳</p><button type="button" onClick={props.onBuildItinerary}>{props.tripSelection.travelStart ? '내 일정 보기' : '날짜 정하기'}</button></div>}
  </div>;
}
