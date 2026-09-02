"use client";

import { useSitePreferences } from "../components/SitePreferences";
import SkipLink from "../components/SkipLink";
import { LandingProductStories } from "../features/landing/components/LandingProductStories";
import LandingCommunityStory from "../features/community/components/LandingCommunityStory";
import { LandingCallToAction, LandingEvidenceStory, LandingFooter } from "../features/landing/components/LandingClosing";
import LandingHeader from "../features/landing/components/LandingHeader";
import LandingHero from "../features/landing/components/LandingHero";
import LandingManifesto from "../features/landing/components/LandingManifesto";
import LandingRegionStory from "../features/landing/components/LandingRegionStory";
import { useLandingExperience } from "../features/landing/hooks/useLandingExperience";

export default function LandingPage() {
  const { t } = useSitePreferences();
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
    handlePointerMove,
  } = useLandingExperience();

  return <main ref={landingRef} className="landing-page" data-scroll-direction={scrollDirection} onPointerMove={handlePointerMove}>
    <div className="landing-pointer-glow" aria-hidden="true" />
    <aside className="chapter-rail" aria-hidden="true"><span>처음</span><i><b /></i><span>시작</span></aside>
    <SkipLink href="#story">{t("skip", "소개 바로가기")}</SkipLink>
    <LandingHeader scrolled={scrolled} t={t} />
    <LandingHero t={t} />
    <LandingManifesto t={t} />
    <LandingProductStories />
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
    <LandingCommunityStory />
    <LandingEvidenceStory t={t} />
    <LandingCallToAction t={t} />
    <LandingFooter t={t} />
  </main>;
}
