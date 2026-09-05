"use client";

import { useEffect, useRef, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import GyeongnamRegionPicker from "../../../components/GyeongnamRegionPicker";
import type { PlannerStageView } from "../hooks/usePlannerStageView";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import PlannerAccessibilityProfiles from "./PlannerAccessibilityProfiles";
import PlannerThemeDates from "./PlannerThemeDates";

interface PlannerConditionsPanelProps {
  view: PlannerStageView;
  onGenerate: () => void | Promise<void>;
  t: (key: string, fallback: string) => string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  route: ReturnType<typeof useRoutePlanning>;
  tripSelection: ReturnType<typeof useTripSelection>;
}

export default function PlannerConditionsPanel(props: PlannerConditionsPanelProps) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const labels = en ? ["Region", "Facilities", "Interests"] : ["지역", "필요한 편의", "여행 취향"];
  const [requestedQuestion, setQuestion] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const { region, setRegion, selected, themes, loading, planError } = props.planController;
  const question = Math.min(requestedQuestion, !region ? 0 : !selected.length ? 1 : 2);
  const guided = props.view === "guided";
  useEffect(() => {
    const sync = () => {
      const value = Number(new URLSearchParams(window.location.search).get("question") || 0);
      setQuestion(Number.isInteger(value) && value >= 0 && value <= 2 ? value : 0);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function go(next: number) {
    if (next > 0 && !region || next > 1 && !selected.length) return;
    setQuestion(next);
    const url = new URL(window.location.href);
    url.searchParams.set("question", String(next));
    url.hash = "conditions";
    window.history.pushState(null, "", url);
    window.requestAnimationFrame(() => heading.current?.focus());
  }
  return <div className="journey-workspace-block journey-conditions" id="conditions">
    {guided && <nav className="condition-progress" aria-label={en ? "Trip questions" : "여행 조건 질문"}>{labels.map((label, index) => <button type="button" key={label} aria-current={question === index ? "step" : undefined} disabled={index > 0 && !region || index > 1 && !selected.length} onClick={() => go(index)}><span>{index + 1}</span>{label}</button>)}</nav>}
    <h2 ref={heading} tabIndex={-1} className="condition-heading">{guided ? (en ? ["Where would you like to go?", "What facilities do you need?", "What would you like to enjoy?"] : ["어디로 갈까요?", "어떤 편의가 필요할까요?", "무엇을 즐길까요?"])[question] : en ? "Your trip preferences" : "여행 조건 정하기"}</h2>
    <div className="condition-inputs">
      {(!guided || question === 0) && <GyeongnamRegionPicker value={region} onChange={setRegion} includeAll />}
      {(!guided || question === 1) && <PlannerAccessibilityProfiles t={props.t} planController={props.planController} />}
      {(!guided || question === 2) && <PlannerThemeDates t={props.t} planController={props.planController} tripSelection={props.tripSelection} part="themes" />}
    </div>
    <p className="condition-scope">{en ? "Choose dates when adding places to your itinerary. Dates affect forecasts and events, not facility matching." : "날짜는 장소를 고른 뒤 내 일정에서 정해요. 여행 날짜는 날씨·행사 조회에 반영되며, 편의시설 추천 조건은 아닙니다."}</p>
    {guided && planError && <p role="alert">{en ? "We couldn't load places. Your choices are kept. Check your connection and try again." : "여행지를 불러오지 못했어요. 선택한 조건은 유지됩니다. 연결을 확인하고 다시 찾아 주세요."}</p>}
    <div className="condition-actions">
      {guided && question > 0 && <button type="button" className="secondary" onClick={() => go(question - 1)}>{en ? "Previous" : "이전"}</button>}
      {guided && question < 2 ? <button type="button" disabled={!region || question === 1 && !selected.length} onClick={() => go(question + 1)}>{en ? "Continue" : "다음"} →</button> : <button type="button" disabled={!region || !themes.length || !selected.length || loading} onClick={() => void props.onGenerate()}>{loading ? en ? "Finding places…" : "여행지 찾는 중…" : en ? "Find places for my trip" : "내 조건에 맞는 여행지 찾기"} →</button>}
    </div>
    {question === 1 && !selected.length && <p role="status">{en ? "Select at least one facility to continue." : "필요한 편의를 하나 이상 선택해 주세요."}</p>}
  </div>;
}
