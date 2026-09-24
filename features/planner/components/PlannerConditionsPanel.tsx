"use client";
import { lazy, Suspense, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import GyeongnamRegionPicker from "../../../components/GyeongnamRegionPicker";
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
import { useHydratedSession } from "../../auth/hooks/useHydratedSession";
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
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session, isPending } = useHydratedSession();
  const dialog = usePlaceDialogFocus(true, onClose);
  const requireAccount = (action: () => void) => {
    setError('');
    if (!session?.user?.id) { router.push('/login?next=%2Fplanner%23conditions'); return; }
    action();
  };
  return <dialog ref={dialog} lang="ko" className="simple-dialog simple-facility-picker" aria-labelledby="facility-picker-title">
    <header><h2 id="facility-picker-title" tabIndex={-1}>필요한 편의</h2><button type="button" onClick={onClose} aria-label="편의 선택 닫기">×</button></header>
    <div className="simple-facility-picker-body"><p>필요한 시설만 선택해 주세요.</p>
    <fieldset className="simple-facility-grid"><legend className="sr-only">여행 편의 조건 선택</legend>{FACILITIES.map(item => <label key={item.key}><input type="checkbox" checked={draft.includes(item.key)} onChange={event => setDraft(current => event.target.checked ? [...current, item.key] : current.filter(key => key !== item.key))} /><span>{item.label}</span></label>)}</fieldset>
    <details className="simple-saved-preferences"><summary>조건 저장·불러오기</summary><div><p>선택한 편의만 저장해요. 건강 상태나 장애 유형을 추론하지 않아요.</p>
      <button type="button" disabled={isPending} onClick={() => requireAccount(() => { if (!draft.length) { setError('저장할 편의 조건을 먼저 선택해 주세요.'); return; } plan.saveTravelProfile(draft); })}>이 기기에 조건 저장</button>
      <button type="button" disabled={isPending} onClick={() => requireAccount(() => { if (!plan.savedProfile) { setError('이 기기에 저장한 편의 조건이 없어요.'); return; } setDraft(plan.savedProfile.selectedIds); plan.announceProfileApplied(); })}>저장한 조건 불러오기</button>
      {plan.savedProfile && <button type="button" onClick={plan.deleteTravelProfile}>저장한 조건 삭제</button>}
      {plan.profileNotice && <p role="status">{plan.profileNotice}</p>}
      <Suspense fallback={<LoadingState>저장한 조건을 불러오고 있어요.</LoadingState>}><AccountPreferences selected={draft} onApply={setDraft} /></Suspense>
    </div></details>
    {error && <p role="alert">{error}</p>}
    </div><footer><button type="button" onClick={() => setDraft([])} disabled={!draft.length}>선택 해제</button><button type="button" className="primary" onClick={() => { plan.setSelected(draft); onClose(); }}>적용{draft.length ? ` · ${draft.length}개` : ""}</button></footer>
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
    <div className="night-planner-hero"><div className="night-planner-form"><p className="night-eyebrow">WAVE TRAVEL PLANNER</p><h2>당신만의<br/>여행을 설계하세요<span>.</span></h2><p className="night-planner-intro">가고 싶은 곳과 필요한 편의를 고르면<br/>나루가 여행의 다음 걸음을 함께합니다.</p>
    <ol className="night-planner-steps"><li data-active={!plan.region}><b>1</b>지역 선택</li><li data-active={Boolean(plan.region)}><b>2</b>테마 선택</li><li><b>3</b>경로 설정</li><li><b>4</b>추천 완료</li></ol>
    <div className="simple-search-bar" onChange={event => { if (event.target instanceof HTMLSelectElement) restoreRegionFocus(event.target); }}><label><span>지역</span><select aria-label="여행 지역" value={plan.region} disabled={!ready} onChange={event => onRegionChange(event.target.value)}><option value="" disabled>지역 선택</option>{regions.map(region => <option key={region}>{region}</option>)}</select></label>
      <button type="button" className="simple-facility-trigger" onClick={() => setFacilitiesOpen(true)} disabled={!ready}>필요한 편의{plan.selected.length > 0 ? ` · ${plan.selected.length}개` : ""}<span aria-hidden="true">⌄</span></button>
      {plan.loading && <span className="simple-searching" role="status"><span className="button-loader" />검색 중</span>}
    </div>
    <div className="simple-activity-filter" role="group" aria-label="하고 싶은 활동">{activities.map(activity => <button type="button" key={activity.id} disabled={!ready} aria-pressed={plan.themes.includes(activity.id)} onClick={() => plan.toggleTheme(activity.id)}>{activity.label}</button>)}</div>
    <div className="night-planner-submit"><button className="primary" type="button" disabled={!ready || !plan.region || plan.loading} onClick={() => { void onGenerate(); }}>여행 플랜 추천하기 <NightIcon name="arrow"/></button>{trip.orderedSavedPlaces.length > 0 && <button type="button" onClick={onItinerary}>담은 장소로 일정 보기 →</button>}</div>
    </div><MobileDisclosure title="지도에서 지역 고르기" className="night-planner-map-disclosure"><div className="night-planner-region-map" aria-label="경남 지도에서 지역 고르기" inert={!ready}><GyeongnamRegionPicker value={plan.region} onChange={onRegionChange} includeAll night showDecliningInfo={false}/><p className="night-map-caption">경남,<br/>새로운 시선으로</p></div></MobileDisclosure></div>
    {!plan.region && <div className="simple-region-entry"><h2>경남, 모두의 여행지</h2><p>아름다운 자연과 따뜻한 사람이 있는, 누구나 즐길 수 있는 여행</p><Suspense fallback={<LoadingState>지역을 불러오고 있어요.</LoadingState>}><PlannerRegionDiscovery full value="" disabled={!ready} onChange={onRegionChange} onInterest={plan.setTheme} onFacilities={() => setFacilitiesOpen(true)} /></Suspense><button type="button" className="simple-text-link" disabled={!ready} onClick={() => onRegionChange("경남 전체")}>경남 전체 둘러보기 <span aria-hidden="true">→</span></button></div>}
    {facilitiesOpen && <FacilityPicker plan={plan} onClose={closeFacilities} />}
  </section>;
}
