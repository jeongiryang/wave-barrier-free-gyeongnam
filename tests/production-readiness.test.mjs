import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as facilities from "../lib/facility-selection.js";
import { explorationPlaceAction } from "../lib/exploration-place-action.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function plannerProductSource() {
  const paths = [
    "app/planner/page.tsx",
    "features/planner/components/PlannerServiceStatus.tsx",
    "features/planner/components/PlannerServiceDiagnostics.tsx",
    "features/planner/components/PlannerHeader.tsx",
    "features/planner/components/PlannerFooter.tsx",
    "components/SiteFooter.tsx",
    "features/planner/components/PlannerConditionsPanel.tsx",
    "features/planner/components/PlannerRegionDiscovery.tsx",
    "features/planner/components/TripSettingsEditor.tsx",
    "features/planner/components/PlannerItineraryBoard.tsx",
    "features/planner/components/StopEditor.tsx",
    "features/planner/components/PlaceResultRow.tsx",
    "components/GyeongnamRegionPicker.tsx",
    "features/planner/components/RecommendationWorkspace.tsx",
    "features/planner/components/RecommendationCarousel.tsx",
    "features/planner/components/PlaceFacilitySummary.tsx",
    "features/planner/components/ExplorationPlaces.tsx",
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
    "features/planner/components/TransportLiveSummary.tsx",
    "features/planner/components/ArrivalRetrievedAt.tsx",
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
    "features/landing/components/LandingIntro.tsx",
    "features/landing/components/LandingHeader.tsx",
    "features/landing/components/LandingHero.tsx",
    "features/landing/components/LandingChapters.tsx",
    "features/landing/components/LandingAssistantStory.tsx",
    "features/landing/components/LandingManifesto.tsx",
    "features/landing/components/LandingRegionStory.tsx",
    "features/landing/components/LandingClosing.tsx",
    "components/SiteFooter.tsx",
    "features/landing/components/LandingProductStories.tsx",
    "features/landing/components/LandingDiscoveryStories.tsx",
    "features/landing/components/LandingJourneyStories.tsx",
    "features/landing/components/LandingAdaptStory.tsx",
    "features/landing/components/LandingTravelBookStory.tsx",
  ];
  return (await Promise.all(paths.map(source))).join("\n");
}

