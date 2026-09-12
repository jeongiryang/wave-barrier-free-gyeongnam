"use client";
import WaveHeader from "../../../components/WaveHeader";
import PlannerJourneyRail from './PlannerJourneyRail';
import { useSitePreferences } from "../../../components/SitePreferences";
import type { JourneyStepId } from "../hooks/useJourneyProgress";
import type { PlannerStageView } from "../hooks/usePlannerStageView";

export default function PlannerReferenceChrome({ region, dates, facilities, activities, savedCount, activeStep, question, available, resultsAvailable, onQuestion, onNavigate, onSearch, searching, progress, requestState, recommendedCount, onAssistant, interactive }: {
  view: PlannerStageView; progress: number; requestState: string; recommendedCount: number;
  region: string; dates: string; facilities: string; activities: string; savedCount: number;
  activeStep: JourneyStepId; question: number; available: boolean[]; resultsAvailable: boolean;
  onQuestion: (question: number) => void; onNavigate: (step: JourneyStepId) => void;
  onSearch: () => void; searching: boolean; onAssistant?: () => void;
  interactive: boolean;
}) {
  const en = useSitePreferences().locale === "en";
  const items = [
    { label: en ? "Trip preferences" : "여행 조건", detail: en ? "Choose where to go" : region || "지역부터 선택", active: activeStep === "conditions" && question !== 1, enabled: true, action: () => onQuestion(0) },
    { label: en ? "Facilities" : "필요한 편의", detail: en ? "Facilities for your needs" : facilities || "내게 필요한 시설", active: activeStep === "conditions" && question === 1, enabled: true, action: () => onQuestion(1) },
    { label: en ? "Discover places" : "여행지 찾기", detail: en ? resultsAvailable ? `${recommendedCount} places to explore` : "Find a place you like" : resultsAvailable ? `${recommendedCount}곳 둘러보기` : "마음에 드는 장소 담기", active: activeStep === "places", enabled: resultsAvailable, action: () => onNavigate("places") },
    { label: en ? "My itinerary" : "나의 일정", detail: en ? savedCount ? `${savedCount} places · dates and order` : "Add a place to begin" : savedCount ? `${savedCount}곳 · 날짜와 순서` : "장소를 담으면 시작해요", active: activeStep === "itinerary", enabled: savedCount > 0, action: () => onNavigate("itinerary") },
    { label: en ? "Before departure" : "출발 전 확인", detail: en ? "Weather · travel · facilities" : "날씨 · 이동 · 편의", active: activeStep === "departure-readiness", enabled: savedCount > 0, action: () => onNavigate("departure-readiness") },
  ];
  return <>
    <WaveHeader current="planner" savedCount={savedCount} onSaved={savedCount ? () => onNavigate("itinerary") : undefined} />
    <div className="reference-intro"><div><p>YOUR DAY, YOUR WAY</p><h1>{en ? "Your trip, at your pace." : "우리의 속도로, 여행을 만들어요."}</h1></div><button type="button" className="planner-guide-entry" disabled={!interactive} onClick={onAssistant}><span aria-hidden="true">✦</span>{en ? "Ask Naru" : "나루와 대화로 계획하기"}</button></div>
    <aside className="planner-navigation" aria-label={en ? "Trip workspace navigation" : "여행 설계 메뉴"}>
      <p className="planner-nav-label">{en ? "YOUR WORKSPACE" : "나의 여행 설계"}</p>
      <PlannerJourneyRail en={en} labels={items.map(item => item.label)} details={items.map(item => item.detail)} current={items.findIndex(item => item.active)} available={items.map(item => interactive && item.enabled)} onNavigate={index => items[index].action()} />
      <div className="planner-nav-context" role="group" aria-label={en ? "Trip search preferences" : "여행 검색 조건"}>
        <button type="button" disabled={!interactive} onClick={() => onQuestion(0)}><small>{en ? "Region" : "지역"}</small><strong>{region || (en ? "Choose region" : "지역 선택")}</strong><span aria-hidden="true">↗</span></button>
        <button type="button" disabled={!interactive} onClick={() => onQuestion(3)}><small>{en ? "Dates" : "날짜"}</small><strong>{dates || (en ? "Choose dates" : "날짜 선택")}</strong><span aria-hidden="true">↗</span></button>
        <button type="button" disabled={!interactive} onClick={() => onQuestion(2)}><small>{en ? "Activities" : "활동"}</small><strong>{activities || (en ? "Choose activities" : "활동 선택")}</strong><span aria-hidden="true">↗</span></button>
        <button className="planner-nav-search" type="button" aria-label={en ? "Find places with these preferences" : "선택한 조건으로 여행지 찾기"} disabled={!interactive || !available[3] || searching} aria-busy={searching} onClick={onSearch}>{searching ? en ? "Finding places…" : "여행지 찾는 중…" : en ? "Find places" : "이 조건으로 여행지 찾기"}</button>
      </div>
      <p className="planner-nav-hint">{en ? "Your itinerary is kept on this device." : "담은 장소와 일정은 이 기기에 자동으로 보관돼요."}</p>
    </aside>
    <div className="sr-only reference-completion" role="progressbar" aria-label={en ? "Trip preparation progress" : "여행 준비 진행률"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} />
    <div className="journey-live-summary sr-only"><span role="status">{requestState === "loading" ? en ? "Loading" : "불러오는 중" : requestState === "error" ? en ? "Try again" : "다시 시도 필요" : requestState === "dirty" ? en ? "Search again" : "다시 검색 필요" : requestState === "empty" ? en ? "No matching places" : "조건에 맞는 장소 없음" : requestState === "success" ? en ? `${recommendedCount} places` : `${recommendedCount}곳` : en ? "Not searched" : "검색 전"}</span></div>
  </>;
}
