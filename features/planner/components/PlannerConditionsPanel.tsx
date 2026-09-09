"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { PlannerStageView } from "../hooks/usePlannerStageView";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import PlannerThemeDates from "./PlannerThemeDates";
import { planFailureHeadings } from "../condition-copy";

const PlannerRegionDiscovery = lazy(() => import("./PlannerRegionDiscovery"));
const PlannerAccessibilityProfiles = lazy(() => import("./PlannerAccessibilityProfiles"));

interface PlannerConditionsPanelProps {
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
  const labels = en ? ["Region", "Facilities", "Activities", "Dates"] : ["지역", "필요한 편의", "하고 싶은 활동", "날짜"];
  const [requestedQuestion, setQuestion] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const { region, selected, themes, loading, planError } = props.planController;
  const lastAvailableQuestion = !region ? 0 : !selected.length ? 1 : !themes.length ? 2 : 3;
  const question = Math.min(requestedQuestion, lastAvailableQuestion);
  const guided = props.view === "guided";
  useEffect(() => {
    const sync = () => {
      const value = Number(new URLSearchParams(window.location.search).get("question") || 0);
      setQuestion(Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function go(next: number) {
    if (next > lastAvailableQuestion) return;
    setQuestion(next);
    const url = new URL(window.location.href);
    url.searchParams.set("question", String(next));
    url.hash = "conditions";
    window.history.pushState(null, "", url);
    window.requestAnimationFrame(() => heading.current?.focus());
  }
  return <div className="journey-workspace-block journey-conditions" id="conditions">
    {guided && <nav className="condition-progress" aria-label={en ? "Trip questions" : "여행 조건 질문"}>{labels.map((label, index) => <button type="button" key={label} aria-current={question === index ? "step" : undefined} disabled={index > lastAvailableQuestion} onClick={() => go(index)}><span>{index + 1}</span>{label}</button>)}</nav>}
    <h2 ref={heading} tabIndex={-1} className="condition-heading">{guided ? (en ? ["Where would you like to go?", "What facilities do you need?", "What would you like to do?", "When are you travelling?"] : ["어디로 갈까요?", "어떤 편의가 필요할까요?", "무엇을 하고 싶나요?", "언제 떠날까요?"])[question] : en ? "Your trip preferences" : "여행 조건 정하기"}</h2>
    <div className="condition-inputs" key={guided ? question : "overview"}>
      {(!guided || question === 0) && <Suspense fallback={<p role="status">{en ? "Preparing destination choices…" : "여행 지역을 준비하고 있어요…"}</p>}><PlannerRegionDiscovery value={region} onChange={props.onRegionChange} /></Suspense>}
      {(!guided || question === 1) && <Suspense fallback={<p role="status">{en ? "Preparing facility choices…" : "편의 선택 항목을 준비하고 있어요…"}</p>}><PlannerAccessibilityProfiles t={props.t} planController={props.planController} /></Suspense>}
      {(!guided || question === 2) && <PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} part="themes" />}
      {(!guided || question === 3) && <PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} part="dates" />}
    </div>
    {(!guided || question === 3) && <p className="condition-scope">{en ? "Dates affect forecasts and events, not facility matching. You can change them later in My itinerary." : "여행 날짜는 날씨·행사 조회에 반영돼요. 편의시설 추천 조건은 아니며 내 일정에서 다시 바꿀 수 있어요."}</p>}
    {guided && planError && <p role="alert">{planFailureHeadings[planError][en ? 1 : 0]} {en ? "Your choices are kept. Please try again shortly." : "선택한 조건은 유지됩니다. 잠시 후 다시 찾아 주세요."}</p>}
    <div className="condition-actions">
      {guided && question > 0 && <button type="button" className="secondary" onClick={() => go(question - 1)}>{en ? "Previous" : "이전"}</button>}
      {guided && question < 3 ? <button type="button" disabled={question + 1 > lastAvailableQuestion} onClick={() => go(question + 1)}>{en ? "Continue" : "다음"} →</button> : <button type="button" disabled={!region || !themes.length || !selected.length} aria-disabled={loading || undefined} aria-busy={loading || undefined} onClick={() => { if (!loading) void props.onGenerate(); }}>{loading ? en ? "Finding places…" : "여행지 찾는 중…" : en ? "Find places" : "여행지 찾기"} →</button>}
    </div>
    {(!guided || question === 1) && !selected.length && <p role="status">{en ? "Select at least one facility to continue." : "필요한 편의를 하나 이상 선택해 주세요."}</p>}
    {(!guided || question === 2) && !themes.length && <p role="status">{en ? "Select at least one activity to continue." : "하고 싶은 활동을 하나 이상 선택해 주세요."}</p>}
  </div>;
}
