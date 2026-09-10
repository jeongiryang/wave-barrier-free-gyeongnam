import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import LandingHeroCopy from "./LandingHeroCopy";
import StoryMedia from "./StoryMedia";
import type { LandingTranslate } from "../content";

export default function LandingHero({ t }: { t: LandingTranslate }) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <section className="landing-hero" id="top" tabIndex={-1} aria-labelledby="landing-title">
    <StoryMedia>
    <div className="hero-opening">
    <div className="landing-hero-copy">
      <p><span className="access-badge">{t("heroBadge", "경남 무장애 여행")}</span></p>
      <LandingHeroCopy />
      <span>{en ? "Check the facilities you need. Discover a new landscape in Gyeongnam." : <>필요한 편의를 먼저 살피고,<br />경남의 새로운 풍경을 만나세요.</>}</span>
      <div className="landing-actions"><Link href="/planner">{en ? "Plan my trip" : "여행 계획하기"} <b aria-hidden="true">↗</b></Link><a href="#story" className="horizon-hero-secondary">{en ? "Discover WAVE" : "WAVE 알아보기"}<b aria-hidden="true">↓</b></a></div>
    </div>
    </div>
    <div className="horizon-hero-bottom"><p>{en ? "Every journey has its own pace." : "모두의 여행에는 각자의 속도가 있으니까."}</p><a href="#regions">{en ? "Discover Gyeongnam" : "경남의 풍경을 따라"}<span aria-hidden="true">↓</span></a></div>
    </StoryMedia>
  </section>;
}
