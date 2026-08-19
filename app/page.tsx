"use client";

import { useSitePreferences } from "../components/SitePreferences";
import { LandingProductStories } from "../features/landing/components/LandingProductStories";
import LandingCommunityStory from "../features/community/components/LandingCommunityStory";
import { LandingCallToAction, LandingEvidenceStory, LandingFooter } from "../features/landing/components/LandingClosing";
import LandingHeader from "../features/landing/components/LandingHeader";
import LandingHero from "../features/landing/components/LandingHero";
import LandingIntro from "../features/landing/components/LandingIntro";
import LandingManifesto from "../features/landing/components/LandingManifesto";
import LandingRegionStory from "../features/landing/components/LandingRegionStory";
import { useLandingExperience } from "../features/landing/hooks/useLandingExperience";
import { useLandingIntro } from "../features/landing/useLandingIntro";

export default function LandingPage() {
  const { t, motion, hydrated } = useSitePreferences();
  const { introState, finishIntro } = useLandingIntro({ hydrated, motion });
  const {
    landingRef,
    activeRegion,
    active,
    preview,
    regionPhotos,
    scrolled,
    scrollDirection,
    setPreviewRegion,
    loadRegionPhoto,
    selectRegion,
    handlePointerMove,
  } = useLandingExperience();

  return <main ref={landingRef} className="landing-page" data-scroll-direction={scrollDirection} onPointerMove={handlePointerMove}>
    {introState === "show" && <LandingIntro close={finishIntro} />}
    <div className="landing-pointer-glow" aria-hidden="true" />
    <aside className="chapter-rail" aria-hidden="true"><span>INTRO</span><i><b /></i><span>GO</span></aside>
    <a className="skip-link" href="#story">{t("skip", "소개 바로가기")}</a>
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
      setPreviewRegion={setPreviewRegion}
      loadRegionPhoto={loadRegionPhoto}
      selectRegion={selectRegion}
    />
    <LandingCommunityStory />
    <LandingEvidenceStory t={t} />
    <LandingCallToAction t={t} />
    <LandingFooter t={t} />
  </main>;
}
