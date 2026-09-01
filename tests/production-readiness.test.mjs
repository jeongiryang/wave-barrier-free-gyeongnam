import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function plannerProductSource() {
  const paths = [
    "app/planner/page.tsx",
    "features/planner/components/PlannerServiceStatus.tsx",
    "features/planner/components/PlannerHeader.tsx",
    "features/planner/components/PlannerFooter.tsx",
    "features/planner/components/PlannerConditionsPanel.tsx",
    "features/planner/components/PlannerJourneyBasics.tsx",
    "features/planner/components/PlannerThemeDates.tsx",
    "features/planner/components/PlannerAccessibilityProfiles.tsx",
    "features/planner/components/RecommendationWorkspace.tsx",
    "features/planner/components/RecommendationCarousel.tsx",
    "features/planner/components/PlannerItineraryWorkspace.tsx",
    "features/planner/components/TripDayPlanner.tsx",
    "features/planner/components/DepartureReadinessCard.tsx",
    "features/planner/components/TravelSignalsPanel.tsx",
    "features/planner/components/WeatherBoard.tsx",
    "features/planner/components/SituationImpactPanel.tsx",
    "features/planner/components/RegionalInsights.tsx",
    "features/planner/components/ThemeExplorer.tsx",
    "features/planner/components/NavigationWorkspace.tsx",
    "features/planner/components/TransportDataOverview.tsx",
    "features/planner/components/TransportModeSelector.tsx",
    "features/planner/components/TransportProviderDetails.tsx",
    "features/planner/components/TransportDatasetPanel.tsx",
    "features/planner/components/RouteMapWorkspace.tsx",
    "features/planner/components/TripPointPicker.tsx",
    "features/planner/components/RouteComparisonPanel.tsx",
    "features/planner/components/AudioGuidePlayer.tsx",
  ];
  return (await Promise.all(paths.map(source))).join("\n");
}

async function plannerPlanSource() {
  return (await Promise.all([
    "features/planner/hooks/usePlannerPlan.ts",
    "features/planner/hooks/usePlannerCriteria.ts",
    "features/planner/hooks/usePlanRequest.ts",
  ].map(source))).join("\n");
}

async function routeMapProductSource() {
  return (await Promise.all([
    "components/RouteMap.tsx",
    "features/routing/components/MapCommandBar.tsx",
  ].map(source))).join("\n");
}

async function landingProductSource() {
  const paths = [
    "app/page.tsx",
    "features/landing/content.ts",
    "features/landing/hooks/useLandingExperience.ts",
    "features/landing/hooks/useLandingMotion.ts",
    "features/landing/hooks/useLandingRegions.ts",
    "features/landing/client/region-photo.ts",
    "features/landing/components/LandingHeader.tsx",
    "features/landing/components/LandingHero.tsx",
    "features/landing/components/LandingManifesto.tsx",
    "features/landing/components/LandingRegionStory.tsx",
    "features/landing/components/LandingClosing.tsx",
    "features/landing/components/LandingProductStories.tsx",
    "features/landing/components/LandingDiscoveryStories.tsx",
    "features/landing/components/LandingJourneyStories.tsx",
    "features/landing/components/LandingAdaptStory.tsx",
    "features/community/components/LandingCommunityStory.tsx",
    "features/community/hooks/useCommunityPreview.ts",
  ];
  return (await Promise.all(paths.map(source))).join("\n");
}

async function styleSource() {
  const paths = [
    "app/globals.css",
    "app/styles/site-shell.css",
    "app/styles/landing-explorer.css",
    "app/styles/landing-route-data.css",
    "app/styles/place-dialog.css",
    "app/styles/landing-foundations.css",
    "app/styles/planner-foundations.css",
    "app/styles/regional-explorer-foundations.css",
    "app/styles/theme-itinerary-foundations.css",
    "app/styles/planner-workspace.css",
    "app/styles/planner-unified-workspace.css",
    "app/styles/landing-motion.css",
    "app/styles/workspace-responsive.css",
    "app/styles/map-experience.css",
    "app/styles/map-workspace.css",
    "app/styles/map-place-tools.css",
    "app/styles/map-live-signals.css",
    "app/styles/situation-identity-refinements.css",
    "app/styles/ocean-landing-refinements.css",
    "app/styles/ocean-planner-refinements.css",
    "app/styles/ocean-responsive-refinements.css",
    "app/styles/design-system.css",
    "app/styles/experience-accessibility.css",
    "app/styles/landing-regions.css",
  ];
  return (await Promise.all(paths.map(source))).join("\n");
}

