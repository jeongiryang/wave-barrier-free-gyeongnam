"use client";

import Link from "next/link";
import { PreferenceControls, useSitePreferences } from "../../../components/SitePreferences";
import HelpCenter from "../../../components/HelpCenter";
import PlannerJourneyRail from "./PlannerJourneyRail";
import AccountMenu from "../../auth/components/AccountMenu";
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
    <header className="reference-header">
      <Link className="reference-brand" href="/" aria-label="W.A.V.E 소개 홈"><span aria-hidden="true"><i /><i /><i /></span>W.A.V.E</Link>
      <nav aria-label={en ? "Main menu" : "주요 메뉴"}>
        <Link href="/">{en ? "About WAVE" : "서비스 소개"}</Link>
        <Link href="/planner" aria-current="page">{en ? "Plan a trip" : "여행 설계"}</Link>
        <Link href="/community">{en ? "Community" : "커뮤니티"}</Link>
        <Link href="/travel-book">{en ? "Saved trips" : "내 여행"}</Link>
      </nav>
      <div className="reference-account"><HelpCenter iconOnly /><PreferenceControls /><AccountMenu loginHref="/login?next=%2Fplanner" /><button className="reference-saved header-action" type="button" disabled={!savedCount} onClick={() => onNavigate("itinerary")}>{en ? "Itinerary" : "내 일정"} <b>{savedCount}</b></button></div>
    </header>
    <div className="reference-intro"><p>{en ? "YOUR DAY, YOUR WAY" : "내가 고르는 오늘의 풍경"}</p><h1>{en ? "What kind of day would you like?" : "어떤 하루를 보내고 싶나요?"}</h1></div>
    <PlannerJourneyRail labels={labels} current={current} available={chapterAvailability} onNavigate={navigate} />
    <div className="sr-only reference-completion" role="progressbar" aria-label={en ? "Trip preparation progress" : "여행 준비 진행률"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} />
    <div className="journey-live-summary sr-only"><span role="status">{requestState === "loading" ? en ? "Loading" : "불러오는 중" : requestState === "error" ? en ? "Try again" : "다시 시도 필요" : requestState === "dirty" ? en ? "Search again" : "다시 검색 필요" : requestState === "empty" ? en ? "No matching places" : "조건에 맞는 장소 없음" : requestState === "success" ? en ? `${recommendedCount} places` : `${recommendedCount}곳` : en ? "Not searched" : "검색 전"}</span></div>
    <div className="reference-search" role="group" aria-label="여행 검색 조건">
      <button type="button" onClick={() => onQuestion(0)}><small>어디로</small><strong>{region || "지역 선택"}</strong></button>
      <button type="button" onClick={() => onQuestion(3)}><small>언제</small><strong>{dates || "날짜 선택"}</strong></button>
      <button type="button" onClick={() => onQuestion(1)}><small>필요한 편의</small><strong>{facilities || "편의 선택"}</strong></button>
      <button className="reference-activity-edit" type="button" disabled={!available[2]} onClick={() => onQuestion(2)}><small>하고 싶은 활동</small><strong>{activities || "활동 선택"}</strong></button>
      <button className="reference-search-submit" type="button" aria-label="선택한 조건으로 여행지 찾기" disabled={!available[3] || searching} aria-busy={searching} onClick={onSearch}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></button>
    </div>
    <div className="reference-workspace-heading"><p className="reference-stage-count" aria-live="polite">{current + 1} / 4 {labels[current]}</p><div className="reference-journey-views" role="group" aria-label={en ? "Places and itinerary" : "여행지와 일정 전환"}><button type="button" disabled={!resultsAvailable} aria-pressed={activeStep === "places"} onClick={() => onNavigate("places")}>{en ? "Places" : "여행지 보기"}</button><button type="button" disabled={!available[5]} aria-pressed={activeStep === "itinerary"} onClick={() => onNavigate("itinerary")}>{en ? "Itinerary" : "일정 편집"}<b>{savedCount}</b></button></div></div>
  </>;
}
