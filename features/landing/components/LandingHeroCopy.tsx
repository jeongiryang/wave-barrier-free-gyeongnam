"use client";
import { useSitePreferences } from "../../../components/SitePreferences";
export default function LandingHeroCopy() {
  const en = useSitePreferences().locale === "en";
  return <>
    <p className="landing-hero-kicker">{en ? "YOUR NEEDS STAY LOCKED" : "조건은 그대로 근거는 분명하게"}</p>
    <h1 id="landing-title" tabIndex={-1}>{en ? <>Keep the facilities you need.<br />Plan Gyeongnam with evidence.</> : <>필요한 편의를 끝까지 지키는<br />경남 여행 설계</>}</h1>
  </>;
}
