"use client";

import Link from "next/link";
import AccountMenu from "../features/auth/components/AccountMenu";
import HelpCenter from "./HelpCenter";
import { PreferenceControls } from "./SitePreferences";

export default function CommunityHeader({ current = "community" }: { current?: "community" | "planner" | "travel-book" }) {
  return (
    <header className="community-header">
      <Link className="brand" href="/" aria-label="W.A.V.E 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></Link>
      <nav aria-label="주요 메뉴"><Link href="/">서비스 소개</Link><Link href="/planner" aria-current={current === "planner" ? "page" : undefined}>여행 계획</Link><Link href="/travel-book" aria-current={current === "travel-book" ? "page" : undefined}>내 여행집</Link><Link href="/community" aria-current={current === "community" ? "page" : undefined}>여행 후기</Link></nav>
      <div className="community-header-actions"><HelpCenter /><PreferenceControls /><AccountMenu loginHref={`/login?next=${current === "travel-book" ? "%2Ftravel-book" : "%2Fcommunity"}`} /></div>
    </header>
  );
}
