import { useSyncExternalStore } from "react";
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
    <header className="places-results-heading"><div><h2>{en ? "Explore travel destinations" : "여행지 찾아보기"}</h2><p>{en ? "Search by place name or explore recommendations below." : "장소 이름으로 검색하거나 아래 추천 여행지를 살펴보세요."}</p></div><div className="simple-view-switch" role="group" aria-label={en ? 'Place view' : '여행지 보기 형식'}>
      <span>{en ? 'Results layout' : '여행지 표시 방식'}</span>
      <button type="button" aria-pressed={view === 'list'} onClick={() => changeView('list')}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 5h4v4H3zm0 10h4v4H3zM11 7h10M11 17h10" /></svg>{en ? 'List' : '목록형'}</button>
      <button type="button" aria-pressed={view === 'grid'} onClick={() => changeView('grid')}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" /></svg>{en ? 'Grid' : '격자형'}</button>
    </div></header>
    <DirectPlaceSearch officialPlaces={props.activePlaces} profiles={props.planController.selected} onPlace={props.onSelectPlace} region={props.region} trip={props.tripSelection} onRegionSelect={props.onRegionSelect} onBuildItinerary={props.onBuildItinerary} />

    <RecommendationCarousel {...props} />
    <OfficialExploration plan={props.planController.plan} current={props.planController.resultCurrent} />
    {props.tripSelection.saved.length > 0 && <div lang="ko" className="simple-journey-guidance" aria-label="담은 장소로 이어가기"><p>담은 장소 {props.tripSelection.saved.length}곳 · {props.tripSelection.travelStart ? '날짜·순서·이동을 내 일정에서 확인해요.' : '날짜와 출발지를 정하면 시간표로 이어져요.'}</p><button type="button" onClick={props.onBuildItinerary}>{props.tripSelection.travelStart ? '내 일정 보기' : '날짜 정하기'}</button></div>}
  </div>;
}
