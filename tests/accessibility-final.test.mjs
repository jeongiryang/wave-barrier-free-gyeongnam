import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("공개 화면의 공통 헤더는 주요 메뉴와 현재 페이지 및 실제 skip 초점을 제공한다", async () => {
  const [header, skipLink, landingHeader, communityHeader, authShell, banner] = await Promise.all([
    source("components/WaveHeader.tsx"),
    source("components/SkipLink.tsx"),
    source("features/landing/components/LandingHeader.tsx"),
    source("components/CommunityHeader.tsx"),
    source("features/auth/components/AuthShell.tsx"),
    source("components/NightBanner.tsx"),
  ]);
  assert.match(header, /contains\(document\.activeElement\)/);
  assert.match(header, /addEventListener\("focusin", focus\)/);
  assert.match(header, /removeEventListener\("focusin", focus\)/);
  assert.match(header, /aria-current=\{current === "planner" \? "page" : undefined\}/);
  for (const header of [landingHeader, communityHeader]) assert.match(header, /WaveHeader/);
  assert.match(authShell, /SkipLink/);
  assert.match(header, /<nav aria-label/);
  for (const route of ["/planner", "/community", "/travel-book"]) assert.ok(header.includes(route));
  assert.match(skipLink, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(skipLink, /scrollToSection\(id\)/);
  assert.match(banner, /aria-label="이전 배너"/);
  assert.match(banner, /aria-label="다음 배너"/);
  assert.match(banner, /aria-live="polite"/);
  assert.match(banner, /alt="" aria-hidden="true"/);
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
  assert.match(css, /:where\(button, summary, select\)[\s\S]*min-block-size: 44px;[\s\S]*min-inline-size: 44px/);
  assert.match(css, /html\[data-motion="calm"\] \*/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 400px\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /main small:not\(\.sr-only\)[\s\S]*font-size: max\(\.75rem, \.9em\)/);
});

test("자동 숨김 헤더는 focusin에서 상태를 복구한다", async () => {
  const chrome = await source("features/planner/hooks/usePlannerChrome.ts");
  assert.match(chrome, /document\.addEventListener\("focusin", restoreForKeyboard\)/);
  assert.match(chrome, /closest\("\.wave-header,\.site-header"\).*setHeaderHidden\(false\)/);
});
