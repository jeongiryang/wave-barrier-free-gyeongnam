import Link from "next/link";
import HelpCenter from "../../../components/HelpCenter";
import PublicMobileNav from "../../../components/PublicMobileNav";
import { PreferenceControls, useSitePreferences } from "../../../components/SitePreferences";
import type { LandingTranslate } from "../content";
import LandingAccountMenu from "./LandingAccountMenu";

export default function LandingHeader({ scrolled, t }: { scrolled: boolean; t: LandingTranslate }) {
  const en = useSitePreferences().locale === "en";
  return <header className={scrolled ? "landing-header scrolled" : "landing-header"}>
    <a className="brand" href="#top" aria-label={en ? "W.A.V.E home" : "W.A.V.E 홈"}>
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span>
    </a>
    <nav aria-label={en ? "Main menu" : "주요 메뉴"}><a href="#story">{t("service", "서비스 소개")}</a><Link href="/planner">{en ? "Plan a trip" : "여행 설계"}</Link><Link href="/travel-book">{en ? "Saved trips" : "내 여행"}</Link><Link href="/community">{en ? "Traveler stories" : "커뮤니티"}</Link></nav>
    <div className="landing-header-actions"><PublicMobileNav links={[
      { href: "#story", label: t("service", "서비스 소개"), current: true },
      { href: "/planner", label: en ? "Plan a trip" : "여행 설계" },
      { href: "/travel-book", label: en ? "Saved trips" : "내 여행" },
      { href: "/community", label: en ? "Traveler stories" : "커뮤니티" },
      { href: "/login", label: en ? "Log in" : "로그인" },
    ]} /><HelpCenter iconOnly /><PreferenceControls iconOnly /><LandingAccountMenu /><Link className="landing-start" href="/planner">{en ? "Plan my trip" : "여행 계획하기"} <span aria-hidden="true">↗</span></Link></div>
  </header>;
}
