"use client";
import { useSitePreferences } from "../../../components/SitePreferences";

const messages = {
  ko: ['더 넓은 세상을', '함께, WAVE'],
  en: ['A wider world', 'Together, WAVE'],
};
export default function LandingHeroCopy() {
  const { locale } = useSitePreferences();
  const copy = messages[locale === 'en' ? 'en' : 'ko'];
  // With playback controls removed, the main reading target stays still.
  return <div className="night-hero-headline">
    <h1 id="landing-title" tabIndex={-1} aria-label={copy.join(' ')}><span className="night-hero-phrase" aria-hidden="true"><span>{copy[0]}</span><em>{copy[1]}</em></span></h1>
  </div>;
}
