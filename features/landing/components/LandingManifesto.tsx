import { landingValues, type LandingTranslate } from "../content";

export default function LandingManifesto({ t }: { t: LandingTranslate }) {
  return <section className="manifesto" id="story">
    <p className="section-kicker" data-land-reveal>WHY W.A.V.E</p>
    <h2 data-land-reveal>{t("whyTitle", "여행 정보는 많지만, 내가 갈 수 있는지는 찾기 어렵습니다.")}</h2>
    <div className="manifesto-grid">
      {landingValues.map((value, index) => <article key={value.number} data-land-reveal><span>{value.number}</span><h3>{t(`value${index + 1}`, value.title)}</h3><p>{t(`value${index + 1}Copy`, value.copy)}</p></article>)}
    </div>
  </section>;
}
