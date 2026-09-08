import LandingAdaptStory from "./LandingAdaptStory";
import LandingDiscoveryStories from "./LandingDiscoveryStories";
import LandingJourneyStories from "./LandingJourneyStories";
import LandingTravelBookStory from "./LandingTravelBookStory";
import { useSitePreferences } from "../../../components/SitePreferences";

export function LandingProductStories() {
  const en = useSitePreferences().locale === "en";
  return <section className="product-stories" id="experience" aria-label={en ? "W.A.V.E key features" : "W.A.V.E 주요 기능"}>
    <details className="journey-source-details" id="journey-tools-details">
      <summary>{en ? "Explore the planning tools" : "여행 계획 도구 자세히 보기"}</summary>
      <p>{en ? "Explore the features you need, from recommendation evidence to journeys and saving." : "추천 근거부터 이동·저장까지, 필요한 기능을 살펴보세요."}</p>
      <div className="product-story-grid">
        <LandingDiscoveryStories />
        <LandingJourneyStories />
        <LandingAdaptStory />
        <LandingTravelBookStory />
      </div>
    </details>
  </section>;
}