async function styleSource() {
  const paths = [
    "app/globals.css",
    "app/styles/simple-wave.css",
    "app/styles/simple-planner.css",
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
  assert.equal(headers["Strict-Transport-Security"], "max-age=31536000");
  assert.match(headers["Content-Security-Policy"], /form-action 'self'/);
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(headers["Permissions-Policy"], /camera=\(\)/);
  assert.match(headers["Permissions-Policy"], /microphone=\(self\)/);

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

test("production metadata gives each route a canonical, social card and indexing boundary", async () => {
  const [layout, siteMetadata, planner, community, login, register, trip, robots, sitemap, manifest, readme] = await Promise.all([
    source("app/layout.tsx"),
    source("lib/site-metadata.ts"),
    source("app/planner/layout.tsx"),
    source("app/community/page.tsx"),
    source("app/login/page.tsx"),
    source("app/register/page.tsx"),
    source("app/trip/[id]/page.tsx"),
    source("app/robots.ts"),
    source("app/sitemap.ts"),
    source("app/manifest.ts"),
    source("README.md"),
  ]);
  assert.match(layout, /metadataBase: productionUrl/);
  assert.match(layout, /alternates: \{ canonical: "\/" \}/);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(layout, /card: "summary_large_image"/);
  assert.match(siteMetadata, /images: \[\{ url: SOCIAL_IMAGE/);
  assert.match(siteMetadata, /index: false, follow: false, noarchive: true/);
  for (const [route, content] of [["/planner", planner], ["/community", community], ["/login", login], ["/register", register]]) {
    assert.ok(content.includes(`path: "${route}"`), `${route} canonical metadata가 필요합니다.`);
  }
  assert.match(login, /index: false/);
  assert.match(register, /index: false/);
  assert.match(trip, /path: `\/trip\/\$\{encodeURIComponent\(id\)\}`/);
  assert.match(trip, /index: false/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(robots, /disallow: \["\/api\/"\]/);
  assert.doesNotMatch(robots, /"\/trip\/"/);
  assert.match(robots, /sitemap: `\$\{origin\}\/sitemap\.xml`/);
  assert.match(sitemap, /`\$\{origin\}\/planner`/);
  assert.match(sitemap, /`\$\{origin\}\/travel-book`/);
  assert.match(sitemap, /`\$\{origin\}\/photo-course`/);
  assert.doesNotMatch(sitemap, /`\$\{origin\}\/(?:login|register|trip)/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /src: "\/app-icon\.svg", sizes: "192x192"[\s\S]*src: "\/app-icon\.svg", sizes: "512x512"/);
  assert.match(manifest, /src: "\/maskable-icon\.svg", sizes: "192x192"[\s\S]*src: "\/maskable-icon\.svg", sizes: "512x512"/);
  assert.doesNotMatch(readme, /스페인어/);
  assert.match(readme, /공개 서비스는 한국어·밝은 화면/);
  assert.match(readme, /영어·어두운 화면은 개발 검수에서만 활성화/);
  assert.doesNotMatch(readme, /영어·일본어·중국어·프랑스어·독일어·러시아어/);
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
  assert.match(error, /window\.location\.reload\(\)/);
  assert.match(error, /<a href="\/planner"/);
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
  const [trips, feedback, http, requestBoundary] = await Promise.all([
    source("server/trips/itinerary-actions.ts"),
    source("server/trips/feedback-handler.ts"),
    source("server/shared/http.ts"),
    source("lib/security/request-boundaries.js"),
  ]);
  const requestGuard = `${http}\n${requestBoundary}`;
  assert.match(http, /function readTrustedJson/);
  assert.match(http, /content-type/);
  assert.match(http, /verifySameOriginMutation\(request, maxBytes\)/);
  assert.match(requestGuard, /sec-fetch-site/);
  assert.match(requestGuard, /origin !== requestUrl\.origin/);
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
  assert.match(authForm, /href="\/planner">로그인 없이 둘러보기/);
  assert.match(authForm, /href="\/forgot-password"/);
  assert.match(authForm, /autoComplete=\{auth\.registering \? "new-password" : "current-password"\}/);
  // 안내 문구는 문제가 된 칸에만 연결한다. 늘 비밀번호 칸에 붙여 두면 이메일이
  // 틀렸을 때도 비밀번호 칸이 이메일 오류를 읽어 준다.
  assert.match(authForm, /fieldProps\("password", auth\.registering \? "auth-password-help" : undefined\)/);
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

test("public product copy is release-ready and tourism data remains live", async () => {
  const [readme, landing, planner, tourismHandler, planBuilder, tourismPhotos, tourismInsights, tourismConcentration, enrichmentSources] = await Promise.all([
    source("README.md"),
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
  assert.doesNotMatch(`${landing}\n${planner}`, /공모전|심사용|출품용|기능 시연용/);
  assert.match(readme, /docs\/contest-compliance.md/);
  assert.match(readme, /TOUR_API_SERVICE_KEY_ENCODED/);
  assert.match(tourism, /KorService2/);
  assert.match(tourism, /KorWithService2/);
  assert.match(tourism, /PhotoGalleryService1/);
  assert.match(tourism, /LocgoHubTarService1/);
  assert.match(tourism, /TarRlteTarService1/);
});

test("place results keep photograph, readable details and the add action in one responsive row", async () => {
  const [css, row] = await Promise.all([source("app/styles/simple-planner.css"), source("features/planner/components/PlaceResultRow.tsx")]);
  const rule = css.match(/\.simple-place-row \{[^}]+\}/)?.[0] ?? "";
  assert.match(rule, /display: grid/);
  assert.match(rule, /grid-template-columns: 160px minmax\(0,1fr\) auto/);
  assert.match(css, /@media\(max-width:767px\)[\s\S]*\.simple-place-row \{ grid-template-columns: 88px minmax\(0,1fr\) auto/);
  assert.doesNotMatch(rule, /100vw/);
  const positions = ["simple-place-photo", "simple-place-copy", "simple-place-add"].map(name => row.indexOf('className="' + name + '"'));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(row, /aria-labelledby=\{id\}/);
  assert.match(row, /aria-pressed=\{saved\}/);
});

test("wide screens keep the full-width header and put the itinerary beside its map", async () => {
  const [shell, css] = await Promise.all([source("app/styles/planner-conversation.css"), source("app/styles/simple-planner.css")]);
  assert.match(shell, /\.wave-header \{[^}]*width: 100%/s);
  assert.match(css, /\.planner-simple \.simple-planner-heading,\.planner-simple \.planner-journey-workspace \{[^}]*width: min\(1600px,calc\(100% - var\(--wave-gutter\) \* 2\)\)/);
  assert.match(css, /\.simple-itinerary-board\[data-map=true\] \{ grid-template-columns: minmax\(360px,\.9fr\) minmax\(0,1\.1fr\)/);
  assert.match(css, /@media\(max-width:1023px\) \{ \.simple-itinerary-board\[data-map=true\] \.simple-timeboard \{ display: none/);
  assert.match(css, /\.simple-planner-tabs button \{[^}]*min-height: 48px/);
});

test("landing offers five fixed full-photo links then all eighteen and preserves the verified boundary data", async () => {
  const [landing, css] = await Promise.all([
    source("features/landing/components/LandingRegionStory.tsx"), source("app/styles/simple-wave.css"),
  ]);
  const first = JSON.parse(landing.match(/const firstRegions = (\[[^\n]+\]);/)?.[1] || "null");
  assert.deepEqual(first, ["통영", "거제", "남해", "하동", "산청"]);
  assert.match(landing, /orderedRegions\.slice\(0, expanded \? 18 : 5\)\.map/);
  assert.match(landing, /href=\{\x60\/planner\?region=\$\{encodeURIComponent\(name\)\}\x60\}/);
  assert.match(landing, /aria-controls="region-grid"/);
  assert.match(landing, /aria-expanded=\{expanded\}/);
  assert.doesNotMatch(landing, /regionPhotoSource|simple-region-credit|simple-region-culture|declining-region-notice|simple-region-arrow/);
  assert.doesNotMatch(landing, /setTimeout|setInterval|setAutomatic|RegionMascot|upload\.wikimedia\.org/i);
  const surface = await source("features/landing/components/RegionBoundarySurface.tsx");
  assert.match(surface, /viewBox="0 0 800 814"/);
  assert.match(surface, /data-region-boundary=\{region\.name\} data-selected=\{region\.name === selected\}/);
  assert.match(css, /\.simple-region-link > img \{ width: 100%; height: 100%; object-fit: cover/);
  assert.match(css, /\.simple-show-regions \{[^}]*min-height: 48px/);
  assert.match(landing, /prefers-reduced-motion: reduce/);
});

test("preserved feature previews retain their order and motion safety; current community invitation never writes", async () => {
  const [stories, storyCss, featureMotionCss, accountCss] = await Promise.all([
    Promise.all([
      source("features/landing/components/LandingDiscoveryStories.tsx"),
      source("features/landing/components/LandingJourneyStories.tsx"),
      source("features/landing/components/LandingAdaptStory.tsx"),
      source("features/landing/components/LandingTravelBookStory.tsx"),
    ]).then((parts) => parts.join("\n")),
    source("app/styles/landing-stories.css"),
    source("app/styles/landing-feature-motion.css"),
    source("app/styles/account-community.css"),
  ]);
  const css = `${storyCss}\n${featureMotionCss}\n${accountCss}`;
  const labels = [...stories.matchAll(/className="section-kicker">(\d{2} · [^<]+)</g)].map((match) => match[1]);
  assert.deepEqual(labels, ["01 · Your needs", "01 · 여행 조건", "02 · The evidence", "02 · 추천 근거", "03 · Your itinerary", "03 · 하루 일정", "04 · Each journey", "04 · 이동 경로", "05 · Before departure", "05 · 상황 대응", "06 · Keep your trip", "06 · 내 일정"]);
  assert.doesNotMatch(stories, /DISCOVER|ACCESS|PLAN|ROUTE|ADAPT|REMEMBER|COMMUNITY/);
  assert.equal((stories.match(/<div className="product-preview[^>]+role="img"[^>]+aria-label=/g) || []).length, 6);
  assert.equal((stories.match(/className="feature-preview-stage" aria-hidden="true"/g) || []).length, 6);
  assert.doesNotMatch(stories, /기능 화면 미리보기/);
  assert.doesNotMatch(stories, /<button\b/);
  for (const hook of ["route-demo-path", "route-demo-vehicle"]) {
    assert.match(stories, new RegExp(`className="[^"]*${hook}`));
  }
  const community = await source("components/WaveHeader.tsx");
  assert.match(community, /href="\/community"/);
  assert.match(community, /current === "community" \? "page"/);
  assert.doesNotMatch(community, /fetch\(|\.setItem\(|\.removeItem\(|createCommunityPost|<form\b|<input\b|<textarea\b/);
  assert.doesNotMatch(community, /useCommunityPreview|posts\.map|post\.(?:title|content)|aria-live/);
  for (const selector of ["route-demo-path", "route-demo-vehicle"]) {
    assert.match(css, new RegExp(`html\\[data-motion="calm"\\][\\s\\S]{0,400}\\.${selector}[\\s\\S]{0,300}animation: none`));
    assert.match(css, new RegExp(`@media \\(prefers-reduced-motion: reduce\\)[\\s\\S]*\\.${selector}[\\s\\S]{0,300}animation: none`));
  }
});

test("arrival intro hosts the approved renderer with explicit playback and bounded recovery", async () => {
  const [landing, intro, css] = await Promise.all([
    source("app/page.tsx"), source("features/landing/components/LandingIntro.tsx"), source("features/landing/components/LandingIntro.module.css"),
  ]);
  assert.match(intro, /import\("\.\.\/intro\/wave-intro"\)/);
  assert.doesNotMatch(intro, /EditorialPhoto|<img|<video/);
  assert.match(landing, /<LandingIntro \/><main/);
  assert.match(intro, /<dialog ref=\{dialog\}/);
  assert.match(intro, /onCancel=/);
  assert.match(intro, /건너뛰기/);
  assert.match(intro, /prefers-reduced-motion: reduce/);
  assert.match(intro, /onComplete=\{\(\)=>finishRef\.current\(\)\}/);
  assert.match(intro, /watchdog\s*=\s*setTimeout\([\s\S]*!ready\.current[\s\S]*8000\)/);
  assert.match(intro, /onFailure=\{\(\)=>finishRef\.current\(\)\}/);
  assert.doesNotMatch(intro, /일시정지|이전 장면|다음 장면/);
  assert.match(intro, /sessionStorage\.setItem\("wave-arrival-session-v1", "done"\)/);
  assert.match(intro, /clearTimeout\(watchdog\)/);
  assert.match(css, /\.scene\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(landing, /<LandingSectionProgress|<LandingAccountStory/);
});

test("interactive help follows real sections on every public journey and remains accessible on mobile", async () => {
  const [helpView, helpContent, helpController, communityHeader, landing, planner, css] = await Promise.all([
    source("components/HelpCenter.tsx"),
    source("features/help/tour-content.ts"),
    Promise.all([
      source("features/help/useHelpTour.ts"),
      source("features/help/useHelpTourFocus.ts"),
      source("features/help/useTourSpotlight.ts"),
    ]).then((parts) => parts.join("\n")),
    source("components/CommunityHeader.tsx"),
    landingProductSource(),
    plannerProductSource(),
    styleSource(),
  ]);
  const help = `${helpView}\n${helpContent}\n${helpController}`;
  assert.match(helpView, /useHelpTour\(\)/);
  assert.doesNotMatch(helpView, /useEffect|ResizeObserver|window\.scrollTo/);
  const ts = (await import("typescript")).default;
  const tours = {};
  new Function("exports", ts.transpileModule(helpContent, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(tours);
  assert.deepEqual(tours.landingSteps.map(step => step.selector), ["#top", "#regions", "#story", "#naru"]);
  assert.deepEqual(tours.plannerSteps.map(step => step.selector), ["#conditions", "#places", "#itinerary", "#departure-readiness"]);
  assert.deepEqual(tours.landingSteps.map(step => step.highlightSelector), ["#top .landing-hero-copy", ".simple-region-grid", ".night-journey-input", "#naru"]);
  assert.deepEqual(tours.plannerSteps.map(step => step.highlightSelector), [".simple-search-bar", ".simple-place-row", ".simple-stops > li, .simple-empty, .simple-itinerary-map", "#departure-readiness > summary"]);
  for (const [steps, content] of [[tours.landingSteps, landing], [tours.plannerSteps, planner]]) {
    for (const step of steps) {
      assert.ok(content.includes('id="' + step.selector.slice(1) + '"'), step.selector + " must exist in the current UI");
      const className = step.highlightSelector.match(/\.([\w-]+)/)?.[1];
      if (className) assert.ok(content.includes(className), step.highlightSelector + " must highlight real content");
      assert.ok(step.title && step.copy, step.selector + " must have useful accessible guidance");
    }
  }
  for (const selector of [".community-page", "#community-list", ".night-community-toolbar", ".travel-book-page", ".travel-book-paths", ".travel-book-list, .travel-book-empty"]) {
    assert.match(help, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(communityHeader, /WaveHeader/);
  assert.match(await source("components/WaveFooterTools.tsx"), /<HelpCenter \/>/);
  assert.match(landing, /id="story"/);
  assert.match(help, /window\.scrollTo\(\{ top: Math\.max\(0, targetTop\), behavior: reduced \? "auto" : "smooth" \}\)/);
  assert.match(help, /highlightSelector/);
  assert.match(help, /setHighlight\(null\)/);
  assert.match(help, /dialog\.top - gutter/);
  assert.match(help, /new ResizeObserver\(queueUpdate\)/);
  assert.match(help, /help-tour-spotlight/);
  assert.doesNotMatch(help, /help-tour-pointer/);
  assert.match(helpView, /강조된 테두리가 현재 설명하는 영역을 표시합니다/);
  assert.match(help, /aria-modal="true"/);
  assert.match(help, /createPortal\(tourLayer, document\.body\)/);
  const spotlightRule = css.match(/\.help-tour-spotlight \{[^}]+\}/)?.[0] ?? "";
  assert.doesNotMatch(spotlightRule, /transition:/);
  assert.match(help, /event\.key === "Escape"/);
  assert.match(help, /previousFocus\?\.focus\(\)/);
  assert.match(await source("components/WaveFooterTools.tsx"), /<HelpCenter \/>/);
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
  assert.match(await source("app/styles/planner-conversation.css"), /padding: max\(8px,env\(safe-area-inset-top,0px\)\)/);
  assert.match(css, /input, select, textarea \{ font-size: 16px; \}/);
  assert.match(css, /max-height: calc\(100svh - 20px\)/);
  assert.match(css, /\.place-actions button,[\s\S]*min-height: 44px/);
  assert.match(await source("app/styles/planner-conversation.css"), /@media \(max-width: 640px\)[\s\S]*width: 100%/);
  assert.match(css, /@media \(max-height: 520px\) and \(orientation: landscape\)/);
  assert.match(map, /className="map-command-scroll(?: [^"]+)?"/);
  assert.match(map, /className="map-expand-button"[\s\S]*⛶ 전체보기/);
  assert.match(css, /\.map-command-scroll \{[^}]*overflow-x: auto/);
  assert.doesNotMatch(css.match(/\.map-command-bar \{[^}]+\}/)?.[0] ?? "", /overflow-x: auto/);
});

test("region changes search directly, preserve previous results and retain a same-preference recovery action", async () => {
  const [planner, request] = await Promise.all([plannerProductSource(), plannerPlanSource()]);
  assert.match(planner, /automaticSearch\.current === searchKey/);
  assert.match(planner, /void runPlan\(\{ resetRouteData, resetAudio \}, false\)/);
  assert.match(planner, /같은 조건으로 다시 시도/);
  assert.match(planner, /아래는 이전 조건의 결과예요/);
  assert.match(planner, /onClick=\{\(\) => void onGenerate\(false\)\}/);
  assert.match(request, /planRequestRef\.current\?\.abort\(\)/);
  assert.match(request, /signal: controller\.signal/);
  assert.match(request, /resultSignature !== signature/);
  assert.match(request, /if \(!requestedRegion\) return false/);
  assert.doesNotMatch(request, /if \([^\n]*!(?:selected\.length|requestedTheme|travelStart)[^\n]*\) return false/);
  assert.match(request, /const resetPlan = useCallback/);
  assert.doesNotMatch(request.slice(0, request.indexOf("  const resetPlan =")), /setPlan\(null\)/);
});

test("planner visual order follows browsing, itinerary and optional departure checks in the DOM", async () => {
  const [page, board, css] = await Promise.all([
    source("app/planner/page.tsx"), source("features/planner/components/PlannerItineraryBoard.tsx"), source("app/styles/simple-planner.css"),
  ]);
  const sections = ["PlannerConditionsPanel", "RecommendationWorkspace", "PlannerItineraryWorkspace", "DepartureReadinessCard", "TravelSignalsPanel"];
  const positions = sections.map(component => page.indexOf("<" + component));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(page, /<div hidden=\{!browsing\} className="simple-browse-view"/);
  assert.match(page, /<div hidden=\{browsing\} className="simple-itinerary-view"/);
  assert.match(page, /<details className="simple-departure" id="departure-readiness"/);
  assert.ok(board.indexOf('className="simple-timeboard"') < board.indexOf('className="simple-itinerary-map"'));
  assert.match(css, /\.simple-stage-stream \[hidden\] \{ display: none !important/);
  assert.doesNotMatch(css, /flex-direction:\s*(?:row|column)-reverse/);
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
  assert.doesNotMatch(planController, /fallbackPlaces|demoPlaces/);
  assert.match(planner, /다시 시도/);
  assert.match(planner, /planError \? <div className="simple-result-notice" role="alert"/);
  assert.match(planner, /onClick=\{\(\) => void onGenerate\(false\)\}/);
});

test("official recommendations require every requested facility; unknown candidates need explicit review and absence stays excluded", async () => {
  const ts = (await import("typescript")).default;
  const code = ts.transpileModule(await source("server/tourism/plan-model.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const pureModule = { exports: {} };
  new Function("module", "exports", "require", code)(pureModule, pureModule.exports, name => {
    if (name === "../../lib/facility-selection.js") return facilities;
    if (name === "./provider-model") return { apiStatus() { throw new Error("This pure evidence test must not load providers"); } };
    throw new Error("Unexpected evidence dependency: " + name);
  });
  const { partitionPlacesByEvidence, hasPositiveOfficialEvidence, buildPlanStops } = pureModule.exports;
  const required = Object.freeze(["route", "restroom"]);
  const candidate = (id, states, extra = {}) => ({
    id, name: "공식 장소 " + id, city: "창원", score: 100, knownFields: 2, unknownFields: 0, negativeFields: 0,
    summary: "공식 소개", source: "공식 관광정보", features: ["접근로", "장애인 화장실"],
    accessibility: states.map((state, index) => ({ key: required[index], state })), ...extra,
  });
  const confirmed = candidate("1001", ["confirmed", "confirmed"]);
  const partial = candidate("1002", ["confirmed", "unknown"], { score: 50, knownFields: 1, unknownFields: 1 });
  const absent = candidate("1003", ["confirmed", "negative"], { score: 50, negativeFields: 1 });
  const failed = candidate("1004", ["unknown", "unknown"], { score: null, knownFields: 0, unknownFields: 2, facilityLookupState: "error" });
  // A numeric score cannot substitute for a missing requested item.
  const inflated = candidate("1005", ["confirmed"], { score: 100, knownFields: 2 });
  const places = [confirmed, partial, absent, failed, inflated];
  const original = structuredClone(places);
  const groups = partitionPlacesByEvidence(places, required);
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, items.map(item => item.id)])), {
    recommended: ["1001"], exploration: ["1002", "1004", "1005"], unavailable: ["1003"],
  });
  assert.equal(hasPositiveOfficialEvidence(partial), false);
  assert.equal(hasPositiveOfficialEvidence(absent), false);
  assert.equal(hasPositiveOfficialEvidence(failed), false);
  assert.deepEqual(buildPlanStops([confirmed, partial, absent, failed]).map(stop => ({ id: stop.id, state: stop.evidenceState })), [{ id: "1001", state: "verified" }]);
  assert.deepEqual(partitionPlacesByEvidence(places, []).recommended, places, "unselected facilities must not become hidden prerequisites");
  const extraUnrequestedAbsence = { ...confirmed, accessibility: [...confirmed.accessibility, { key: "parking", state: "negative" }] };
  assert.equal(facilities.classifyFacilities(extraUnrequestedAbsence, required), "match");
  assert.deepEqual(places, original, "classification must leave official records unchanged");

  const plan = { generatedAt: "2026-09-13T00:00:00Z", criteria: { facilityKeys: required }, explorationPlaces: [...groups.exploration, absent] };
  const inspect = (place, current = true) => explorationPlaceAction({ place, plan, current, region: "창원", criteriaKey: "required-route-restroom" });
  assert.equal(inspect(partial).kind, "acknowledge");
  assert.equal(inspect(partial).providerError, false);
  assert.equal(inspect(failed).kind, "acknowledge");
  assert.equal(inspect(failed).providerError, true);
  assert.equal(inspect(absent).kind, "mismatch");
  assert.equal(inspect(partial, false).kind, "blocked");
  assert.equal(inspect({ ...partial }).kind, "blocked", "consent belongs to the exact inspected result");

  const [builder, exploration, row, dialog] = await Promise.all([
    source("server/tourism/plan-builder.ts"), source("features/planner/components/ExplorationPlaces.tsx"),
    source("features/planner/components/PlaceResultRow.tsx"), source("features/planner/components/PlaceDecisionDialog.tsx"),
  ]);
  assert.match(builder, /partitionPlacesByEvidence\(rankedPlaces, requestedAccessibilityFields\(profiles\)\.map/);
  assert.match(exploration, /current=\{false\} unknown/);
  assert.match(row, /onClick=\{saved \? onToggle : unknown \? onDetails : onToggle\}/);
  assert.match(row, /담았음 · 되돌리기/);
  assert.match(dialog, /방문 전 확인할 후보로 담기/);
  assert.match(dialog, /disabled=\{!saved && canSave === false && !\(needsAcknowledgement && acknowledged\)\}/);
  assert.match(dialog, /onToggleSaved\(needsAcknowledgement && acknowledged \? explorationAction\.key : undefined\)/);
});
test("transport and itinerary labels distinguish confirmed, estimated and unavailable values", async () => {
  const [board, comparison, service, kakao, odsay] = await Promise.all([
    source("features/planner/components/PlannerItineraryBoard.tsx"),
    source("features/planner/components/RouteComparisonPanel.tsx"),
    Promise.all([
      source("features/planner/components/PlannerServiceStatus.tsx"),
      source("features/planner/components/PlannerServiceDiagnostics.tsx"),
    ]).then(parts => parts.join("\n")),
    source("server/transport/kakao-route.ts"),
    source("server/transport/odsay.ts"),
  ]);
  assert.match(board, /entry\.travelSource === 'route' \? \x60여기까지 이동 \$\{entry\.travelMinutes\}분\x60/);
  assert.match(board, /entry\.travelSource === 'estimate' \? \x60여기까지 이동 약 \$\{entry\.travelMinutes\}분 · 직선거리 추정\x60/);
  assert.match(board, /'여기까지 이동시간 미확인'/);
  assert.match(comparison, /시간 정보 없음/);
  assert.match(comparison, /통행료 없음/);
  assert.match(comparison, /제공기관 미제공/);
  assert.doesNotMatch(board + comparison, /기본 이동|기본 예상/);
  assert.match(service, /state === "connected"/);
  assert.match(service, /인증키 연결과 실제 시간·운행정보 확인은 다른 상태입니다/);
  assert.match(kakao, /typeof rawToll === "number" && Number\.isFinite\(rawToll\) && rawToll >= 0 \? rawToll : null/);
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
