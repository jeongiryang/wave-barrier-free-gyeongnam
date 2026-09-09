import { landingValues, type LandingTranslate } from "../content";
import { useSitePreferences } from "../../../components/SitePreferences";

export default function LandingManifesto({ t }: { t: LandingTranslate }) {
  const { locale } = useSitePreferences();
  return <section className="manifesto" data-cinematic="right" id="story" tabIndex={-1}>
    <p className="section-kicker" data-land-reveal>{locale === "en" ? "Before choosing a destination" : "여행지보다 먼저 확인할 것"}</p>
    <h2 data-land-reveal><span>{t("whyTitle", "내게 필요한 편의를 먼저 고르세요.")}</span></h2>
    <p className="manifesto-lead">{locale === "en" ? "A gentle approach. A place to rest. Start with what makes a journey comfortable for you." : "완만한 접근로, 잠깐 쉴 곳. 내 여행을 편안하게 만드는 것부터 시작해요."}</p>
    <div className="manifesto-grid">
      {landingValues.map((value, index) => <article key={value.number} data-land-reveal><span>{value.number}</span><h3>{t(`value${index + 1}`, value.title)}</h3><p>{t(`value${index + 1}Copy`, value.copy)}</p></article>)}
    </div>
    <figure className="needs-portrait" data-land-reveal>
      <img src="/media/wave-story/planning-together-v1.webp" width="1448" height="1086" loading="lazy" alt={locale === "en" ? "An imagined scene of companions preparing a trip together" : "함께 여행을 준비하는 동행자들의 상상 장면"} />
      <figcaption>{locale === "en" ? "Every journey starts with different needs. Imagined illustration." : "우리의 여행은 서로 다른 편의에서 시작해요. 상상 장면입니다."}</figcaption>
    </figure>
  </section>;
}
