import Link from "next/link";
import GithubFooterLink from "../../../components/GithubFooterLink";
import type { LandingTranslate } from "../content";

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
  return <section className="landing-cta" data-land-reveal>
    <p>내 조건부터 고르면</p><h2>{t("planningCtaTitle", "갈 수 있는 이유와")}<br /><em>{t("planningCtaEm", "이동 흐름이 선명해집니다.")}</em></h2><Link href="/planner">내 여행 설계하기 <span>↗</span></Link>
  </section>;
}

export function LandingFooter({ t }: { t: LandingTranslate }) {
  return <footer className="simple-footer"><div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div><div className="footer-notes"><p>{t("footer", "누구나 원하는 곳으로, 경남 무장애 여행 길잡이")}</p><p className="trust-notice">W.A.V.E는 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다. 출발 전 운영기관의 최신 정보를 확인해 주세요.</p></div><div className="footer-meta"><p className="source">데이터 출처: 한국관광공사 · 한국관광콘텐츠랩</p><GithubFooterLink /></div></footer>;
}
