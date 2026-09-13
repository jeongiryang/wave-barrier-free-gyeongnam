"use client";
import { useSitePreferences } from "../components/SitePreferences";
import SkipLink from "../components/SkipLink";
import { LandingFooter } from "../features/landing/components/LandingClosing";
import LandingHeader from "../features/landing/components/LandingHeader";
import LandingHero from "../features/landing/components/LandingHero";
import LandingChapters from "../features/landing/components/LandingChapters";
import LandingRegionStory from "../features/landing/components/LandingRegionStory";
import LandingIntro from "../features/landing/components/LandingIntro";
import LandingAssistantStory from "../features/landing/components/LandingAssistantStory";

export default function LandingPage() {
  const { t, locale } = useSitePreferences();
  return <><LandingIntro /><main className="landing-page horizon-edition simple-landing" lang={locale}>
    <SkipLink href="#top">{t("skip", "본문으로 바로가기")}</SkipLink>
    <LandingHeader scrolled={false} t={t} />
    <LandingHero t={t} />
    <LandingRegionStory />
    <LandingChapters />
    <LandingAssistantStory />
    <LandingFooter t={t} />
  </main></>;
}
