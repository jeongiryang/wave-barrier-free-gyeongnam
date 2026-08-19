/* eslint-disable @next/next/no-html-link-for-pages */

import GithubFooterLink from "../../../components/GithubFooterLink";
import HelpCenter from "../../../components/HelpCenter";
import { PreferenceControls } from "../../../components/SitePreferences";
import AccountMenu from "../../auth/components/AccountMenu";

export function PlannerHeader({ t, scrolled, hidden, savedCount }: {
  t: (key: string, fallback: string) => string;
  scrolled: boolean;
  hidden: boolean;
  savedCount: number;
}) {
  return <header className={`site-header ${scrolled ? "scrolled" : ""} ${hidden ? "hidden" : ""}`}>
    <a className="brand" href="/" aria-label="W.A.V.E 소개 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></a>
    <nav aria-label="주요 메뉴"><a href="#planner">{t("conditions", "여행 조건")}</a><a href="#navigation">{t("route", "길찾기")}</a><a href="#data">{t("evidence", "추천 근거")}</a><a href="/community">커뮤니티</a></nav>
    <div className="planner-header-actions"><HelpCenter /><PreferenceControls /><AccountMenu loginHref="/login?next=%2Fplanner" /><button className="header-action" type="button" onClick={() => document.getElementById("places")?.scrollIntoView({ behavior: "smooth" })}>여행 보관함 <b>{savedCount}</b><span aria-hidden="true">↗</span></button></div>
  </header>;
}

export function PlannerFooter() {
  return <footer className="simple-footer">
    <div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div>
    <div className="footer-notes"><p>누구나 원하는 곳으로, 경남 무장애 여행 길잡이</p><p className="trust-notice">2026 관광데이터 활용 공모전 ②-2 웹·앱 구현 부문 · 지정과제 1 출품용 독립 서비스이며 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다.</p></div>
    <div className="footer-meta"><p className="source">출처: ⓒ한국관광공사 · ⓒ한국관광콘텐츠랩</p><GithubFooterLink /></div>
  </footer>;
}
