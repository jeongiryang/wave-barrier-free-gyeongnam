import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Vercel applies baseline browser security headers", async () => {
  const config = JSON.parse(await source("vercel.json"));
  const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]));
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(headers["Permissions-Policy"], /camera=\(\)/);
});

test("anonymous database writes validate origin, JSON and body size before storage", async () => {
  const worker = await source("worker/index.ts");
  assert.match(worker, /function readTrustedJson/);
  assert.match(worker, /content-type/);
  assert.match(worker, /sec-fetch-site/);
  assert.match(worker, /origin !== requestUrl\.origin/);
  assert.match(worker, /TextEncoder\(\)\.encode\(raw\)\.byteLength/);
  assert.match(worker, /readTrustedJson\(request, 70000\)/);
  assert.match(worker, /readTrustedJson\(request, 4000\)/);
});

test("external Kakao place links are upgraded to HTTPS", async () => {
  const [worker, map] = await Promise.all([
    source("worker/index.ts"),
    source("components/RouteMap.tsx"),
  ]);
  assert.match(worker, /placeUrl: httpsUrl\(item\.place_url\)/);
  assert.match(map, /place_url\?\.replace\(\/\^http:/);
});

test("account and footer copy describe real storage and independent operation", async () => {
  const [account, landing, planner] = await Promise.all([
    source("components/AccountMenu.tsx"),
    source("app/page.tsx"),
    source("app/planner/page.tsx"),
  ]);
  assert.doesNotMatch(account, /저장한 여행 조건과 즐겨찾기를 안전하게 관리/);
  assert.match(account, /여행 보관함은 현재 이 브라우저에 저장/);
  assert.match(landing, /공식 운영 서비스가 아닙니다/);
  assert.match(planner, /공식 운영 서비스가 아닙니다/);
  assert.match(account, /event\.key !== "Tab"/);
  assert.match(planner, /placeDialogRef/);
});

test("deployment guide uses the current CI check name and Vercel uses Node 22", async () => {
  const [guide, viteConfig] = await Promise.all([
    source("docs/vercel-neon-setup.md"),
    source("vite.config.ts"),
  ]);
  assert.match(guide, /\*\*CI \/ validate\*\*/);
  assert.doesNotMatch(guide, /코드 품질 검사 \/ validate/);
  assert.match(viteConfig, /runtime: "nodejs22\.x"/);
});

test("contest category, selected task and live OpenAPI use are documented consistently", async () => {
  const [readme, compliance, policy, landing, planner, worker] = await Promise.all([
    source("README.md"),
    source("docs/contest-compliance.md"),
    source("docs/competition-operation-policy.md"),
    source("app/page.tsx"),
    source("app/planner/page.tsx"),
    source("worker/index.ts"),
  ]);
  for (const content of [readme, compliance, policy, landing, planner]) {
    assert.match(content, /②-2 웹·앱 구현 부문/);
    assert.match(content, /지정과제 1/);
  }
  assert.match(compliance, /날씨 변화, 혼잡도 상승, 동선 꼬임/);
  assert.match(compliance, /실시간 대화형 여행 가이드.+예시/);
  assert.match(compliance, /TOUR_API_SERVICE_KEY_ENCODED/);
  assert.match(worker, /KorService2/);
  assert.match(worker, /KorWithService2/);
  assert.match(worker, /PhotoGalleryService1/);
  assert.match(worker, /LocgoHubTarService1/);
  assert.match(worker, /TarRlteTarService1/);
});

test("the place carousel is sized by its card instead of the viewport", async () => {
  const css = await source("app/globals.css");
  const rule = css.match(/\.planner-page > \.places-section \.place-carousel \{[^}]+\}/)?.[0] ?? "";
  assert.match(css, /--card-pad-x: clamp\(/);
  assert.match(rule, /\.planner-page > \.places-section \.place-carousel/);
  assert.match(rule, /width: auto/);
  assert.match(rule, /margin-inline: calc\(var\(--card-pad-x\) \* -1\)/);
  assert.match(rule, /padding: 4px var\(--card-pad-x\) 28px/);
  assert.doesNotMatch(rule, /100vw/);
});

test("wide screens use available viewport width without breaking mobile gutters", async () => {
  const css = await source("app/globals.css");
  assert.match(css, /--layout-max: 1840px/);
  assert.match(css, /--content: min\(var\(--layout-max\), calc\(100vw - var\(--gutter\) \* 2\)\)/);
  const wide = css.slice(css.indexOf("/* --- 유동형 와이드 레이아웃"), css.indexOf("/* --- 모바일·터치 접근성 최종 보정"));
  assert.match(wide, /@media \(min-width: 1101px\)/);
  assert.match(wide, /\.landing-header, \.site-header \{ width: var\(--content\)/);
  assert.match(wide, /\.landing-page > section, \.landing-page > footer/);
  assert.match(wide, /\.planner-page > \.navigation-section/);
  assert.match(wide, /\.navigation-workspace, \.day-planner \{ width: 100%; max-width: none; \}/);
  assert.match(css, /@media \(max-width: 780px\)[\s\S]*width: calc\(100vw - 16px\)/);
});

test("wave effects avoid dense glyphs and the extended intro timing stays synchronized", async () => {
  const [wave, landing, css] = await Promise.all([
    source("components/WaveField.tsx"),
    source("app/page.tsx"),
    source("app/globals.css"),
  ]);
  const ramp = wave.match(/const RAMP = \[(.*?)\];/)?.[1] ?? "";
  assert.doesNotMatch(ramp, /[#@xX≡]/);
  assert.match(wave, /out: \[5\.65, 6\.05\].*W\.A\.V\.E/);
  assert.match(landing, /const INTRO_DURATION_MS = 6550/);
  assert.match(landing, /setTimeout\(\(\) => finishIntro\(\), INTRO_DURATION_MS\)/);
  assert.match(css, /landingIntroOut \.5s 6\.05s/);
  assert.match(landing, /prefers-reduced-motion: reduce/);
  assert.match(landing, /<button ref=\{startButtonRef\} type="button" onClick=\{close\}>/);
});

test("interactive help follows real sections and remains accessible on mobile", async () => {
  const [help, landing, planner, css] = await Promise.all([
    source("components/HelpCenter.tsx"),
    source("app/page.tsx"),
    source("app/planner/page.tsx"),
    source("app/globals.css"),
  ]);
  for (const selector of ["#top", "#story", "#regions", "#evidence", ".landing-cta"]) {
    assert.match(help, new RegExp(`selector: "${selector.replace(".", "\\.")}"`));
  }
  for (const id of ["planner", "places", "layers", "navigation", "route", "data"]) {
    assert.match(help, new RegExp(`selector: "#${id}"`));
    assert.match(planner, new RegExp(`id="${id}"`));
  }
  assert.match(landing, /id="story"/);
  assert.match(help, /window\.scrollTo\(\{ top: Math\.max\(0, targetTop\), behavior: reduced \? "auto" : "smooth" \}\)/);
  assert.match(help, /highlightSelector/);
  assert.match(help, /setHighlight\(null\)/);
  assert.match(help, /dialog\.top - gutter/);
  assert.match(help, /new ResizeObserver\(queueUpdate\)/);
  assert.match(help, /help-tour-spotlight/);
  assert.match(help, /help-tour-pointer/);
  assert.match(help, /aria-modal="true"/);
  const spotlightRule = css.match(/\.help-tour-spotlight \{[^}]+\}/)?.[0] ?? "";
  assert.doesNotMatch(spotlightRule, /transition:/);
  assert.match(help, /event\.key === "Escape"/);
  assert.match(help, /previousFocus\?\.focus\(\)/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*\.planner-header-actions \.help-button \{ display: inline-flex; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.help-tour-spotlight/);
});

test("mobile screens keep controls touchable and content inside safe areas", async () => {
  const [layout, map, css] = await Promise.all([
    source("app/layout.tsx"),
    source("components/RouteMap.tsx"),
    source("app/globals.css"),
  ]);
  assert.match(layout, /width: "device-width"/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(css, /@media \(max-width: 780px\)/);
  assert.match(css, /top: calc\(8px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(css, /input, select, textarea \{ font-size: 16px; \}/);
  assert.match(css, /max-height: calc\(100svh - 20px\)/);
  assert.match(css, /\.carousel-actions button,[\s\S]*min-height: 44px/);
  assert.match(css, /@media \(max-width: 380px\)[\s\S]*width: calc\(100vw - 8px\)/);
  assert.match(css, /@media \(max-height: 520px\) and \(orientation: landscape\)/);
  assert.match(map, /className="map-command-scroll"/);
  assert.match(map, /className="map-expand-button"[\s\S]*⛶ 전체보기/);
  assert.match(css, /\.map-command-scroll \{[^}]*overflow-x: auto/);
  assert.doesNotMatch(css.match(/\.map-command-bar \{[^}]+\}/)?.[0] ?? "", /overflow-x: auto/);
});

test("travel conditions refresh the plan without requiring the submit button", async () => {
  const planner = await source("app/planner/page.tsx");
  assert.match(planner, /const planSignature = `\$\{region\}\|\$\{theme\}\|\$\{locale\}\|\$\{selected\.join\(","\)\}`/);
  assert.match(planner, /setTimeout\(\(\) => void generatePlanRef\.current\(false\), 550\)/);
  assert.match(planner, /planRequestRef\.current\?\.abort\(\)/);
  assert.match(planner, /signal: controller\.signal/);
  assert.match(planner, /if \(revealResults\) window\.setTimeout/);
  assert.match(planner, /결과 새로고침/);
});
