"use client";
import { useRef } from "react";
import useLandingReveal from "../features/landing/hooks/useLandingReveal";
import { useSitePreferences } from "../components/SitePreferences";
import SkipLink from "../components/SkipLink";
import AwardPanorama, { AwardPhotoProvider } from "../features/landing/components/AwardPanorama";
import LandingDepartureScene from "../features/landing/components/LandingDepartureScene";
import LandingCommunityScene from "../features/landing/components/LandingCommunityScene";
import { LandingFooter, LandingCallToAction } from "../features/landing/components/LandingClosing";
import LandingHeader from "../features/landing/components/LandingHeader";
import LandingHero from "../features/landing/components/LandingHero";
import LandingJourneyPreview from '../features/landing/components/LandingJourneyPreview';
import LandingChapters from "../features/landing/components/LandingChapters";
import LandingRegionStory from "../features/landing/components/LandingRegionStory";
import LandingAssistantStory from "../features/landing/components/LandingAssistantStory";

import LandingFeatureList from "../features/landing/components/LandingFeatureList";
import ScenicBackground from "../components/ScenicBackground";
import LandingRestoredConversation from '../features/landing/components/LandingRestoredConversation';

import LandingIntro from "../features/landing/components/LandingIntro";

export default function LandingPage() {
  const { t, locale } = useSitePreferences();
  const root = useRef<HTMLElement>(null);

  useLandingReveal(root);
  return <AwardPhotoProvider><LandingIntro /><main ref={root} className="landing-page horizon-edition simple-landing wave-night night-landing scenic-page" lang={locale}>
    <ScenicBackground kind="home" />
    <SkipLink href="#top">{t("skip", "본문으로 바로가기")}</SkipLink>
    <LandingHeader scrolled={false} t={t} />
    <div className="landing-opening"><AwardPanorama />
    <LandingHero /></div>
    <div className="landing-content">

    <div className="landing-section-pair"><LandingChapters /></div>
    <div className="landing-section-pair"><LandingJourneyPreview en={locale === "en"} /><LandingRegionStory /></div>
    <div className="landing-section-pair"><LandingRestoredConversation /></div>
    <div className="landing-section-pair"><LandingDepartureScene /><LandingCommunityScene scene="community" /></div>
    <div className="landing-section-pair"><LandingCommunityScene scene="festival" /><LandingAssistantStory /></div>
    <div className="landing-section-pair"><LandingFeatureList /><div className="landing-finale"><LandingCallToAction t={t} /><LandingFooter t={t} /></div></div>
    </div>  </main></AwardPhotoProvider>;
}
