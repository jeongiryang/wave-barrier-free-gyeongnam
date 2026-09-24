import SiteFooter from "../../../components/SiteFooter";
import type { LandingTranslate } from "../content";
import { useSitePreferences } from "../../../components/SitePreferences";
import { brandMeaning } from "../content";

export function LandingEvidenceStory({ t }: { t: LandingTranslate }) {
  return <section className="evidence-story" id="evidence" aria-labelledby="data-principles-title">
    <div data-land-reveal><p className="section-kicker">데이터 원칙</p><h2 id="data-principles-title">{t("dataPrinciplesTitle", "추천의 근거와 확인 범위를 함께 보여줍니다.")}</h2></div>
    <div className="evidence-stack" role="list" aria-label="WAVE 데이터 원칙">
      <article role="listitem" data-land-reveal><span>01</span><div><h3>{t("officialEvidenceTitle", "공식 정보에서 확인한 항목")}</h3><p>{t("officialEvidenceCopy", "한국관광공사의 장소·사진·무장애 관광정보에서 확인된 내용을 장소별로 구분해 보여줍니다.")}</p></div></article>
      <article role="listitem" data-land-reveal><span>02</span><div><h3>{t("conditionFitTitle", "내 조건과 맞는 정도")}</h3><p>{t("conditionFitCopy", "선택한 이동·편의조건과 일치하는 항목을 설명하고, 정보가 없거나 확인되지 않은 부분도 함께 표시합니다.")}</p></div></article>
      <article role="listitem" data-land-reveal><span>03</span><div><h3>{t("checkedAtTitle", "확인한 기준 시각")}</h3><p>{t("checkedAtCopy", "교통·날씨처럼 달라질 수 있는 정보는 제공처와 조회 시각을 함께 표시합니다.")}</p></div></article>
    </div>
  </section>;
}

export function LandingCallToAction({}: { t: LandingTranslate }) {
  const en = useSitePreferences().locale === "en";
  return <section id="closing" tabIndex={-1} aria-labelledby="closing-title" className="landing-cta">
    <div className="landing-closing-copy" data-land-reveal>
    <div className="brand-meaning"><p>{brandMeaning.ko}</p><p lang="en">{brandMeaning.en}</p></div>
    <span className="closing-eyebrow">{en ? "YOUR NEXT HORIZON" : "이제, 당신의 경남을 만날 차례"}</span>
    <h2 id="closing-title">{en ? "See you at" : "다음 풍경에서"}<br /><em>{en ? "the next horizon." : "만나요"}</em></h2>
    <p>{en ? "Gyeongnam, at our own pace." : "경남, 우리의 속도로"}</p>
    </div>
  </section>;
}

export function LandingFooter({}: { t: LandingTranslate }) {
  return <SiteFooter />;
}
