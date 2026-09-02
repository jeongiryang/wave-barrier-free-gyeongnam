import Link from "next/link";
import HelpCenter from "../../../components/HelpCenter";
import PublicMobileNav from "../../../components/PublicMobileNav";
import { PreferenceControls } from "../../../components/SitePreferences";
import AccountMenu from "../../auth/components/AccountMenu";
import type { JourneyStepId } from "../hooks/useJourneyProgress";

export function PlannerHeader({ t, scrolled, hidden, savedCount, onNavigate }: {
  t: (key: string, fallback: string) => string;
  scrolled: boolean;
  hidden: boolean;
  savedCount: number;
  onNavigate: (id: JourneyStepId) => void;
}) {
  return <header className={`site-header ${scrolled ? "scrolled" : ""} ${hidden ? "hidden" : ""}`}>
    <Link className="brand" href="/" aria-label="W.A.V.E 소개 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></Link>
    <nav aria-label="주요 메뉴"><a href="#conditions" onClick={(event) => { event.preventDefault(); onNavigate("conditions"); }}>{t("conditions", "여행 조건")}</a><a href="#places" onClick={(event) => { event.preventDefault(); onNavigate("places"); }}>여행지</a><a href="#itinerary" onClick={(event) => { event.preventDefault(); onNavigate("itinerary"); }}>이 기기 일정</a><Link href="/travel-book">여행집</Link><Link href="/community">여행 후기</Link></nav>
    <div className="planner-header-actions"><PublicMobileNav links={[
      { href: "/", label: "서비스 소개" },
      { href: "/planner", label: "여행 계획", current: true },
      { href: "/travel-book", label: "내 여행집" },
      { href: "/community", label: "여행 후기" },
    ]} /><HelpCenter /><PreferenceControls /><AccountMenu loginHref="/login?next=%2Fplanner" /><button className="header-action" type="button" onClick={() => onNavigate("itinerary")}>이 기기 일정 <b>{savedCount}</b><span aria-hidden="true">↗</span></button></div>
  </header>;
}
