import Link from "next/link";
import GithubFooterLink from "../../../components/GithubFooterLink";
import PolicyFooterLinks from "../../../components/PolicyFooterLinks";
import type { LandingTranslate } from "../content";
import { useSitePreferences } from "../../../components/SitePreferences";

export function LandingEvidenceStory({ t }: { t: LandingTranslate }) {
  return <section className="evidence-story" id="evidence" aria-labelledby="data-principles-title">
    <div data-land-reveal><p className="section-kicker">데이터 원칙</p><h2 id="data-principles-title">{t("dataPrinciplesTitle", "추천의 근거와 확인 범위를 함께 보여줍니다.")}</h2></div>
    <div className="evidence-stack" role="list" aria-label="W.A.V.E 데이터 원칙">
      <article role="listitem" data-land-reveal><span>01</span><div><h3>{t("officialEvidenceTitle", "공식 정보에서 확인한 항목")}</h3><p>{t("officialEvidenceCopy", "한국관광공사의 장소·사진·무장애 관광정보에서 확인된 내용을 장소별로 구분해 보여줍니다.")}</p></div></article>
      <article role="listitem" data-land-reveal><span>02</span><div><h3>{t("conditionFitTitle", "내 조건과 맞는 정도")}</h3><p>{t("conditionFitCopy", "선택한 이동·편의조건과 일치하는 항목을 설명하고, 정보가 없거나 확인되지 않은 부분도 함께 표시합니다.")}</p></div></article>
      <article role="listitem" data-land-reveal><span>03</span><div><h3>{t("checkedAtTitle", "확인한 기준 시각")}</h3><p>{t("checkedAtCopy", "교통·날씨처럼 달라질 수 있는 정보는 제공처와 조회 시각을 함께 표시합니다.")}</p></div></article>
    </div>
  </section>;
}

export function LandingCallToAction({ t }: { t: LandingTranslate }) {
  const en = useSitePreferences().locale === "en";
  return <section className="landing-cta" data-land-reveal>
    <div className="closing-horizon" aria-hidden="true" />
    <span className="closing-eyebrow">{en ? "A NEW DAY IN GYEONGNAM" : "이제, 당신의 경남을 만날 차례"}</span>
    <p>{en ? "Choose a region and the facilities you need" : "지역과 필요한 편의를 고르면"}</p><h2>{t("planningCtaTitle", "여행지부터 일정까지,")}<br /><em>{t("planningCtaEm", "차근차근 만들 수 있어요.")}</em></h2><Link href="/planner">{en ? "Plan my trip" : "여행 계획 만들기"} <span aria-hidden="true">↗</span></Link>
    <p className="landing-cta-evidence">
      {en ? "The photos and facility records in this example come from KTO. Recheck facilities and routes before visiting." : "이 시연의 사진과 편의정보는 한국관광공사 기록을 바탕으로 해요. 방문 전에는 시설과 경로를 다시 확인하세요."}<br />
      <a href="#journey-record-source" onClick={event => {
        const source = document.getElementById("journey-record-source");
        if (!(source instanceof HTMLDetailsElement)) return;
        event.preventDefault();
        source.open = true;
        const summary = source.querySelector("summary");
        summary?.focus({ preventScroll: true });
        summary?.scrollIntoView({ block: "center", behavior: "instant" });
      }}>{en ? "View this example's sources and retrieval time" : "시연 출처와 조회 시각 보기"}</a>
    </p>
    <small className="closing-source">{en ? "Imagined harbor scenery" : "상상으로 그린 항구 풍경"}</small>
  </section>;
}

export function LandingFooter({ t }: { t: LandingTranslate }) {
  const en = useSitePreferences().locale === "en";
  return <footer className="simple-footer"><div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div><div className="footer-notes"><p>{t("footer", "누구나 원하는 곳으로, 경남 무장애 여행 길잡이")}</p><p className="trust-notice">{en ? "W.A.V.E is independently operated, not an official service of KTO or Gyeongsangnam-do. Check current information with the operator before departure." : "W.A.V.E는 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다. 출발 전 운영기관의 최신 정보를 확인해 주세요."}</p><PolicyFooterLinks /></div><div className="footer-meta"><p className="source">{en ? "Data: Korea Tourism Organization · Korea Tourism Content Lab" : "데이터 출처: 한국관광공사 · 한국관광콘텐츠랩"}</p><GithubFooterLink /></div></footer>;
}