test("Vercel applies baseline browser security headers", async () => {
  const config = JSON.parse(await source("vercel.json"));
  const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]));
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.match(headers["Content-Security-Policy"], /form-action 'self'/);
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(headers["Permissions-Policy"], /camera=\(\)/);

  // 스크립트 출처를 제한하지 않으면 나머지 지시어만으로는 주입된 코드를 막지 못한다.
  const policy = Object.fromEntries(headers["Content-Security-Policy"]
    .split(";")
    .map((part) => part.trim().split(/\s+/))
    .map(([name, ...values]) => [name, values]));
  assert.ok(policy["default-src"], "default-src가 없으면 선언하지 않은 자원 종류가 무제한이 된다");
  assert.deepEqual(policy["default-src"], ["'self'"]);
  assert.deepEqual(policy["object-src"], ["'none'"]);
  assert.deepEqual(policy["frame-ancestors"], ["'none'"]);
  assert.ok(policy["script-src"], "script-src가 필요하다");
  assert.ok(policy["script-src"].includes("'self'"));
  assert.ok(!policy["script-src"].includes("*"), "스크립트 출처에 전체 와일드카드를 두지 않는다");
  assert.ok(!policy["script-src"].includes("'unsafe-eval'"));
  assert.ok(policy["script-src"].some((value) => value.includes("kakao")), "카카오 지도 SDK 출처가 필요하다");
  // 관광 사진은 제공기관이 주는 임의의 https 호스트에서 온다.
  assert.ok(policy["img-src"].includes("https:"));
  // API 호출은 모두 같은 출처의 /api/* 를 지난다.
  assert.ok(policy["connect-src"].includes("'self'"));
});

test("production metadata exposes canonical discovery and install routes", async () => {
  const [layout, robots, sitemap, manifest, readme] = await Promise.all([
    source("app/layout.tsx"),
    source("app/robots.ts"),
    source("app/sitemap.ts"),
    source("app/manifest.ts"),
    source("README.md"),
  ]);
  assert.match(layout, /metadataBase: productionUrl/);
  assert.match(layout, /alternates: \{ canonical: "\/" \}/);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(robots, /disallow: \["\/api\/", "\/trip\/"\]/);
  assert.match(robots, /sitemap: `\$\{origin\}\/sitemap\.xml`/);
  assert.match(sitemap, /`\$\{origin\}\/planner`/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /purpose: "maskable"/);
  assert.doesNotMatch(readme, /스페인어/);
  assert.match(readme, /독일어·러시아어/);
});

test("route-level loading, error and not-found states provide recovery", async () => {
  const [loading, error, notFound, css] = await Promise.all([
    source("app/loading.tsx"),
    source("app/error.tsx"),
    source("app/not-found.tsx"),
    styleSource(),
  ]);
  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-live="polite"/);
  assert.match(error, /role="alert"/);
  assert.match(error, /onClick=\{reset\}/);
  assert.match(error, /<Link href="\/planner"/);
  assert.match(notFound, /30일 보관 기간/);
  assert.match(notFound, /새 여행 만들기/);
  assert.match(css, /\.route-state-page button,.route-state-page a \{ min-height: 48px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.route-state-wave i \{ animation: none; \} \}/);
});

test("the production toolchain pins patched React and the Vercel-compatible vinext release", async () => {
  const packageJson = JSON.parse(await source("package.json"));
  assert.equal(packageJson.dependencies.react, "19.2.8");
  assert.equal(packageJson.dependencies["react-dom"], "19.2.8");
  assert.equal(packageJson.devDependencies["react-server-dom-webpack"], "19.2.8");
  assert.equal(packageJson.devDependencies.vinext, "0.0.50");
});

test("anonymous database writes validate origin, JSON and body size before storage", async () => {
  const [trips, feedback, http] = await Promise.all([
    source("server/trips/itinerary-actions.ts"),
    source("server/trips/feedback-handler.ts"),
    source("server/shared/http.ts"),
  ]);
  assert.match(http, /function readTrustedJson/);
  assert.match(http, /content-type/);
  assert.match(http, /sec-fetch-site/);
  assert.match(http, /origin !== requestUrl\.origin/);
  assert.match(http, /TextEncoder\(\)\.encode\(raw\)\.byteLength/);
  assert.match(trips, /readTrustedJson\(request, 70000\)/);
  assert.match(feedback, /readTrustedJson\(request, 4000\)/);
});

