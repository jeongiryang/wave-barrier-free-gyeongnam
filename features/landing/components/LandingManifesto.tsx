import { useSitePreferences } from "../../../components/SitePreferences";
import type { LandingTranslate } from "../content";
import LandingNeedsDemo from "./LandingNeedsDemo";

export default function LandingManifesto({ t }: { t: LandingTranslate }) {
  const en = useSitePreferences().locale === "en";
  return <section className="manifesto needs-chapter" data-cinematic="right" id="story" tabIndex={-1} aria-labelledby="needs-story-title">
    <div className="needs-copy">
      <p className="section-kicker">{en ? "Start with your needs" : "여행의 시작은, 나에게서"}</p>
      <h2 id="needs-story-title">{t("whyTitle", "내게 필요한 편의를 먼저 고르세요.")}</h2>
      <p>{en ? "An easy approach. An accessible toilet. Choose the facilities that make your trip comfortable." : "완만한 접근로, 이용하기 편한 화장실. 내 여행에 필요한 편의부터 골라보세요."}</p>
      <LandingNeedsDemo />
    </div>
    <figure className="needs-portrait">
      <img src="/media/wave-story/companions-coast-v2.webp" width="1120" height="1400" loading="lazy" decoding="async" alt={en ? "Brand artwork of three companions, including a wheelchair user, travelling along the coast" : "휠체어 이용자를 포함한 세 동행자가 해안을 함께 여행하는 브랜드 이미지"} />
    </figure>
  </section>;
}
