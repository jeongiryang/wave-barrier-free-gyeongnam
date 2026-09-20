"use client";
import { useSitePreferences } from "../../../components/SitePreferences";
export default function LandingHeroCopy() {
  const en = useSitePreferences().locale === "en";
  return <h1 id="landing-title" tabIndex={-1}>{en ? "Check access before planning a Gyeongnam trip" : "경남 여행, 갈 수 있는지부터 확인하고 계획해요"}</h1>;
}