test("external Kakao place links are upgraded to HTTPS", async () => {
  const [location, map] = await Promise.all([
    source("server/location/handler.ts"),
    source("features/routing/useNearbyPlaces.ts"),
  ]);
  assert.match(location, /placeUrl: httpsUrl\(item\.place_url\)/);
  assert.match(map, /place_url\?\.replace\(\/\^http:/);
});

test("account, storage and footer copy describe real boundaries and independent operation", async () => {
  const [account, authForm, landing, planner] = await Promise.all([
    source("features/auth/components/AccountMenu.tsx"),
    Promise.all([
      source("features/auth/components/AuthForm.tsx"),
      source("features/auth/hooks/useAuthForm.ts"),
    ]).then((parts) => parts.join("\n")),
    landingProductSource(),
    plannerProductSource(),
  ]);
  assert.doesNotMatch(account, /저장한 여행 조건과 즐겨찾기를 안전하게 관리/);
  assert.match(authForm, /커뮤니티 DB에 비밀번호를 저장하지 않습니다/);
  assert.match(authForm, /여행 설계와 지도는 로그인 없이 이용/);
  assert.match(authForm, /autoComplete=\{auth\.registering \? "new-password" : "current-password"\}/);
  // 안내 문구는 문제가 된 칸에만 연결한다. 늘 비밀번호 칸에 붙여 두면 이메일이
  // 틀렸을 때도 비밀번호 칸이 이메일 오류를 읽어 준다.
  assert.match(authForm, /fieldProps\("password", "auth-password-help"\)/);
  assert.match(authForm, /invalid \? "auth-message" : ""/);
  assert.match(account, /authClient\.signOut/);
  assert.match(landing, /공식 운영 서비스가 아닙니다/);
  assert.match(planner, /공식 운영 서비스가 아닙니다/);
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
  const [readme, compliance, policy, landing, planner, tourismHandler, planBuilder, tourismPhotos, tourismInsights, tourismConcentration, enrichmentSources] = await Promise.all([
    source("README.md"),
    source("docs/contest-compliance.md"),
    source("docs/competition-operation-policy.md"),
    landingProductSource(),
    plannerProductSource(),
    source("server/tourism/handler.ts"),
    Promise.all([
      source("server/tourism/plan-builder.ts"),
      source("server/tourism/plan-model.ts"),
    ]).then((parts) => parts.join("\n")),
    Promise.all([
      source("server/tourism/region-photo.ts"),
      source("server/tourism/spot-photo.ts"),
    ]).then((parts) => parts.join("\n")),
    source("server/tourism/insights.ts"),
    source("server/tourism/concentration.ts"),
    source("server/tourism/enrichment-sources.ts"),
  ]);
  const tourism = `${tourismHandler}\n${planBuilder}\n${tourismPhotos}\n${tourismInsights}\n${tourismConcentration}\n${enrichmentSources}`;
  for (const content of [readme, compliance, policy, landing, planner]) {
    assert.match(content, /②-2 웹·앱 구현 부문/);
    assert.match(content, /지정과제 1/);
  }
  assert.match(compliance, /날씨 변화, 혼잡도 상승, 동선 꼬임/);
  assert.match(compliance, /실시간 대화형 여행 가이드.+예시/);
  assert.match(compliance, /TOUR_API_SERVICE_KEY_ENCODED/);
  assert.match(tourism, /KorService2/);
  assert.match(tourism, /KorWithService2/);
  assert.match(tourism, /PhotoGalleryService1/);
  assert.match(tourism, /LocgoHubTarService1/);
  assert.match(tourism, /TarRlteTarService1/);
});

test("the place carousel is sized by its card instead of the viewport", async () => {
  const css = await styleSource();
  const rule = css.match(/\.planner-page > \.places-section \.place-carousel \{[^}]+\}/)?.[0] ?? "";
  assert.match(css, /--card-pad-x: clamp\(/);
  assert.match(rule, /\.planner-page > \.places-section \.place-carousel/);
  assert.match(rule, /width: auto/);
  assert.match(rule, /margin-inline: calc\(var\(--card-pad-x\) \* -1\)/);
  assert.match(rule, /padding: 4px var\(--card-pad-x\) 28px/);
  assert.doesNotMatch(rule, /100vw/);
});

test("wide screens use available viewport width without breaking mobile gutters", async () => {
  const css = await styleSource();
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

test("landing region markers share the rendered map coordinate space", async () => {
  const [landing, css] = await Promise.all([landingProductSource(), styleSource()]);
  assert.match(landing, /className="landing-region-map-canvas" data-region-map-canvas/);
  assert.match(landing, /data-region-marker=\{region\.name\}/);
  assert.match(landing, /width="600" height="433"/);
  assert.match(landing, /name: "거창"[\s\S]*x: 22, y: 14/);
  assert.match(landing, /name: "양산"[\s\S]*x: 90, y: 43/);
  assert.match(css, /\.landing-region-map-canvas \{[\s\S]*aspect-ratio: 600 \/ 433/);
  assert.match(css, /\.landing-region-map-canvas > img \{[\s\S]*width: 100%;[\s\S]*height: 100%/);
  assert.match(css, /\.landing-region-map \{[\s\S]*min-height: 0/);
});

test("wave effects avoid dense glyphs and landing opens without a blocking intro", async () => {
  const [renderer, model, landing, css] = await Promise.all([
    source("features/motion/wave-field-engine.ts"),
    source("features/motion/wave-model.ts"),
    landingProductSource(),
    styleSource(),
  ]);
  const ramp = model.match(/export const WAVE_RAMP = \[(.*?)\];/)?.[1] ?? "";
  assert.doesNotMatch(ramp, /[#@xX≡]/);
  assert.match(model, /out: \[1\.78, 1\.96\]/);
  assert.match(renderer, /stageWeight\(elapsed, INTRO_STAGES\[2\]\)/);
  assert.doesNotMatch(landing, /LandingIntro|useLandingIntro|introState/);
  assert.match(landing, /18 CITIES · 18 STORIES/);
  assert.doesNotMatch(landing, /useState\(true\)/);
  assert.doesNotMatch(css, /brand-intro|landingIntroOut|introRegionChapter/);
});

test("interactive help follows real sections and remains accessible on mobile", async () => {
  const [helpView, helpContent, helpController, landing, planner, css] = await Promise.all([
    source("components/HelpCenter.tsx"),
    source("features/help/tour-content.ts"),
    Promise.all([
      source("features/help/useHelpTour.ts"),
      source("features/help/useHelpTourFocus.ts"),
      source("features/help/useTourSpotlight.ts"),
    ]).then((parts) => parts.join("\n")),
    landingProductSource(),
    plannerProductSource(),
    styleSource(),
  ]);
  const help = `${helpView}\n${helpContent}\n${helpController}`;
  assert.match(helpView, /useHelpTour\(\)/);
  assert.doesNotMatch(helpView, /useEffect|ResizeObserver|window\.scrollTo/);
  for (const selector of ["#top", "#story", "#regions", "#evidence", ".landing-cta"]) {
    assert.match(help, new RegExp(`selector: "${selector.replace(".", "\\.")}"`));
  }
  for (const id of ["conditions", "places", "itinerary", "departure-readiness"]) {
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
  assert.match(help, /createPortal\(tourLayer, document\.body\)/);
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
    routeMapProductSource(),
    styleSource(),
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
  const [planner, planController, autoRefresh] = await Promise.all([
    plannerProductSource(),
    plannerPlanSource(),
    source("features/planner/hooks/usePlannerAutoRefresh.ts"),
  ]);
  assert.match(planner, /signature: `\$\{region\}\|\$\{theme\}\|\$\{locale\}\|\$\{selected\.join\(","\)\}`/);
  assert.match(autoRefresh, /setTimeout\(\(\) => void refreshRef\.current\(false\), delay\)/);
  assert.match(autoRefresh, /delay = 550/);
  assert.match(planController, /planRequestRef\.current\?\.abort\(\)/);
  assert.match(planController, /signal: controller\.signal/);
  assert.match(planController, /if \(revealResults\) window\.setTimeout/);
  assert.match(planner, /조건을 바꾸면 추천이 자동으로 업데이트됩니다/);
  assert.doesNotMatch(planner, /generate-button|여행지 다시 찾기/);
});

test("planner visual order follows DOM and keyboard focus order", async () => {
  const [page, css] = await Promise.all([
    source("app/planner/page.tsx"),
    styleSource(),
  ]);
  const sections = ["PlannerConditionsPanel", "RecommendationWorkspace", "PlannerItineraryWorkspace", "DepartureReadinessCard", "TravelSignalsPanel", "PlannerServiceStatus"];
  const positions = sections.map((component) => page.indexOf(`<${component}`));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(css, /\.planner-journey-workspace \.itinerary-stage/);
  assert.match(css, /\.planner-journey-workspace \.travel-layers/);
});

test("weather and concentration signals lead to accessible, provenance-aware actions", async () => {
  const planner = await plannerProductSource();
  assert.match(planner, /상황 감지 → 일정 영향 → 대안/);
  assert.match(planner, /role="status" aria-live="polite"/);
  assert.doesNotMatch(planner, /impact-response[^>]+aria-live/);
  assert.match(planner, /정확한 실시간 방문자 수가 아닙니다/);
  assert.match(planner, /관광 집중률: 조회하지 못함/);
  assert.match(planner, /weatherLoading \? "조회 중" : "조회 실패"/);
});

test("planner never substitutes prototype places when official data fails", async () => {
  const [planner, planController] = await Promise.all([
    plannerProductSource(),
    plannerPlanSource(),
  ]);
  assert.doesNotMatch(planner, /demo-jinhae|demo-cable|demo-jinju/);
  assert.doesNotMatch(planner, /fallbackPlaces|fallbackStops|제안서 기반 미리보기/);
  assert.match(planController, /setPlanError\(message\)/);
  assert.match(planController, /임의의 장소를 대신 표시하지 않습니다/);
  assert.match(planner, /공식 데이터 다시 조회/);
  assert.match(planner, /role=\{planError \? "alert" : "status"\}/);
});

test("only positive official accessibility evidence becomes a recommendation or itinerary stop", async () => {
  const [planner, tourism] = await Promise.all([
    plannerProductSource(),
    Promise.all([
      source("server/tourism/plan-builder.ts"),
      source("server/tourism/plan-model.ts"),
    ]).then((parts) => parts.join("\n")),
  ]);
  assert.match(tourism, /const leftVerified = left\.score === null \? 0 : 1/);
  assert.match(tourism, /rightVerified - leftVerified/);
  assert.match(tourism, /place\.score > 0 && \(place\.knownFields \?\? 0\) > 0/);
  assert.match(tourism, /recommended: places, exploration: explorationPlaces/);
  assert.match(tourism, /places\.filter\(hasPositiveOfficialEvidence\)/);
  assert.match(tourism, /evidenceState: "verified"/);
  assert.match(planner, /일반 추천과 내 일정에는 넣지 않았습니다/);
  assert.match(planner, /아직 일정에 추가한 장소가 없어요/);
  assert.match(planner, /공식 정보 확인 필요/);
  assert.doesNotMatch(planner, /PlannerRouteOverview|PlannerResultsPanel/);
  assert.match(planner, /String\(index \+ 1\)\.padStart\(2, "0"\)/);
  assert.doesNotMatch(planner, /<small>0\{index \+ 1\}<\/small>/);
});

test("transport and itinerary labels distinguish confirmed, estimated and unavailable values", async () => {
  const [planner, service, kakao, odsay] = await Promise.all([
    Promise.all([
      source("features/planner/components/RouteComparisonPanel.tsx"),
      source("features/planner/components/TripDayPlanner.tsx"),
    ]).then((parts) => parts.join("\n")),
    source("features/planner/components/PlannerServiceStatus.tsx"),
    source("server/transport/kakao-route.ts"),
    source("server/transport/odsay.ts"),
  ]);
  assert.match(planner, /확인된 경로/);
  assert.match(planner, /직선거리 기반 추정/);
  assert.match(planner, /경로 미확인 · 임시/);
  assert.match(planner, /시간 정보 없음/);
  assert.match(planner, /통행료 없음/);
  assert.match(planner, /제공기관 미제공/);
  assert.doesNotMatch(planner, /기본 이동/);
  assert.doesNotMatch(planner, /기본 예상/);
  assert.match(service, /state === "connected"/);
  assert.match(service, /인증키 연결과 실제 시간·운행정보 확인은 다른 상태입니다/);
  assert.match(kakao, /rawToll === undefined \|\| rawToll === null \|\| rawToll === "" \? null/);
  assert.match(odsay, /payment > 0 \? payment : null/);
});

test("shared trips recover from slow or malformed network responses", async () => {
  const [page, trips] = await Promise.all([
    Promise.all([
      source("features/trips/components/SharedTripScreen.tsx"),
      source("features/trips/hooks/useSharedTrip.ts"),
      source("features/trips/client/shared-trip.ts"),
    ]).then((parts) => parts.join("\n")),
    source("server/trips/handler.ts"),
  ]);
  assert.match(page, /new AbortController\(\)/);
  assert.match(page, /controller\.abort\("timeout"\)/);
  assert.match(page, /response\.json\(\)\.catch\(\(\) => null\)/);
  assert.match(page, /setRetry\(\(current\) => current \+ 1\)/);
  assert.match(page, /role="status"/);
  assert.match(page, /role="alert"/);
  assert.match(trips, /공유 여행을 불러오는 중 연결이 지연됐습니다/);
  assert.match(trips, /공유 여행을 저장하지 못했습니다/);
});
