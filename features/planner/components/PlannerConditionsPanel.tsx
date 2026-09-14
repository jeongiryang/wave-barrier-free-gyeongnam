"use client";
import { lazy, Suspense, useCallback, useState } from "react";
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
function FacilityPicker({ plan, trip, onClose }: { plan: Props["planController"]; trip: Props["tripSelection"]; onClose: () => void }) {
  const [draft, setDraft] = useState(plan.selected);
  const [comfort, setComfort] = useState(trip.comfort), [error, setError] = useState('');
  const dialog = usePlaceDialogFocus(true, onClose);
  return <dialog ref={dialog} lang="ko" className="simple-dialog simple-facility-picker" aria-labelledby="facility-picker-title">
    <header><h2 id="facility-picker-title" tabIndex={-1}>필요한 편의</h2><button type="button" onClick={onClose} aria-label="편의 선택 닫기">×</button></header>
    <p>필요한 시설만 선택해 주세요.</p>
    <fieldset className="simple-facility-grid"><legend className="sr-only">여행 편의 조건 선택</legend>{FACILITIES.map(item => <label key={item.key}><input type="checkbox" checked={draft.includes(item.key)} onChange={event => setDraft(current => event.target.checked ? [...current, item.key] : current.filter(key => key !== item.key))} /><span>{item.label}</span></label>)}</fieldset>
    <Suspense fallback={<LoadingState>동행 조건을 불러오고 있어요.</LoadingState>}><TravelComfortChoices selected={draft} comfort={comfort} onSelected={setDraft} onComfort={setComfort}/></Suspense>
    <details className="simple-saved-preferences"><summary>조건 저장·불러오기</summary><div><p>선택한 편의만 저장해요. 건강 상태나 장애 유형을 추론하지 않아요.</p>
      <button type="button" disabled={!draft.length} onClick={() => plan.saveTravelProfile(draft)}>이 기기에 조건 저장</button>
      <button type="button" disabled={!plan.savedProfile} onClick={() => { if (plan.savedProfile) setDraft(plan.savedProfile.selectedIds); }}>저장한 조건 불러오기</button>
      {plan.savedProfile && <button type="button" onClick={plan.deleteTravelProfile}>저장한 조건 삭제</button>}
      {plan.profileNotice && <p role="status">{plan.profileNotice}</p>}
      <Suspense fallback={<LoadingState>저장한 조건을 불러오고 있어요.</LoadingState>}><AccountPreferences selected={draft} onApply={setDraft} /></Suspense>
    </div></details>
    {error && <p role="alert">{error}</p>}
    <footer><button type="button" onClick={() => setDraft([])} disabled={!draft.length}>선택 해제</button><button type="button" className="primary" onClick={() => { if (JSON.stringify(comfort) !== JSON.stringify(trip.comfort)) { const result = trip.applyTripCommand({ type: 'comfort', value: comfort }); if (!result.ok) { setError(result.reason); return; } } plan.setSelected(draft); onClose(); }}>적용{draft.length ? ` · ${draft.length}개` : ""}</button></footer>
  </dialog>;
}
export default function PlannerConditionsPanel({ planController: plan, onRegionChange, tripSelection: trip }: Props) {
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const closeFacilities = useCallback(() => setFacilitiesOpen(false), []);
  const ready = plan.criteriaReady && trip.storageReady;
  const chooseRegion = (control: HTMLSelectElement) => {
    onRegionChange(control.value);
    window.requestAnimationFrame(() => {
      if (control.isConnected && (!document.activeElement || document.activeElement === document.body)) control.focus({ preventScroll: true });
    });
  };
  return <section lang="ko" className="simple-search-controls" id="conditions" aria-label="여행지 검색 조건" aria-busy={!ready}>
    {!ready && <LoadingState>여행 조건을 불러오고 있어요.</LoadingState>}
    <div className="simple-search-bar"><label><span>지역</span><select aria-label="여행 지역" value={plan.region} disabled={!ready} onChange={event => chooseRegion(event.currentTarget)}><option value="" disabled>지역 선택</option>{regions.map(region => <option key={region}>{region}</option>)}</select></label>
      <button type="button" className="simple-facility-trigger" onClick={() => setFacilitiesOpen(true)} disabled={!ready}>필요한 편의{plan.selected.length > 0 ? ` · ${plan.selected.length}개` : ""}<span aria-hidden="true">⌄</span></button>
      {plan.loading && <span className="simple-searching" role="status"><span className="button-loader" />검색 중</span>}
    </div>
    <div className="simple-activity-filter" role="group" aria-label="하고 싶은 활동">{activities.map(activity => <button type="button" key={activity.id} disabled={!ready} aria-pressed={plan.themes.includes(activity.id)} onClick={() => plan.toggleTheme(activity.id)}>{activity.label}</button>)}</div>
    {!plan.region && <div className="simple-region-entry"><h2>어디로 갈까요?</h2><Suspense fallback={<LoadingState>지역을 불러오고 있어요.</LoadingState>}><PlannerRegionDiscovery full value="" disabled={!ready} onChange={onRegionChange} onInterest={plan.setTheme} onFacilities={() => setFacilitiesOpen(true)} /></Suspense><button type="button" className="simple-text-link" disabled={!ready} onClick={() => onRegionChange("경남 전체")}>경남 전체 둘러보기 <span aria-hidden="true">→</span></button></div>}
    {facilitiesOpen && <FacilityPicker plan={plan} trip={trip} onClose={closeFacilities} />}
  </section>;
}
