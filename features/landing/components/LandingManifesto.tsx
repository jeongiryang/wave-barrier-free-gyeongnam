import { landingValues, type LandingTranslate } from "../content";

export default function LandingManifesto({ t }: { t: LandingTranslate }) {
  return <section className="manifesto" id="story" tabIndex={-1}>
    <p className="section-kicker" data-land-reveal>W.A.V.E가 먼저 묻는 세 가지</p>
    <h2 data-land-reveal>{t("whyTitle", "인기 순위보다, 내게 편안한 여행을 찾습니다.")}</h2>
    <div className="manifesto-grid">
      {landingValues.map((value, index) => <article key={value.number} data-land-reveal><span>{value.number}</span><h3>{t(`value${index + 1}`, value.title)}</h3><p>{t(`value${index + 1}Copy`, value.copy)}</p></article>)}
    </div>
  </section>;
}
