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
  return <section className="landing-cta" data-cinematic="horizon" data-land-reveal>
    <div className="closing-horizon" aria-hidden="true" />
    <span className="closing-eyebrow">{en ? "YOUR NEXT DAY IN GYEONGNAM" : "이제, 당신의 경남을 만날 차례"}</span>
    <h2>{t("planningCtaTitle", "여행지부터 일정까지,")}<br /><em>{t("planningCtaEm", "차근차근 만들 수 있어요.")}</em></h2>
    <Link href="/planner">{en ? "Plan my trip" : "여행 계획하기"} <span aria-hidden="true">↗</span></Link>
  </section>;
}

export function LandingFooter({ t }: { t: LandingTranslate }) {
  const en = useSitePreferences().locale === "en";
  return <footer className="simple-footer"><div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div><div className="footer-notes"><p>{t("footer", "누구나 원하는 곳으로, 경남 무장애 여행 길잡이")}</p><p className="trust-notice">{en ? "W.A.V.E is independently operated, not an official service of KTO or Gyeongsangnam-do. Check current information with the operator before departure." : "W.A.V.E는 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다. 출발 전 운영기관의 최신 정보를 확인해 주세요."}</p><PolicyFooterLinks /></div><div className="footer-meta"><p className="source">{en ? "Data: Korea Tourism Organization · Korea Tourism Content Lab" : "데이터 출처: 한국관광공사 · 한국관광콘텐츠랩"}</p><GithubFooterLink /><details className="landing-source-notes" id="journey-record-source"><summary>{en ? "Image and screen credits" : "사진·화면 출처"}</summary>
      <p>{en ? "Regional photography and facility records: ⓒKorea Tourism Organization. Photo credits are shown with each image." : "지역 사진과 편의정보: ⓒ한국관광공사. 사진별 작가는 해당 사진에 표기합니다."}</p>
      <p>{en ? "The intro, Hero coast, companions and closing harbor are W.A.V.E brand illustrations, not actual destination or accessibility records." : "인트로·Hero 해안, 동행자, 마지막 항구는 W.A.V.E 브랜드를 위해 제작한 일러스트이며 실제 관광지·시설 기록이 아닙니다."}</p>
      <p>{en ? "Korean product screens were recorded on 9 September 2026. Before/after itinerary and Kakao maps are from the same trip, 06:55–06:58 KST." : "한국어 제품 화면은 2026년 9월 9일 촬영했습니다. 일정·카카오 지도는 06:55–06:58 같은 여행에서 대산플라워랜드를 둘째 날로 옮긴 전후입니다."}</p>
      <p>{en ? "Daesan facility records retrieved at 02:26:57 KST; this is not the facility update date or an accessibility certification." : "대산플라워랜드 시설 자료 조회는 02:26:57이며 시설 갱신일이나 접근성 인증을 뜻하지 않습니다."}</p>
    </details></div></footer>;
}
