"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import GithubFooterLink from "../../../components/GithubFooterLink";
import { useSharedTrip } from "../hooks/useSharedTrip";
import SharedTripItinerary from "./SharedTripItinerary";
import { SharedTripHero, SharedTripPlaces } from "./SharedTripSummary";

export default function SharedTripScreen() {
  const { trip, error, scheduledDates, retry } = useSharedTrip();
  return <main className="shared-trip-page">
    <header className="shared-header"><a className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></a><a href="/planner">내 여행 새로 만들기 ↗</a></header>
    {!trip && !error && <section className="shared-loading" role="status" aria-live="polite"><span aria-hidden="true" /><p><b>공유된 여행 계획을 불러오고 있습니다.</b><small>저장 당시 조건으로 최신 공식 관광정보를 다시 확인합니다.</small></p></section>}
    {error && <section className="shared-error" role="alert"><p className="section-kicker">SHARED TRIP</p><h1>이 여행 계획을 열 수 없습니다.</h1><p>{error}</p><div className="shared-error-actions"><button type="button" onClick={retry}>다시 시도</button><a href="/planner">새 여행 만들기 →</a></div></section>}
    {trip && <><SharedTripHero trip={trip} /><section className="shared-content"><SharedTripPlaces trip={trip} /><SharedTripItinerary trip={trip} scheduledDates={scheduledDates} /></section></>}
    <footer className="simple-footer shared-footer"><div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div><div className="footer-notes"><p>누구나 원하는 곳으로, 경남 무장애 여행 길잡이</p><p className="trust-notice">공유 여행은 저장한 조건으로 최신 공식 관광정보를 다시 확인합니다.</p></div><div className="footer-meta"><GithubFooterLink /></div></footer>
  </main>;
}
