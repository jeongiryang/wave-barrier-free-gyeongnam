import LandingAdaptStory from "./LandingAdaptStory";
import LandingDiscoveryStories from "./LandingDiscoveryStories";
import LandingJourneyStories from "./LandingJourneyStories";
import LandingTravelBookStory from "./LandingTravelBookStory";
import { useSitePreferences } from "../../../components/SitePreferences";

export function LandingProductStories() {
  const en = useSitePreferences().locale === "en";
  return <section className="product-stories" id="experience" aria-label={en ? "W.A.V.E key features" : "W.A.V.E 주요 기능"}>
    <LandingDiscoveryStories />
    <LandingJourneyStories />
    <LandingAdaptStory />
    <LandingTravelBookStory />
  </section>;
}
