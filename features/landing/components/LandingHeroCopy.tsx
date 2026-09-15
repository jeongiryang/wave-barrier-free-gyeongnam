"use client";
import { useSitePreferences } from "../../../components/SitePreferences";
export default function LandingHeroCopy() {
  const en = useSitePreferences().locale === "en";
  return <h1 id="landing-title" tabIndex={-1}>{en ? <>Explore Gyeongnam.<br />Plan your trip.</> : <>경남 여행지를 찾고<br />일정을 짜보세요.</>}</h1>;
}
