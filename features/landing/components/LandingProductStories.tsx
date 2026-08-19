import LandingAdaptStory from "./LandingAdaptStory";
import LandingDiscoveryStories from "./LandingDiscoveryStories";
import LandingJourneyStories from "./LandingJourneyStories";

export function LandingProductStories() {
  return <section className="product-stories" id="experience" aria-label="W.A.V.E 주요 기능">
    <LandingDiscoveryStories />
    <LandingJourneyStories />
    <LandingAdaptStory />
  </section>;
}
