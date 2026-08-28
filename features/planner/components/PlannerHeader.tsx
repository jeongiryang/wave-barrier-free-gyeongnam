import Link from "next/link";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import HelpCenter from "../../../components/HelpCenter";
import { PreferenceControls } from "../../../components/SitePreferences";
import AccountMenu from "../../auth/components/AccountMenu";

export function PlannerHeader({ t, scrolled, hidden, savedCount }: {
  t: (key: string, fallback: string) => string;
  scrolled: boolean;
  hidden: boolean;
  savedCount: number;
}) {
  return <header className={`site-header ${scrolled ? "scrolled" : ""} ${hidden ? "hidden" : ""}`}>
    <Link className="brand" href="/" aria-label="W.A.V.E 소개 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></Link>
    <nav aria-label="주요 메뉴"><a href="#planner">{t("conditions", "내 여행 만들기")}</a><a href="#navigation">{t("route", "길찾기")}</a><Link href="/photo-course">사진 코스</Link><Link href="/community">커뮤니티</Link></nav>
    <div className="planner-header-actions"><HelpCenter /><PreferenceControls /><AccountMenu loginHref="/login?next=%2Fplanner" /><button className="header-action" type="button" onClick={() => scrollToSection("places")}>여행 보관함 <b>{savedCount}</b><span aria-hidden="true">↗</span></button></div>
  </header>;
}
