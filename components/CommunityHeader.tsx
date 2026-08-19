"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import AccountMenu from "./AccountMenu";
import { PreferenceControls } from "./SitePreferences";

export default function CommunityHeader({ current = "community" }: { current?: "community" | "planner" }) {
  return (
    <header className="community-header">
      <a className="brand" href="/" aria-label="W.A.V.E 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></a>
      <nav aria-label="주요 메뉴"><a href="/">서비스 소개</a><a href="/planner" aria-current={current === "planner" ? "page" : undefined}>여행 설계</a><a href="/community" aria-current={current === "community" ? "page" : undefined}>커뮤니티</a></nav>
      <div className="community-header-actions"><PreferenceControls /><AccountMenu loginHref="/login?next=%2Fcommunity" /></div>
    </header>
  );
}
