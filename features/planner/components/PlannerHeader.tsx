"use client";

import WaveHeader from "../../../components/WaveHeader";
import { useSitePreferences } from "../../../components/SitePreferences";
import PlannerJourneyRail from "./PlannerJourneyRail";
import type { JourneyStepId } from "../hooks/useJourneyProgress";

const chapters = ["여행 조건", "필요한 편의", "여행지·일정", "출발 전 확인"];

export default function PlannerReferenceChrome({ region, dates, facilities, activities, savedCount, activeStep, question, available, resultsAvailable, onQuestion, onNavigate, onSearch, searching, progress, requestState, recommendedCount }: {
  progress: number; requestState: string; recommendedCount: number;
  region: string; dates: string; facilities: string; activities: string; savedCount: number;
  activeStep: JourneyStepId; question: number; available: boolean[]; resultsAvailable: boolean;
  onQuestion: (question: number) => void; onNavigate: (step: JourneyStepId) => void;
  onSearch: () => void; searching: boolean;
}) {
  const en = useSitePreferences().locale === "en";
  const labels = en ? ["Trip preferences", "Facilities", "Places & itinerary", "Before departure"] : chapters;
  const current = activeStep === "conditions" ? question === 1 || question === 2 ? 1 : 0 : activeStep === "departure-readiness" ? 3 : 2;
  const chapterAvailability = [true, available[1], resultsAvailable || available[5], available[6]];
  function navigate(index: number) {
    if (index < 2) onQuestion(index);
    else onNavigate(index === 3 ? "departure-readiness" : resultsAvailable ? "places" : "itinerary");
  }
  return <>
    <WaveHeader current="planner" savedCount={savedCount} onSaved={savedCount ? () => onNavigate("itinerary") : undefined} />
    <div className="reference-intro"><p>{en ? "YOUR DAY, YOUR WAY" : "YOUR DAY, YOUR WAY"}</p><h1>{en ? "What kind of day would you like?" : "어떤 하루를 보내고 싶나요?"}</h1></div>
    <PlannerJourneyRail labels={labels} current={current} available={chapterAvailability} onNavigate={navigate} />
    <div className="sr-only reference-completion" role="progressbar" aria-label={en ? "Trip preparation progress" : "여행 준비 진행률"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} />
    <div className="journey-live-summary sr-only"><span role="status">{requestState === "loading" ? en ? "Loading" : "불러오는 중" : requestState === "error" ? en ? "Try again" : "다시 시도 필요" : requestState === "dirty" ? en ? "Search again" : "다시 검색 필요" : requestState === "empty" ? en ? "No matching places" : "조건에 맞는 장소 없음" : requestState === "success" ? en ? `${recommendedCount} places` : `${recommendedCount}곳` : en ? "Not searched" : "검색 전"}</span></div>
    <div className="reference-search" role="group" aria-label="여행 검색 조건">
      <div className="reference-search-sentence"><span>나는</span>
        <button type="button" onClick={() => onQuestion(0)}><small>여행 지역</small><strong>{region || "지역 선택"}</strong><span aria-hidden="true">⌄</span></button><span>에서</span>
        <button type="button" onClick={() => onQuestion(3)}><small>여행 날짜</small><strong>{dates || "날짜 선택"}</strong><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 2v6m10-6v6M3 11h18" /></svg></button><span>떠날래요.</span>
      </div>
      <button className="reference-facility-edit" type="button" onClick={() => onQuestion(1)}><small>필요한 편의</small><strong>{facilities || "나에게 맞게"}</strong><span aria-hidden="true">⌄</span></button>
      <div className="reference-search-bottom"><button className="reference-activity-edit" type="button" disabled={!available[2]} onClick={() => onQuestion(2)}><span>하고 싶은 활동</span><strong>{activities || "풍경부터 골라보세요"}</strong><span aria-hidden="true">↗</span></button>
        <button className="reference-search-submit" type="button" aria-label="선택한 조건으로 여행지 찾기" disabled={!available[3] || searching} aria-busy={searching} onClick={onSearch}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><span>{searching ? "찾는 중…" : "여행지 찾기"}</span></button>
      </div>
    </div>
    <div className="reference-workspace-heading"><p className="reference-stage-count" aria-live="polite">{current + 1} / 4 {labels[current]}</p><div className="reference-journey-views" role="group" aria-label={en ? "Places and itinerary" : "여행지와 일정 전환"}><button type="button" disabled={!resultsAvailable} aria-pressed={activeStep === "places"} onClick={() => onNavigate("places")}>{en ? "Places" : "여행지 보기"}</button><button type="button" disabled={!available[5]} aria-pressed={activeStep === "itinerary"} onClick={() => onNavigate("itinerary")}>{en ? "Itinerary" : "일정 편집"}<b>{savedCount}</b></button></div></div>
  </>;
}
