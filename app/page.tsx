"use client";
import { useRef, useSyncExternalStore } from "react";
import useLandingReveal from "../features/landing/hooks/useLandingReveal";
import { useSitePreferences } from "../components/SitePreferences";
import SkipLink from "../components/SkipLink";
import "./styles/landing-restored.css";
import "./styles/night-landing.css";
import "./styles/award-panorama.css";
import AwardPanorama, { AwardPhotoProvider } from "../features/landing/components/AwardPanorama";
import LandingDepartureScene from "../features/landing/components/LandingDepartureScene";
import LandingCommunityScene from "../features/landing/components/LandingCommunityScene";
import { LandingFooter, LandingCallToAction } from "../features/landing/components/LandingClosing";
import LandingHeader from "../features/landing/components/LandingHeader";
import LandingHero from "../features/landing/components/LandingHero";
import LandingChapters from "../features/landing/components/LandingChapters";
import LandingRegionStory from "../features/landing/components/LandingRegionStory";
import LandingAssistantStory from "../features/landing/components/LandingAssistantStory";
import LandingFeatureLinks from "../features/landing/components/LandingFeatureLinks";
import LandingFeatureList from "../features/landing/components/LandingFeatureList";
import ScenicBackground from "../components/ScenicBackground";
import LandingUseExample from "../features/landing/components/LandingUseExample";
import LandingIntro from "../features/landing/components/LandingIntro";

function subscribeCompact(onChange: () => void) {
  const query = window.matchMedia("(max-width: 600px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const compactSnapshot = () => window.matchMedia("(max-width: 600px)").matches;
const desktopSnapshot = () => false;

export default function LandingPage() {
  const { t, locale } = useSitePreferences();
  const root = useRef<HTMLElement>(null);
  const compact = useSyncExternalStore(subscribeCompact, compactSnapshot, desktopSnapshot);
  useLandingReveal(root);
  return <AwardPhotoProvider><LandingIntro /><main ref={root} className="landing-page horizon-edition simple-landing wave-night night-landing scenic-page" lang={locale}>
    <ScenicBackground kind="home" />
    <SkipLink href="#top">{t("skip", "본문으로 바로가기")}</SkipLink>
    <LandingHeader scrolled={false} t={t} />
    <div className="landing-opening"><AwardPanorama />
    <LandingHero /></div>
    <div className="landing-content">
    <LandingUseExample />
    {compact
      ? [<LandingFeatureLinks key="features" />, <LandingRegionStory key="regions" />]
      : [<LandingRegionStory key="regions" />, <LandingFeatureLinks key="features" />]}
    <LandingChapters />
    <div className="night-discover-grid"><LandingDepartureScene /><LandingCommunityScene /></div>
    <div className="night-feature-content"><LandingAssistantStory /><LandingFeatureList /></div>
    </div>
    <div className="landing-finale"><LandingCallToAction t={t} />
    <LandingFooter t={t} /></div>
  </main></AwardPhotoProvider>;
}
