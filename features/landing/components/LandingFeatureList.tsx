import Link from "next/link";
import { landingFeatures, type LandingFeature } from "../feature-list";

function FeatureContents({ feature }: { feature: LandingFeature }) {
  return <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={feature.icon} /></svg><h3>{feature.title}</h3><p>{feature.body}</p></>;
}

export default function LandingFeatureList() {
  return <section id="features" className="landing-features simple-section" aria-labelledby="landing-features-title" tabIndex={-1} lang="ko">
    <header className="simple-section-heading" data-land-reveal><h2 id="landing-features-title">WAVE로 할 수 있는 일</h2><p>실제로 제공하는 기능과 확인이 필요한 범위를 함께 살펴보세요.</p></header>
    <div className="landing-feature-grid" data-land-reveal>{landingFeatures.map(feature => feature.href
      ? <Link className="landing-feature-card" href={feature.href} key={feature.id}><FeatureContents feature={feature} /></Link>
      : <article className="landing-feature-card" key={feature.id}><FeatureContents feature={feature} /></article>)}</div>
    <Link className="simple-text-link landing-feature-guide" href="/guide">자세한 사용 방법 보기 <span aria-hidden="true">→</span></Link>
  </section>;
}
