"use client";
import { useSitePreferences } from "../../../components/SitePreferences";
export default function LandingHeroCopy() {
  const en = useSitePreferences().locale === "en";
  return <h1 id="landing-title" tabIndex={-1}>{en ? <>A wider world<br /><em>Together, WAVE</em></> : <>더 넓은 세상을<br /><em>함께, WAVE</em></>}</h1>;
}
