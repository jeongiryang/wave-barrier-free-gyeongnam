"use client";

import { lazy, Suspense, useRef } from "react";
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
  const lastAvailableQuestion = !region ? 0 : !selected.length ? 1 : !themes.length ? 2 : 3;
  const question = props.question === 3 ? 3 : Math.min(props.question, lastAvailableQuestion);
  const guided = props.view === "guided";
  const showAvailability = Boolean(region) && (!guided || question !== 3);
  function go(next: number) {
    if (next > lastAvailableQuestion) return;
    props.onQuestion(next);
    window.requestAnimationFrame(() => heading.current?.focus());
  }
  return <div className="journey-workspace-block journey-conditions" id="conditions" data-compact={guided}>
    {guided && <p className="condition-step-kicker">STEP {question === 1 ? "02" : "01"}<span>{en ? "Your trip, at your pace." : "준비도 우리의 속도로."}</span></p>}
    <h2 ref={heading} tabIndex={-1} className="condition-heading">{guided ? (en ? ["Where would you like to go?", "What facilities do you need?", "What would you like to do?", "When are you travelling?"] : ["경남, 어디부터 가볼까요?", "어떤 편의가 필요할까요?", "무엇을 하고 싶나요?", "언제 떠날까요?"])[question] : en ? "Your trip preferences" : "여행 조건 정하기"}</h2>
    <p className="reference-subtitle">{(en ? ["Choose a destination from its scenery.", "Choose the facilities you need to compare places.", "Choose your interests to find places for your trip.", "Select a start and end date for your trip."] : ["장소 이름을 외우지 않아도 풍경부터 고를 수 있어요.", "나에게 필요한 편의를 골라 여행지를 비교하세요.", "좋아하는 활동을 골라 나에게 맞는 여행을 찾아보세요.", "출발일과 도착일을 눌러 여행 기간을 선택하세요."])[question]}</p>
    <div className="condition-inputs" inert={!props.planController.criteriaReady || !props.tripSelection.storageReady} key={guided ? question : "overview"}>
      {(!guided || question === 0) && <Suspense fallback={<p role="status">{en ? "Preparing destination choices…" : "여행 지역을 준비하고 있어요…"}</p>}><PlannerRegionDiscovery full={!guided} value={region} onChange={props.onRegionChange} onInterest={props.planController.setTheme} onFacilities={() => props.onQuestion(1)} /></Suspense>}
      {guided && question === 0 && <div className="condition-first-details"><details className="condition-date-disclosure"><summary><span>{en ? "Travel dates" : "여행 날짜"}</span><strong>{props.tripSelection.travelStart} {props.tripSelection.travelStart === props.tripSelection.travelEnd ? en ? " · Day trip" : " · 당일 여행" : `– ${props.tripSelection.travelEnd}`}</strong><b aria-hidden="true">⌄</b></summary><PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} part="dates" /></details><PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} part="themes" /></div>}
      {(!guided || question === 1) && <Suspense fallback={<p role="status">{en ? "Preparing facility choices…" : "편의 선택 항목을 준비하고 있어요…"}</p>}><PlannerAccessibilityProfiles trip={props.tripSelection} t={props.t} planController={props.planController} /></Suspense>}
      {(!guided || question === 2) && <PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} part="themes" />}
      {(!guided || question === 3) && <Suspense fallback={<p role="status">{en ? "Preparing calendar…" : "달력을 준비하고 있어요…"}</p>}><PlannerDateCalendar trip={props.tripSelection} region={region} onContinue={props.onItinerary} onPreferences={() => go(0)} /></Suspense>}
    </div>
    {showAvailability && <Suspense fallback={<p role="status">{en ? "Preparing search results…" : "검색 결과를 준비하고 있어요…"}</p>}><PlannerAvailability en={en} region={region} selected={selected} themes={themes} /></Suspense>}
    {guided && planError && <p role="alert">{planFailureHeadings[planError][en ? 1 : 0]} {en ? "Your choices are kept. Please try again shortly." : "선택한 조건은 유지됩니다. 잠시 후 다시 찾아 주세요."}</p>}
    {question !== 3 && <div className="condition-actions reference-bottom-bar">
      <div><strong>{en ? regionNames[region] || "Gyeongnam trip" : region || "경남 여행"}</strong><small aria-live="polite">{!region ? en ? "Choose a region and an activity" : "지역과 활동을 골라주세요" : !themes.length ? en ? "Choose an activity" : "하고 싶은 활동을 골라주세요" : selected.length ? en ? `${selected.length} facilities · ${themes.length} activities` : `편의 ${selected.length}개 · 활동 ${themes.length}개` : en ? `${themes.length} activities · facilities next` : `활동 ${themes.length}개 · 다음은 편의 선택`}</small></div>
      {guided && question > 0 && <button type="button" className="secondary" onClick={() => go(question - 1)}>{en ? "Previous" : "이전"}</button>}
      {guided && question === 0 ? <button type="button" disabled={!region || !themes.length} onClick={() => go(1)}>{en ? "Choose facilities" : "필요한 편의 고르기"} →</button> : guided && question === 1 && !themes.length ? <button type="button" disabled={!selected.length} onClick={() => go(2)}>{en ? "Choose activities" : "하고 싶은 활동 고르기"} →</button> : <button type="button" disabled={!region || !themes.length || !selected.length} aria-disabled={loading || undefined} aria-busy={loading || undefined} onClick={() => { if (!loading) void props.onGenerate(); }}>{loading ? en ? "Finding places…" : "여행지 찾는 중…" : en ? "Find places" : "여행지 찾기"} →</button>}
    </div>}
    {(!guided || question === 1) && !selected.length && <p role="status">{en ? "Select at least one facility to continue." : "필요한 편의를 하나 이상 선택해 주세요."}</p>}
    {(!guided || question === 2) && !themes.length && <p role="status">{en ? "Select at least one activity to continue." : "하고 싶은 활동을 하나 이상 선택해 주세요."}</p>}
  </div>;
}
