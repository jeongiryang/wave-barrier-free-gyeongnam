"use client";
import WaveSelect from "../../../components/WaveSelect";
import { lazy, Suspense, useCallback, useState } from "react";
const GyeongnamRegionPicker = lazy(() => import("../../../components/GyeongnamRegionPicker"));
import NightIcon from "../../../components/NightIcon";
import MobileDisclosure from "../../../components/MobileDisclosure";
import LoadingState from "../../../components/LoadingState";
import { FACILITIES } from "../../../lib/facility-selection.js";
import { regions, themes as activities } from "../constants";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { PlannerStageView } from "../hooks/usePlannerStageView";
import type { Place } from "../types";
const TravelComfortChoices = lazy(() => import("./TravelComfortChoices"));
const PlannerRegionDiscovery = lazy(() => import("./PlannerRegionDiscovery"));
const AccountPreferences = lazy(() => import("../../account-travel/AccountPreferences"));

type Props = {
  question: number; onQuestion: (question: number) => void; onItinerary: () => void; view: PlannerStageView;
  onGenerate: () => void | Promise<void>; onRegionChange: (region: string) => void;
  t: (key: string, fallback: string) => string; activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>; route: ReturnType<typeof useRoutePlanning>; tripSelection: ReturnType<typeof useTripSelection>;
};
function FacilityPicker({ plan, onClose }: { plan: Props["planController"]; onClose: () => void }) {
  const [draft, setDraft] = useState(plan.selected);
  const dialog = usePlaceDialogFocus(true, onClose);
  return <dialog ref={dialog} lang="ko" className="simple-dialog simple-facility-picker" aria-labelledby="facility-picker-title">
    <header><h2 id="facility-picker-title" tabIndex={-1}>필요한 편의</h2><button type="button" onClick={onClose} aria-label="편의 선택 닫기" data-icon-action="" title="닫기"><NightIcon name="close" size={20}/><span className="sr-only">닫기</span></button></header>
    <div className="simple-facility-picker-body"><p>필요한 시설만 선택해 주세요.</p>
    <fieldset className="simple-facility-grid"><legend className="sr-only">여행 편의 조건 선택</legend>{FACILITIES.map(item => <label key={item.key}><input type="checkbox" checked={draft.includes(item.key)} onChange={event => setDraft(current => event.target.checked ? [...current, item.key] : current.filter(key => key !== item.key))} /><span>{item.label}</span></label>)}</fieldset>
    <Suspense fallback={<LoadingState>동행 조건을 불러오고 있어요.</LoadingState>}><TravelComfortChoices selected={draft} onSelected={setDraft}/></Suspense>
    <details className="simple-saved-preferences"><summary>조건 저장·불러오기</summary><div><p>선택한 편의만 저장해요. 건강 상태나 장애 유형을 추론하지 않아요.</p>
      <button type="button" disabled={!draft.length} onClick={() => plan.saveTravelProfile(draft)}>이 기기에 조건 저장</button>
      <button type="button" disabled={!plan.savedProfile} onClick={() => { if (plan.savedProfile) setDraft(plan.savedProfile.selectedIds); }}>저장한 조건 불러오기</button>
      {plan.savedProfile && <button type="button" onClick={plan.deleteTravelProfile}>저장한 조건 삭제</button>}
      {plan.profileNotice && <p role="status">{plan.profileNotice}</p>}
      <Suspense fallback={<LoadingState>저장한 조건을 불러오고 있어요.</LoadingState>}><AccountPreferences selected={draft} onApply={setDraft} /></Suspense>
    </div></details>
    </div><footer><button type="button" onClick={() => setDraft([])} disabled={!draft.length} data-icon-action="" title="선택 해제"><NightIcon name="close" size={20}/><span className="sr-only">선택 해제</span></button><button type="button" className="primary" onClick={() => { plan.setSelected(draft); onClose(); }}>적용{draft.length ? ` · ${draft.length}개` : ""}</button></footer>
  </dialog>;
}
export default function PlannerConditionsPanel({ planController: plan, onRegionChange, tripSelection: trip, onGenerate, onItinerary }: Props) {
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const closeFacilities = useCallback(() => setFacilitiesOpen(false), []);
  const ready = plan.criteriaReady && trip.storageReady;
  const restoreRegionFocus = (control: HTMLSelectElement) => {
    window.requestAnimationFrame(() => {
      if (control.isConnected && (!document.activeElement || document.activeElement === document.body)) control.focus({ preventScroll: true });
    });
  };
  return <section lang="ko" className="simple-search-controls" id="conditions" aria-label="여행지 검색 조건" aria-busy={!ready}>
    {!ready && <LoadingState>여행 조건을 불러오고 있어요.</LoadingState>}
    <div className="night-planner-hero"><div className="night-planner-form"><h2>어디로 떠나볼까요?</h2><p className="night-planner-intro">지역과 필요한 편의를 골라주세요.</p>
    <div className="simple-search-bar" onChange={event => { if (event.target instanceof HTMLSelectElement) restoreRegionFocus(event.target); }}><label className="planner-region-field"><span>지역</span><WaveSelect aria-label="여행 지역" value={plan.region} disabled={!ready} onChange={event => onRegionChange(event.target.value)}><option value="" disabled>지역 선택</option>{regions.map(region => <option key={region}>{region}</option>)}</WaveSelect></label>
      <button type="button" className="simple-facility-trigger" onClick={() => setFacilitiesOpen(true)} disabled={!ready}>필요한 편의{plan.selected.length > 0 ? ` · ${plan.selected.length}개` : ""}</button>
      {/* Reserve the status row so an automatic response cannot move a theme during a pointer click. */}
      <span className="simple-searching" role={plan.loading ? "status" : undefined} aria-hidden={!plan.loading} style={{ visibility: plan.loading ? "visible" : "hidden" }}><span className="button-loader" />검색 중</span>
    </div>
    <div className="simple-activity-filter" role="group" aria-label="하고 싶은 활동">{activities.map(activity => <button type="button" key={activity.id} disabled={!ready} aria-pressed={plan.themes.includes(activity.id)} onClick={() => plan.toggleTheme(activity.id)}>{activity.label}</button>)}</div>
    <div className="night-planner-submit"><button className="primary" type="button" disabled={!ready || !plan.region || plan.loading} onClick={() => { void onGenerate(); }}>여행 플랜 추천하기 </button>{trip.orderedSavedPlaces.length > 0 && <button type="button" onClick={onItinerary}>담은 장소로 일정 보기</button>}</div>
    </div><MobileDisclosure title="지도에서 지역 고르기" className="night-planner-map-disclosure"><div className="night-planner-region-map" aria-label="경남 지도에서 지역 고르기" inert={!ready}><Suspense fallback={<LoadingState>경남 지도를 준비하고 있어요</LoadingState>}><GyeongnamRegionPicker value={plan.region} onChange={onRegionChange} includeAll night/></Suspense><p className="night-map-caption">경남,<br/>새로운 시선으로</p></div></MobileDisclosure></div>
    {!plan.region && <div className="simple-region-entry"><h2>경남, 모두의 여행지</h2><p>아름다운 자연과 따뜻한 사람이 있는, 누구나 즐길 수 있는 여행</p><Suspense fallback={<LoadingState>지역을 불러오고 있어요.</LoadingState>}><PlannerRegionDiscovery full value="" disabled={!ready} onChange={onRegionChange} onInterest={plan.setTheme} onFacilities={() => setFacilitiesOpen(true)} /></Suspense><button type="button" className="simple-text-link" disabled={!ready} onClick={() => onRegionChange("경남 전체")}>경남 전체 둘러보기 </button></div>}
    {facilitiesOpen && <FacilityPicker plan={plan} onClose={closeFacilities} />}
  </section>;
}
