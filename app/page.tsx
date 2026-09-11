"use client";

import { useSitePreferences } from "../components/SitePreferences";
import SkipLink from "../components/SkipLink";
import LandingCommunityStory from "../features/community/components/LandingCommunityStory";
import { LandingCallToAction, LandingFooter } from "../features/landing/components/LandingClosing";
import LandingHeader from "../features/landing/components/LandingHeader";
import LandingHero from "../features/landing/components/LandingHero";
import LandingChapters from "../features/landing/components/LandingChapters";
import LandingRegionStory from "../features/landing/components/LandingRegionStory";
import LandingSectionProgress from "../features/landing/components/LandingSectionProgress";
import { landingSections } from "../features/landing/sections";
import LandingIntro from "../features/landing/components/LandingIntro";
import LandingAccountStory from "../features/landing/components/LandingAccountStory";
import LandingDepartureScene from "../features/landing/components/LandingDepartureScene";
import { useLandingExperience } from "../features/landing/hooks/useLandingExperience";

export default function LandingPage() {
  const { t, locale } = useSitePreferences();
  const {
    landingRef,
    activeRegion,
    active,
    preview,
    regionPhotos,
    scrolled,
    scrollDirection,
    showRegionPreview,
    hideRegionPreview,
    selectRegion,
  } = useLandingExperience();

  return <><LandingIntro /><main ref={landingRef} className="landing-page story-edition horizon-edition" data-scroll-direction={scrollDirection} lang={locale}>
    <SkipLink href="#story">{t("skip", "소개 바로가기")}</SkipLink>
    <LandingHeader scrolled={scrolled} t={t} />
    <LandingSectionProgress />
    {landingSections.map(section => {
      switch (section.key) {
        case "hero": return <LandingHero key={section.id} t={t} />;
        case "region": return null;
        case "needs": return <LandingChapters key={section.id}><LandingRegionStory t={t} activeRegion={activeRegion} active={active} preview={preview} regionPhotos={regionPhotos} showRegionPreview={showRegionPreview} hideRegionPreview={hideRegionPreview} selectRegion={selectRegion} /></LandingChapters>;
        case "recommendation": return <LandingAccountStory key={section.id} />;
        case "departure": return <LandingDepartureScene key={section.id} />;
        case "community": return <LandingCommunityStory key={section.id} />;
        case "closing": return <LandingCallToAction key={section.id} t={t} />;
      }
    })}
    <LandingFooter t={t} />
  </main></>;
}
