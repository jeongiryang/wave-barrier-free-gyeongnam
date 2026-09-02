import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("공개 화면은 좁은 폭에서도 닫히지 않는 주요 메뉴와 실제 skip 초점을 제공한다", async () => {
  const [mobileNav, skipLink, landingHeader, communityHeader, authShell, css] = await Promise.all([
    source("components/PublicMobileNav.tsx"),
    source("components/SkipLink.tsx"),
    source("features/landing/components/LandingHeader.tsx"),
    source("components/CommunityHeader.tsx"),
    source("features/auth/components/AuthShell.tsx"),
    source("app/styles/mobile-interaction-hardening.css"),
  ]);
  assert.match(mobileNav, /aria-expanded=\{open\}/);
  assert.match(mobileNav, /aria-controls=\{panelId\}/);
  assert.match(mobileNav, /event\.key !== "Escape"/);
  assert.match(mobileNav, /triggerRef\.current\?\.focus\(\)/);
  for (const header of [landingHeader, communityHeader, authShell]) assert.match(header, /PublicMobileNav/);
  assert.match(skipLink, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(skipLink, /scrollToSection\(id\)/);
  assert.match(css, /\.public-mobile-nav-panel a \{[\s\S]*min-height: 48px/);
});

test("지도·신고·여행 삭제 패널은 상태 관계와 Escape 초점 복귀를 노출한다", async () => {
  const [map, commandBar, report, travelBook] = await Promise.all([
    source("features/routing/useMapAccessibility.ts"),
    source("features/routing/components/MapCommandBar.tsx"),
    source("features/community/components/CommunityReportControl.tsx"),
    source("app/travel-book/page.tsx"),
  ]);
  assert.match(commandBar, /aria-expanded=\{toolPanel === "route"\}/);
  assert.match(commandBar, /aria-controls="map-panel-route"/);
  assert.match(commandBar, /aria-pressed=\{baseMap === "roadmap"\}/);
  assert.match(map, /event\.key !== "Escape"/);
  assert.match(map, /panelTriggerRef\.current/);
  assert.match(report, /aria-controls=\{panelId\}/);
  assert.match(report, /closeAndRestoreFocus/);
  assert.match(travelBook, /aria-expanded=\{deleteReady\}/);
  assert.match(travelBook, /role="status" aria-live="polite"/);
});

test("전역 44px·calm·reflow 계약이 마지막 스타일 경계에 있다", async () => {
  const css = await source("app/styles/mobile-interaction-hardening.css");
  assert.match(css, /\.landing-region-map-canvas > button,[\s\S]*min-width: 44px;[\s\S]*min-height: 44px/);
  assert.match(css, /html\[data-motion="calm"\] \*/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 400px\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /main small:not\(\.sr-only\)[\s\S]*font-size: max\(\.75rem, \.9em\)/);
});

test("자동 숨김 헤더는 focusin에서 상태를 복구한다", async () => {
  const chrome = await source("features/planner/hooks/usePlannerChrome.ts");
  assert.match(chrome, /document\.addEventListener\("focusin", restoreForKeyboard\)/);
  assert.match(chrome, /closest\("\.site-header"\).*setHeaderHidden\(false\)/);
});
