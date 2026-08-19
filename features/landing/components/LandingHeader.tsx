import Link from "next/link";
import AccountMenu from "../../auth/components/AccountMenu";
import HelpCenter from "../../../components/HelpCenter";
import { PreferenceControls } from "../../../components/SitePreferences";
import type { LandingTranslate } from "../content";

export default function LandingHeader({ scrolled, t }: { scrolled: boolean; t: LandingTranslate }) {
  return <header className={scrolled ? "landing-header scrolled" : "landing-header"}>
    <a className="brand" href="#top" aria-label="W.A.V.E 홈">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span>
    </a>
    <nav aria-label="주요 메뉴"><a href="#story">{t("service", "서비스 소개")}</a><Link href="/planner">{t("plan", "여행 설계")}</Link><Link href="/community">커뮤니티</Link></nav>
    <div className="landing-header-actions"><HelpCenter /><PreferenceControls /><AccountMenu /><Link className="landing-start" href="/planner">{t("use", "서비스 이용하기")} <span>↗</span></Link></div>
  </header>;
}
