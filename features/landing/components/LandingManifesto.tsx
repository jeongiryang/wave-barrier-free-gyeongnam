import { useSitePreferences } from "../../../components/SitePreferences";
import type { LandingTranslate } from "../content";
import LandingNeedsDemo from "./LandingNeedsDemo";

export default function LandingManifesto({ t }: { t: LandingTranslate }) {
  const en = useSitePreferences().locale === "en";
  return <section className="manifesto needs-chapter" data-cinematic="right" id="story" tabIndex={-1}>
    <div className="needs-copy">
      <p className="section-kicker">{en ? "Start with your needs" : "여행의 시작은, 나에게서"}</p>
      <h2>{t("whyTitle", "내게 필요한 편의를 먼저 고르세요.")}</h2>
      <p>{en ? "An easy approach. An accessible toilet. Choose the facilities that make your trip comfortable." : "완만한 접근로, 이용하기 편한 화장실. 내 여행에 필요한 편의부터 골라보세요."}</p>
      <LandingNeedsDemo />
    </div>
    <figure className="needs-portrait">
      <img src="/media/wave-story/planning-together-v1.webp" width="1448" height="1086" loading="lazy" alt={en ? "Brand illustration of companions preparing a trip together" : "함께 여행을 준비하는 동행자들을 그린 브랜드 일러스트"} />
    </figure>
  </section>;
}
