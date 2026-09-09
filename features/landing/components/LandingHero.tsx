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
      <span>{t("heroCopy", "내게 필요한 편의로 경남 여행지를 찾고, 일정과 이동을 준비하세요. 로그인 없이 시작할 수 있어요.")}</span>
      <div className="landing-actions"><Link href="/planner">{en ? "Plan my trip" : "여행 계획하기"} <b aria-hidden="true">→</b></Link></div>
    </div>
    </div>
    </StoryMedia>
  </section>;
}
