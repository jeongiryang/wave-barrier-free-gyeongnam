import Link from "next/link";
import HelpCenter from "../../../components/HelpCenter";
import PublicMobileNav from "../../../components/PublicMobileNav";
import { PreferenceControls, useSitePreferences } from "../../../components/SitePreferences";
import AccountMenu from "../../auth/components/AccountMenu";
import type { JourneyStepId } from "../hooks/useJourneyProgress";

export function PlannerHeader({ t, scrolled, hidden, savedCount, onNavigate }: {
  t: (key: string, fallback: string) => string;
  scrolled: boolean;
  hidden: boolean;
  savedCount: number;
  onNavigate: (id: JourneyStepId) => void;
}) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <header className={`site-header ${scrolled ? "scrolled" : ""} ${hidden ? "hidden" : ""}`}>
    <Link className="brand" href="/" aria-label={en ? "W.A.V.E home" : "W.A.V.E 소개 홈"}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></Link>
    <nav aria-label={en ? "Main menu" : "주요 메뉴"}><a href="#conditions" onClick={(event) => { event.preventDefault(); onNavigate("conditions"); }}>{t("conditions", "여행 조건")}</a><a href="#places" onClick={(event) => { event.preventDefault(); onNavigate("places"); }}>{en ? "Places" : "여행지"}</a><a href="#itinerary" onClick={(event) => { event.preventDefault(); onNavigate("itinerary"); }}>{en ? "Itinerary" : "내 일정"}</a><Link href="/travel-book">{en ? "Saved trips" : "저장한 일정"}</Link><Link href="/community">{en ? "Travel stories" : "여행 후기"}</Link></nav>
    <div className="planner-header-actions"><PublicMobileNav links={[
      { href: "/", label: en ? "About W.A.V.E" : "서비스 소개" },
      { href: "/planner", label: en ? "Plan a trip" : "여행 계획", current: true },
      { href: "/travel-book", label: en ? "Saved trips" : "내 일정" },
      { href: "/community", label: en ? "Travel stories" : "여행 후기" },
    ]} /><HelpCenter /><PreferenceControls /><AccountMenu loginHref="/login?next=%2Fplanner" /><button className="header-action" type="button" onClick={() => onNavigate("itinerary")}>{en ? "Itinerary" : "내 일정"} <b>{savedCount}</b><span aria-hidden="true">↗</span></button></div>
  </header>;
}
