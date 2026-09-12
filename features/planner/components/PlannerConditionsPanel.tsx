"use client";
import LoadingState from "../../../components/LoadingState";

import { lazy, Suspense, useRef } from "react";
import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { PlannerStageView } from "../hooks/usePlannerStageView";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import PlannerThemeDates from "./PlannerThemeDates";
import { planFailureHeadings } from "../condition-copy";
import { regionNames } from "../../../lib/gyeongnam-region-names";

const PlannerDateCalendar = lazy(() => import("./PlannerDateCalendar"));

const PlannerRegionDiscovery = lazy(() => import("./PlannerRegionDiscovery"));
const PlannerAccessibilityProfiles = lazy(() => import("./PlannerAccessibilityProfiles"));
const PlannerAvailability = lazy(() => import("./PlannerAvailability"));

interface PlannerConditionsPanelProps {
  question: number;
  onQuestion: (question: number) => void;
  onItinerary: () => void;
  view: PlannerStageView;
  onGenerate: () => void | Promise<void>;
  onRegionChange: (region: string) => void;
  t: (key: string, fallback: string) => string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  route: ReturnType<typeof useRoutePlanning>;
  tripSelection: ReturnType<typeof useTripSelection>;
}

export default function PlannerConditionsPanel(props: PlannerConditionsPanelProps) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const heading = useRef<HTMLHeadingElement>(null);
  const { region, selected, themes, loading, planError } = props.planController;
  const question = Math.max(0, Math.min(3, props.question));
  const guided = props.view === "guided";
  const showAvailability = Boolean(region) && (!guided || question !== 3);
  function go(next: number) {
    if (next < 0 || next > 3) return;
    props.onQuestion(next);
    window.requestAnimationFrame(() => heading.current?.focus());
  }
  return <div className="journey-workspace-block journey-conditions" id="conditions" data-compact={guided}>
    {guided && <p className="condition-step-kicker">STEP {question === 1 ? "02" : "01"}<span>{en ? "Your trip, at your pace." : "준비도 우리의 속도로."}</span></p>}
    <h2 ref={heading} tabIndex={-1} className="condition-heading">{guided ? (en ? ["Where would you like to go?", "What facilities do you need?", "What would you like to do?", "When are you travelling?"] : ["경남, 어디부터 가볼까요?", "어떤 편의가 필요할까요?", "무엇을 하고 싶나요?", "언제 떠날까요?"])[question] : en ? "Your trip preferences" : "여행 조건 정하기"}</h2>
    <p className="reference-subtitle">{(en ? ["Choose a destination from its scenery.", "Choose the facilities you need to compare places.", "Choose your interests to find places for your trip.", "Select a start and end date for your trip."] : ["장소 이름을 외우지 않아도 풍경부터 고를 수 있어요.", "나에게 필요한 편의를 골라 여행지를 비교하세요.", "좋아하는 활동을 골라 나에게 맞는 여행을 찾아보세요.", "출발일과 도착일을 눌러 여행 기간을 선택하세요."])[question]}</p>
    {(!guided || question === 0) && <div className="travel-book-actions" style={{gridTemplateColumns:'1fr',margin:'16px 0'}}><Link href="/outings" onClick={()=>{try{sessionStorage.setItem('wave-outing-entry-v1',JSON.stringify({region,theme:props.planController.theme,profiles:selected,createdAt:Date.now()}));}catch{/* The outing page offers the same choices when storage is unavailable. */}}}>한두 곳만 가볍게, 짧은 나들이 →</Link></div>}
    <div className="condition-inputs" inert={!props.planController.criteriaReady || !props.tripSelection.storageReady} key={guided ? question : "overview"}>
      {(!guided || question === 0) && <Suspense fallback={<LoadingState>{en ? "Preparing destination choices…" : "여행 지역을 준비하고 있어요…"}</LoadingState>}><PlannerRegionDiscovery full={!guided} value={region} onChange={props.onRegionChange} onInterest={props.planController.setTheme} onFacilities={() => props.onQuestion(1)} /></Suspense>}
      {guided && question === 0 && <div className="condition-first-details"><details className="condition-date-disclosure"><summary><span>{en ? "Travel dates" : "여행 날짜"}</span><strong>{props.tripSelection.travelStart} {props.tripSelection.travelStart === props.tripSelection.travelEnd ? en ? " · Day trip" : " · 당일 여행" : `– ${props.tripSelection.travelEnd}`}</strong><b aria-hidden="true">⌄</b></summary><PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} part="dates" /></details><PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} part="themes" /></div>}
      {(!guided || question === 1) && <Suspense fallback={<LoadingState>{en ? "Preparing facility choices…" : "편의 선택 항목을 준비하고 있어요…"}</LoadingState>}><PlannerAccessibilityProfiles trip={props.tripSelection} t={props.t} planController={props.planController} /></Suspense>}
      {(!guided || question === 2) && <PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} part="themes" />}
      {(!guided || question === 3) && <Suspense fallback={<LoadingState>{en ? "Preparing calendar…" : "달력을 준비하고 있어요…"}</LoadingState>}><PlannerDateCalendar trip={props.tripSelection} region={region} onContinue={props.onItinerary} onPreferences={() => go(0)} /></Suspense>}
    </div>
    {showAvailability && <Suspense fallback={<LoadingState>{en ? "Preparing search results…" : "검색 결과를 준비하고 있어요…"}</LoadingState>}><PlannerAvailability en={en} region={region} selected={selected} themes={themes} /></Suspense>}
    {guided && planError && <p role="alert">{planFailureHeadings[planError][en ? 1 : 0]} {en ? "Your choices are kept. Please try again shortly." : "선택한 조건은 유지됩니다. 잠시 후 다시 찾아 주세요."}</p>}
    {question !== 3 && <div className="condition-actions reference-bottom-bar">
      <div><strong>{en ? regionNames[region] || "Gyeongnam trip" : region || "경남 전체"}</strong><small aria-live="polite">{selected.length ? en ? `${selected.length} facility needs kept` : `선택한 편의 ${selected.length}개 유지` : en ? "Facilities are optional" : "편의 조건은 필요한 경우에만 골라요"} · {themes.length ? en ? `${themes.length} interests` : `활동 ${themes.length}개` : en ? "All interests" : "모든 활동"}</small></div>
      {guided && question > 0 && <button type="button" className="secondary" onClick={() => go(question - 1)}>{en ? "Previous" : "이전"}</button>}
      {guided && question === 0 && <button type="button" className="secondary" onClick={() => go(1)}>{en ? "Choose facilities" : "필요한 편의 선택"}</button>}<button type="button" disabled={loading} aria-busy={loading || undefined} onClick={() => void props.onGenerate()}>{loading ? <><span className="button-loader" />{en ? "Finding places…" : "여행지 찾는 중…"}</> : en ? "Find places" : "여행지 둘러보기"} →</button>
    </div>}
    {(!guided || question === 1) && !selected.length && <p role="status">{en ? "You can continue without a facility filter." : "필요한 편의가 없다면 그대로 둘러보세요."}</p>}
    {(!guided || question === 2) && !themes.length && <p role="status">{en ? "Leave this blank to explore all interests." : "아직 못 정했다면 모든 활동을 함께 살펴볼게요."}</p>}
  </div>;
}
