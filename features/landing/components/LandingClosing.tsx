import Link from "next/link";
import GithubFooterLink from "../../../components/GithubFooterLink";
import type { LandingTranslate } from "../content";

export function LandingEvidenceStory({ t }: { t: LandingTranslate }) {
  return <section className="evidence-story" id="evidence">
    <div data-land-reveal><p className="section-kicker">VISIBLE EVIDENCE</p><h2>{t("evidenceTitle", "추천의 이유와 한계까지 보여줍니다.")}</h2></div>
    <div className="evidence-stack">
      <article data-land-reveal><span>01</span><div><h3>{t("evidence1", "관광지와 사진")}</h3><p>{t("evidence1Copy", "한국관광공사 관광·사진 데이터를 지역과 장소 기준으로 교차 확인합니다.")}</p></div></article>
      <article data-land-reveal><span>02</span><div><h3>{t("evidence2", "접근성과 이동")}</h3><p>{t("evidence2Copy", "시설 편의정보와 도보·환승·시간·예상 요금을 서로 다른 지표로 비교합니다.")}</p></div></article>
      <article data-land-reveal><span>03</span><div><h3>{t("evidence3", "업데이트 시각")}</h3><p>{t("evidence3Copy", "공식 인증과 서비스 적합도를 구분하고 데이터 기준일과 신뢰도를 표시합니다.")}</p></div></article>
    </div>
  </section>;
}

export function LandingCallToAction({ t }: { t: LandingTranslate }) {
  return <section className="landing-cta" data-land-reveal>
    <p>여행 준비가 되셨나요?</p><h2>{t("ctaTitle", "소개는 여기까지.")}<br /><em>{t("ctaEm", "이제 실제 여행을 설계하세요.")}</em></h2><Link href="/planner">여행 계획 만들기 <span>↗</span></Link>
  </section>;
}

export function LandingFooter({ t }: { t: LandingTranslate }) {
  return <footer className="simple-footer"><div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div><div className="footer-notes"><p>{t("footer", "누구나 원하는 곳으로, 경남 무장애 여행 길잡이")}</p><p className="trust-notice">2026 관광데이터 활용 공모전 ②-2 웹·앱 구현 부문 · 지정과제 1 출품용 독립 서비스이며 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다.</p></div><div className="footer-meta"><p className="source">출처: ⓒ한국관광공사 · ⓒ한국관광콘텐츠랩</p><GithubFooterLink /></div></footer>;
}
