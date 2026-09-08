import { landingValues, type LandingTranslate } from "../content";
import { useSitePreferences } from "../../../components/SitePreferences";

export default function LandingManifesto({ t }: { t: LandingTranslate }) {
  const { locale } = useSitePreferences();
  return <section className="manifesto" id="story" tabIndex={-1}>
    <p className="section-kicker" data-land-reveal>{locale === "en" ? "Before choosing a destination" : "여행지보다 먼저 확인할 것"}</p>
    <h2 data-land-reveal>{t("whyTitle", "내게 필요한 편의를 먼저 고르세요.")}</h2>
    <div className="manifesto-grid">
      {landingValues.map((value, index) => <article key={value.number} data-land-reveal><span>{value.number}</span><h3>{t(`value${index + 1}`, value.title)}</h3><p>{t(`value${index + 1}Copy`, value.copy)}</p></article>)}
    </div>
  </section>;
}
