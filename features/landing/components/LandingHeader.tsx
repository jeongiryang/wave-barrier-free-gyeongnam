import Link from "next/link";
import HelpCenter from "../../../components/HelpCenter";
import PublicMobileNav from "../../../components/PublicMobileNav";
import { PreferenceControls } from "../../../components/SitePreferences";
import type { LandingTranslate } from "../content";
import LandingAccountMenu from "./LandingAccountMenu";

export default function LandingHeader({ scrolled, t }: { scrolled: boolean; t: LandingTranslate }) {
  return <header className={scrolled ? "landing-header scrolled" : "landing-header"}>
    <a className="brand" href="#top" aria-label="W.A.V.E 홈">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span>
    </a>
    <nav aria-label="주요 메뉴"><a href="#story">{t("service", "서비스 소개")}</a><Link href="/planner">여행 계획</Link><Link href="/travel-book">내 여행집</Link><Link href="/community">여행 후기</Link></nav>
    <div className="landing-header-actions"><PublicMobileNav links={[
      { href: "#story", label: t("service", "서비스 소개"), current: true },
      { href: "/planner", label: "여행 계획" },
      { href: "/travel-book", label: "내 여행집" },
      { href: "/community", label: "여행 후기" },
      { href: "/login", label: "로그인" },
    ]} /><HelpCenter /><PreferenceControls /><LandingAccountMenu /><Link className="landing-start" href="/planner">여행 계획 만들기 <span>↗</span></Link></div>
  </header>;
}
