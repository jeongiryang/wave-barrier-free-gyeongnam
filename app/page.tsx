"use client";

import { useSitePreferences } from "../components/SitePreferences";
import SkipLink from "../components/SkipLink";
import { LandingProductStories } from "../features/landing/components/LandingProductStories";
import LandingCommunityStory from "../features/community/components/LandingCommunityStory";
import { LandingCallToAction, LandingFooter } from "../features/landing/components/LandingClosing";
import LandingHeader from "../features/landing/components/LandingHeader";
import LandingHero from "../features/landing/components/LandingHero";
import LandingManifesto from "../features/landing/components/LandingManifesto";
import LandingRegionStory from "../features/landing/components/LandingRegionStory";
import { useLandingExperience } from "../features/landing/hooks/useLandingExperience";

export default function LandingPage() {
  const { t } = useSitePreferences();
  const {
    landingRef,
    introReplay,
    replayIntro,
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

  return <main ref={landingRef} className="landing-page" data-scroll-direction={scrollDirection}>
    <SkipLink href="#story">{t("skip", "소개 바로가기")}</SkipLink>
    <LandingHeader scrolled={scrolled} t={t} onReplayIntro={replayIntro} />
    <LandingHero t={t} replay={introReplay} />
    <LandingManifesto t={t} />
    <LandingRegionStory
      t={t}
      activeRegion={activeRegion}
      active={active}
      preview={preview}
      regionPhotos={regionPhotos}
      showRegionPreview={showRegionPreview}
      hideRegionPreview={hideRegionPreview}
      selectRegion={selectRegion}
    />
    <LandingProductStories />
    <LandingCommunityStory />
    <LandingCallToAction t={t} />
    <LandingFooter t={t} />
  </main>;
}
