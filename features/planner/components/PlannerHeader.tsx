"use client";

import Link from "next/link";
import { PreferenceControls, useSitePreferences } from "../../../components/SitePreferences";
import HelpCenter from "../../../components/HelpCenter";
import PlannerJourneyRail from "./PlannerJourneyRail";
import AccountMenu from "../../auth/components/AccountMenu";
import type { JourneyStepId } from "../hooks/useJourneyProgress";

const chapters = ["지역", "필요한 편의", "활동", "여행지", "날짜", "일정", "전체보기"];

export default function PlannerReferenceChrome({ region, dates, facilities, savedCount, activeStep, question, available, onQuestion, onNavigate, onSearch, searching, progress, requestState, recommendedCount }: {
  progress: number; requestState: string; recommendedCount: number;
  region: string; dates: string; facilities: string; savedCount: number;
  activeStep: JourneyStepId; question: number; available: boolean[];
  onQuestion: (question: number) => void; onNavigate: (step: JourneyStepId) => void;
  onSearch: () => void; searching: boolean;
}) {
  const en = useSitePreferences().locale === "en";
  const labels = en ? ["Region", "Facilities", "Activities", "Places", "Dates", "Itinerary", "Overview"] : chapters;
  const current = activeStep === "conditions" ? question === 3 ? 4 : question : activeStep === "places" ? 3 : activeStep === "itinerary" ? 5 : 6;
  function navigate(index: number) {
    if (index < 3) onQuestion(index);
    else if (index === 4) onQuestion(3);
    else onNavigate(index === 3 ? "places" : index === 5 ? "itinerary" : "departure-readiness");
  }
  return <>
    <header className="reference-header">
      <Link className="reference-brand" href="/" aria-label="W.A.V.E 소개 홈"><span aria-hidden="true"><i /><i /><i /></span>W.A.V.E</Link>
      <nav aria-label={en ? "Main menu" : "주요 메뉴"}>
        <button type="button" aria-current={current < 4 ? "page" : undefined} onClick={() => onQuestion(0)}>{en ? "Places" : "여행지"}</button>
        <button type="button" aria-current={current >= 4 ? "page" : undefined} disabled={!savedCount} onClick={() => onNavigate("itinerary")}>{en ? "Plan a trip" : "여행 계획"}</button>
        <Link href="/travel-book">{en ? "Saved trips" : "저장한 일정"}</Link>
      </nav>
      <div className="reference-account"><HelpCenter iconOnly /><PreferenceControls /><AccountMenu loginHref="/login?next=%2Fplanner" /><button className="reference-saved header-action" type="button" disabled={!savedCount} onClick={() => onNavigate("itinerary")}>{en ? "Itinerary" : "내 일정"} <b>{savedCount}</b></button></div>
    </header>
    <PlannerJourneyRail labels={labels} current={current} available={available} onNavigate={navigate} />
    <div className="sr-only reference-completion" role="progressbar" aria-label={en ? "Trip preparation progress" : "여행 준비 진행률"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} />
    <div className="journey-live-summary sr-only"><span role="status">{requestState === "loading" ? en ? "Loading" : "불러오는 중" : requestState === "error" ? en ? "Try again" : "다시 시도 필요" : requestState === "dirty" ? en ? "Search again" : "다시 검색 필요" : requestState === "empty" ? en ? "No matching places" : "조건에 맞는 장소 없음" : requestState === "success" ? en ? `${recommendedCount} places` : `${recommendedCount}곳` : en ? "Not searched" : "검색 전"}</span></div>
    <div className="reference-search" role="group" aria-label="여행 검색 조건">
      <button type="button" onClick={() => onQuestion(0)}><small>어디로</small><strong>{region || "지역 선택"}</strong></button>
      <button type="button" onClick={() => onQuestion(3)}><small>언제</small><strong>{dates || "날짜 선택"}</strong></button>
      <button type="button" onClick={() => onQuestion(1)}><small>필요한 편의</small><strong>{facilities || "편의 선택"}</strong></button>
      <button className="reference-search-submit" type="button" aria-label="선택한 조건으로 여행지 찾기" disabled={!available[3] || searching} aria-busy={searching} onClick={onSearch}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></button>
    </div>
    <p className="reference-stage-count" aria-live="polite">{current + 1} / 7 {labels[current]}</p>
  </>;
}
