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
    "features/planner/components/PlannerConditionsPanel.tsx",
    "features/planner/components/RecommendationWorkspace.tsx",
    "features/planner/components/TravelSignalsPanel.tsx",
    "features/planner/components/WeatherBoard.tsx",
    "features/planner/components/SituationImpactPanel.tsx",
    "features/planner/components/RegionalInsights.tsx",
    "features/planner/components/ThemeExplorer.tsx",
    "features/planner/components/NavigationWorkspace.tsx",
    "features/planner/components/TransportDataOverview.tsx",
    "features/planner/components/RouteMapWorkspace.tsx",
    "features/planner/components/PlannerResultsPanel.tsx",
  ];
  return (await Promise.all(paths.map(source))).join("\n");
}

async function landingProductSource() {
  const paths = [
    "app/page.tsx",
    "features/landing/content.ts",
    "features/landing/hooks/useLandingExperience.ts",
    "features/landing/components/LandingIntro.tsx",
    "features/landing/components/LandingHeader.tsx",
    "features/landing/components/LandingHero.tsx",
    "features/landing/components/LandingManifesto.tsx",
    "features/landing/components/LandingRegionStory.tsx",
    "features/landing/components/LandingClosing.tsx",
    "components/LandingStories.tsx",
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
    "app/styles/landing-motion.css",
    "app/styles/workspace-responsive.css",
    "app/styles/map-experience.css",
    "app/styles/map-workspace.css",
    "app/styles/map-place-tools.css",
    "app/styles/map-live-signals.css",
    "app/styles/situation-identity-refinements.css",
    "app/styles/ocean-intro-refinements.css",
    "app/styles/ocean-landing-refinements.css",
    "app/styles/ocean-planner-refinements.css",
    "app/styles/ocean-responsive-refinements.css",
    "app/styles/design-system.css",
    "app/styles/experience-accessibility.css",
  ];
  return (await Promise.all(paths.map(source))).join("\n");
}

test("shared styles keep stable cascade boundaries", async () => {
  const [layout, globalCss, siteShell, landingExplorer, landingRouteData, placeDialog, landingFoundations, plannerFoundations, regionalFoundations, themeItineraryFoundations, plannerWorkspace, landingMotion, workspaceResponsive, mapExperience, mapWorkspace, mapPlaceTools, mapLiveSignals, situationRefinements, oceanIntro, oceanLanding, oceanPlanner, oceanResponsive, designSystem, experience] = await Promise.all([
    source("app/layout.tsx"),
    source("app/globals.css"),
    source("app/styles/site-shell.css"),
    source("app/styles/landing-explorer.css"),
    source("app/styles/landing-route-data.css"),
    source("app/styles/place-dialog.css"),
    source("app/styles/landing-foundations.css"),
    source("app/styles/planner-foundations.css"),
    source("app/styles/regional-explorer-foundations.css"),
    source("app/styles/theme-itinerary-foundations.css"),
    source("app/styles/planner-workspace.css"),
    source("app/styles/landing-motion.css"),
    source("app/styles/workspace-responsive.css"),
    source("app/styles/map-experience.css"),
    source("app/styles/map-workspace.css"),
    source("app/styles/map-place-tools.css"),
    source("app/styles/map-live-signals.css"),
    source("app/styles/situation-identity-refinements.css"),
    source("app/styles/ocean-intro-refinements.css"),
    source("app/styles/ocean-landing-refinements.css"),
    source("app/styles/ocean-planner-refinements.css"),
    source("app/styles/ocean-responsive-refinements.css"),
    source("app/styles/design-system.css"),
    source("app/styles/experience-accessibility.css"),
  ]);
  const imports = [
    'import "./globals.css"',
    'import "./styles/site-shell.css"',
    'import "./styles/landing-explorer.css"',
    'import "./styles/landing-route-data.css"',
    'import "./styles/place-dialog.css"',
    'import "./styles/landing-foundations.css"',
    'import "./styles/planner-foundations.css"',
    'import "./styles/regional-explorer-foundations.css"',
    'import "./styles/theme-itinerary-foundations.css"',
    'import "./styles/planner-workspace.css"',
    'import "./styles/landing-motion.css"',
    'import "./styles/workspace-responsive.css"',
    'import "./styles/map-experience.css"',
    'import "./styles/map-workspace.css"',
    'import "./styles/map-place-tools.css"',
    'import "./styles/map-live-signals.css"',
    'import "./styles/situation-identity-refinements.css"',
    'import "./styles/ocean-intro-refinements.css"',
    'import "./styles/ocean-landing-refinements.css"',
    'import "./styles/ocean-planner-refinements.css"',
    'import "./styles/ocean-responsive-refinements.css"',
    'import "./styles/design-system.css"',
    'import "./styles/experience-accessibility.css"',
    'import "./styles/account-auth.css"',
    'import "./styles/community.css"',
    'import "./styles/account-community.css"',
  ].map((statement) => layout.indexOf(statement));
  assert.ok(imports.every((index) => index >= 0));
  assert.deepEqual([...imports].sort((a, b) => a - b), imports);
  assert.doesNotMatch(globalCss, /\/\* Intro \*\/|\/\* Hero \*\/|\/\* Route \*\/|\/\* Closing, modal, footer \*\//);
  assert.match(siteShell, /\/\* Intro \*\/[\s\S]*\/\* Header \*\//);
  assert.match(landingExplorer, /\/\* Hero \*\/[\s\S]*\/\* Places slider \*\//);
  assert.match(landingRouteData, /\/\* Route \*\/[\s\S]*\/\* API bento \*\//);
  assert.match(placeDialog, /\/\* Closing, modal, footer \*\//);
  assert.doesNotMatch(globalCss, /Marketing landing|Functional planner hierarchy|디자인 시스템 토큰과 패턴 통일|단계별 도움말 투어/);
  assert.match(landingFoundations, /Marketing landing/);
  assert.match(plannerFoundations, /Functional planner hierarchy/);
  assert.match(regionalFoundations, /Data-rich regional explorer/);
  assert.match(themeItineraryFoundations, /User-selected color theme[\s\S]*Shared itinerary/);
  assert.match(plannerWorkspace, /V5 — tool-first workspace/);
  assert.match(landingMotion, /stronger editorial motion/);
  assert.match(workspaceResponsive, /@media \(max-width: 900px\)/);
  assert.match(mapExperience, /V6 — Kakao-first map/);
  assert.match(mapWorkspace, /V7 — Kakao map workspace/);
  assert.match(mapPlaceTools, /V8\.1 — point selection/);
  assert.match(mapLiveSignals, /V8\.4 — map-native crowd forecast/);
  assert.match(situationRefinements, /실제 예보와 관광 집중률/);
  assert.match(oceanIntro, /Deep Ocean 통합 레이어[\s\S]*인트로/);
  assert.match(oceanLanding, /랜딩: 섹션 경계 없는 단일 수면/);
  assert.match(oceanPlanner, /플래너: 기능 단위로 끊어 읽는 구역/);
  assert.match(oceanResponsive, /뷰포트: 창 절반 폭까지 무너지지 않게/);
  assert.match(designSystem, /--shadow-3:/);
  assert.match(designSystem, /:focus-visible/);
  assert.match(experience, /html\[data-motion="calm"\] \.hero-wave-canvas/);
  assert.match(experience, /포인터 종류와 화면 폭에 관계없이/);
});

test("production configuration is Vercel-only", async () => {
  const [vercel, packageJson, readme] = await Promise.all([
    source("vercel.json"),
    source("package.json"),
    source("README.md"),
  ]);
  const content = `${vercel}\n${packageJson}\n${readme}`;
  assert.doesNotMatch(content, /chatgpt\.site|onrender\.com|wrangler\.toml|build:cloudflare/i);
  assert.match(vercel, /npm run build:vercel/);
  const gitignore = await source(".gitignore");
  assert.match(gitignore, /\/\.vinext\//);
  assert.doesNotMatch(gitignore, /sites-runtime|wrangler/);
});

test("missing tourism images use official live lookup and a visual fallback", async () => {
  const [component, planner, photos, catalog] = await Promise.all([
    Promise.all([
      source("features/tourism/components/SmartSpotImage.tsx"),
      source("features/tourism/hooks/useOfficialSpotImage.ts"),
      source("features/tourism/client/spot-photo.ts"),
    ]).then((parts) => parts.join("\n")),
    plannerProductSource(),
    Promise.all([
      source("server/tourism/region-photo.ts"),
      source("server/tourism/spot-photo.ts"),
    ]).then((parts) => parts.join("\n")),
    source("server/tourism/catalog.ts"),
  ]);
  assert.match(component, /action: "spot-photo"/);
  assert.match(component, /contentId/);
  assert.match(component, /smart-image-skeleton/);
  assert.match(component, /공식 사진 준비 중/);
  assert.match(planner, /className=\{`place-visual visual-/);
  assert.match(planner, /region=\{place\.city \|\| region\}/);
  assert.match(planner, /contentId=\{place\.id\}/);
  assert.match(photos, /PhotoGalleryService1/);
  assert.match(photos, /searchKeyword2/);
  assert.match(photos, /detailCommon2/);
  assert.match(photos, /scoreSpotPhotoTitle/);
  assert.match(photos, /for \(const keyword of keywords\)/);
  assert.doesNotMatch(photos, /Promise\.all\(keywords\.map/);
  assert.match(photos, /regionPhotoFallbackKeywords/);
  assert.match(catalog, /남해 다랭이마을/);
  assert.match(catalog, /산청 황매산/);
  const regionalPhoto = await source("server/tourism/region-photo.ts");
  assert.match(regionalPhoto, /PhotoGalleryService1/);
  assert.match(regionalPhoto, /KorService2/);
  assert.match(regionalPhoto, /searchKeyword2/);
  assert.match(regionalPhoto, /for \(const keyword of keywords\)/);
});

test("all eighteen regions use original W.A.V.E travel characters instead of emoji markers", async () => {
  const [landing, mascot] = await Promise.all([
    landingProductSource(),
    source("components/RegionMascot.tsx"),
  ]);
  const names = ["거창", "합천", "창녕", "밀양", "양산", "함양", "산청", "의령", "함안", "김해", "창원", "하동", "진주", "사천", "고성", "남해", "통영", "거제"];
  for (const name of names) assert.match(mascot, new RegExp(`${name}:`));
  const characterConfig = mascot.slice(mascot.indexOf("const regionCharacters"), mascot.indexOf("function MotifMark"));
  assert.equal((characterConfig.match(/nickname: "/g) || []).length, 18);
  assert.match(landing, /<RegionMascot region=\{region\.name\} size=\{25\}/);
  assert.match(landing, /<RegionMascot region=\{active\.name\} size=\{54\}/);
  const regionConfig = landing.slice(landing.indexOf("export const landingRegions"), landing.indexOf("export const landingValues"));
  assert.doesNotMatch(regionConfig, /[🎭🎬🌾🎶⛰🌱🌿⚔🔥🏺🌸🍵🏮✈🦕🏘⛵🌼]/u);
});

test("device location is not persisted with saved routes", async () => {
  const map = await source("features/routing/useMapJourneyActions.ts");
  const saveRoute = map.slice(map.indexOf("const saveRoute"), map.indexOf("const shareRoute"));
  assert.doesNotMatch(saveRoute, /origin\s*,|geometry|mapX|mapY|lat:|lng:/);
  assert.match(saveRoute, /places\.slice/);
});

test("transport provider placeholders settle even when health lookup fails", async () => {
  const [planner, signals, viewModel] = await Promise.all([
    plannerProductSource(),
    source("features/planner/hooks/usePlannerSignals.ts"),
    source("features/planner/view-model.ts"),
  ]);
  assert.match(viewModel, /keyHealthChecked \? "error" : "checking"/);
  assert.match(signals, /setKeyHealthChecked\(true\)/);
  assert.match(planner, /effectiveProviders\.map/);
});

test("pull requests must be revalidated against the latest main", async () => {
  const [rules, template] = await Promise.all([
    source("CLAUDE.md"),
    source(".github/pull_request_template.md"),
  ]);
  assert.match(rules, /git merge-base --is-ancestor origin\/main HEAD/);
  assert.match(rules, /이전 커밋의 성공 결과는 재사용하지 않는다/);
  assert.match(template, /최신 `origin\/main`/);
  assert.match(template, /npm run typecheck/);
  assert.match(rules, /`syt83`, `unknownamed`를 모두 reviewer/);
  assert.match(template, /PR 작성자를 담당자\(assignee\)/);
  assert.match(template, /기존 라벨/);
});

test("new issues receive an owner and a safe default label", async () => {
  const [workflow, rules] = await Promise.all([
    source(".github/workflows/issue-triage.yml"),
    source("CLAUDE.md"),
  ]);
  assert.match(workflow, /issues:\s*write/);
  assert.match(workflow, /assignees: \["jeongiryang"\]/);
  assert.match(workflow, /labels = \["enhancement"\]/);
  assert.match(workflow, /labels = \["bug"\]/);
  assert.match(workflow, /process\.env\.ISSUE_TITLE/);
  assert.doesNotMatch(workflow, /const title = [`'"]\$\{\{/);
  assert.match(rules, /최신 `main`을 기준으로 중복·적합성/);
  assert.match(rules, /판단의 근거를 이슈 코멘트로 남긴다/);
});

test("autonomous work stays bounded and merges only after fresh checks", async () => {
  const rules = await source("CLAUDE.md");
  assert.match(rules, /최신 `main` 반영, 전체 로컬 검사와 새 HEAD의 CI 성공/);
  assert.match(rules, /실패·대기 중 검사는 우회하지 않고/);
  assert.match(rules, /선행 PR의 결과가 필요한\s*작업은 그 PR이 병합된 최신 `main`/);
  assert.match(rules, /승인된 범위의 완료 조건/);
  assert.doesNotMatch(rules, /모든 오류와 버그를 찾아내기 전에는/);
});

test("semantic releases are created from merged main commits with least privilege", async () => {
  const [backfill, current, backfillWorkflow, releaseWorkflow] = await Promise.all([
    source("scripts/backfill-releases.mjs"),
    source("scripts/release-current.mjs"),
    source(".github/workflows/release-backfill.yml"),
    source(".github/workflows/release.yml"),
  ]);
  assert.match(backfill, /\["v0\.7\.2", 37, "c71a9e9c25ec1f1b7491cf14c081f4c4e57dd3b1"/);
  assert.match(backfill, /\["v0\.7\.3", 38, "c0cf3f37ab4b689494c34477f990d76422dae84c"/);
  assert.match(backfill, /\["v0\.7\.4", 39, "1e7031c156b6d6553e34bf565ec3ccb0e1355f62"/);
  assert.match(backfill, /\["v0\.7\.5", 40, "950da810b013ab09b519cab438b8e557298f3b3a"/);
  assert.match(backfill, /\["v0\.7\.6", 41, "d4017fe0cd7654829a86695ff7338d456a1db526"/);
  assert.match(backfill, /\["v0\.8\.0", 42, "\$CURRENT"/);
  assert.match(backfill, /accidentalRef\?\.object\.sha === accidentalRelease\.sha/);
  assert.match(backfill, /accidentalPublishedRelease\?\.body\?\.includes\(accidentalRelease\.bodyMarker\)/);
  assert.doesNotMatch(backfill, /github\("\/git\/refs",/);
  assert.match(backfill, /execFileSync\("git", \["push", "origin", `refs\/tags\/\$\{release\.version\}`\]/);
  assert.doesNotMatch(backfill, /target_commitish: target/);
  assert.match(current, /subject\.startsWith\("feat:"\)/);
  assert.match(current, /BACKFILL_BASELINE = "v0\.8\.0"/);
  assert.match(current, /과거 릴리즈 백필/);
  assert.match(current, /target_commitish: process\.env\.GITHUB_SHA/);
  assert.match(current, /ref\.object\.sha !== process\.env\.GITHUB_SHA/);
  assert.match(backfillWorkflow, /workflow_dispatch:/);
  assert.match(backfillWorkflow, /permissions:\s*\n\s*contents: read/);
  assert.match(backfillWorkflow, /secrets\.RELEASE_GITHUB_TOKEN/);
  assert.match(releaseWorkflow, /permissions:\s*\n\s*contents: write/);
  assert.match(releaseWorkflow, /tests\/repository-policy\.test\.mjs/);
  assert.match(releaseWorkflow, /paths-ignore:/);
  assert.doesNotMatch(`${backfillWorkflow}\n${releaseWorkflow}`, /pull_request_target/);
});

test("saved preferences survive a reload", async () => {
  const [context, storage] = await Promise.all([
    source("features/preferences/context.tsx"),
    source("features/preferences/storage.ts"),
  ]);
  // 저장된 값을 읽기 전에 기본값을 써 버리면 이용자가 고른 테마와 언어가 지워진다.
  // 읽기가 끝났음을 알리는 표시가 있고, 저장이 그 뒤에만 일어나야 한다.
  assert.match(context, /const stored = readStoredPreferences\(\)/);
  assert.match(context, /setMotion\(stored\.motion\)[\s\S]*setHydrated\(true\)/);
  assert.match(context, /if \(hydrated\) writeStoredPreferences/);
  assert.match(storage, /localStorage\.getItem\("wave-theme"\)/);
  assert.match(storage, /try\s*\{[\s\S]*localStorage\.setItem\("wave-theme"[\s\S]*\}\s*catch/);
});

test("wave motion preference is persisted, localized and respects reduced motion", async () => {
  const [storage, controls, translations, renderer, intro, css] = await Promise.all([
    source("features/preferences/storage.ts"),
    source("features/preferences/PreferenceControls.tsx"),
    source("features/preferences/translations.ts"),
    source("features/motion/useWaveFieldRenderer.ts"),
    source("features/landing/useLandingIntro.ts"),
    styleSource(),
  ]);
  assert.match(storage, /localStorage\.getItem\("wave-motion"\)/);
  assert.match(storage, /localStorage\.setItem\("wave-motion", preferences\.motion\)/);
  assert.match(controls, /aria-pressed=\{motion === "calm"\}/);
  assert.match(controls, /<details className="preference-controls">/);
  assert.match(translations, /export const motionCopy: Record<Locale/);
  assert.match(renderer, /motion === "calm" \|\| window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(intro, /motion === "calm" \|\| reducedMotion \|\| seen \? "hidden" : "show"/);
  assert.match(intro, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.match(css, /html\[data-motion="calm"\] \.hero-wave-canvas \{ display: none; \}/);
});

test("non-Korean locales are visibly marked Beta without breaking narrow headers", async () => {
  const [translations, controls, css] = await Promise.all([
    source("features/preferences/translations.ts"),
    source("features/preferences/PreferenceControls.tsx"),
    source("app/styles/preferences.css"),
  ]);
  assert.match(translations, /id: "ko"[^\n]+beta: false/);
  assert.equal((translations.match(/beta: true/g) || []).length, 7);
  assert.match(controls, /item\.beta \? " · Beta"/);
  assert.match(controls, /selectedLocale\.beta \? "Beta 번역"/);
  assert.match(css, /\.preference-controls > summary \{[\s\S]*min-height: 44px/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*\.preference-panel \{ position: fixed/);
});

test("planner ignores stale route, enrichment and location-search responses", async () => {
  const [plannerSignals, routePlanning, locationSearch, service] = await Promise.all([
    source("features/planner/hooks/usePlannerSignals.ts"),
    source("features/planner/hooks/useRoutePlanning.ts"),
    source("features/planner/hooks/useLocationSearch.ts"),
    source("features/planner/services/api.ts"),
  ]);
  assert.match(routePlanning, /routeRequestRef\.current\?\.abort\(\)/);
  assert.match(routePlanning, /routeRequestRef\.current !== controller/);
  assert.match(plannerSignals, /enrichmentRequestRef\.current\?\.abort\(\)/);
  assert.match(plannerSignals, /enrichmentRequestRef\.current !== controller/);
  assert.match(locationSearch, /searchRequestRef\.current\?\.abort\(\)/);
  assert.match(locationSearch, /searchRequestRef\.current !== controller/);
  assert.match(routePlanning, /`\/api\/route\?\$\{params\.toString\(\)\}`,[^;]+signal: controller\.signal/);
  assert.match(plannerSignals, /action: "enrich"[\s\S]+signal: controller\.signal/);
  assert.match(locationSearch, /\/api\/location-search\?q=[\s\S]+signal: controller\.signal/);
  assert.match(service, /parentSignal\?\.addEventListener\("abort"/);
  assert.match(service, /timeoutMs = 12000/);
  assert.match(routePlanning, /useEffect\(\(\) => \(\) => routeRequestRef\.current\?\.abort\(\)/);
});

test("planner state is divided into testable feature hooks without overwriting saved trips", async () => {
  const [planner, planController, participation, tripSelection, routePlanning, routeOrigin, routeView, signals, audioGuide, chrome] = await Promise.all([
    plannerProductSource(),
    source("features/planner/hooks/usePlannerPlan.ts"),
    source("features/planner/hooks/usePlannerParticipation.ts"),
    source("features/planner/hooks/useTripSelection.ts"),
    source("features/planner/hooks/useRoutePlanning.ts"),
    source("features/planner/hooks/useRouteOrigin.ts"),
    source("features/planner/hooks/useRouteView.ts"),
    source("features/planner/hooks/usePlannerSignals.ts"),
    source("features/planner/hooks/useAudioGuide.ts"),
    source("features/planner/hooks/usePlannerChrome.ts"),
  ]);
  for (const hook of ["usePlannerPlan", "usePlannerParticipation", "useTripSelection", "useRoutePlanning", "usePlannerSignals", "useAudioGuide", "useLocationSearch", "usePlannerChrome"]) {
    assert.match(planner, new RegExp(`${hook}\\(`));
  }
  assert.doesNotMatch(planner, /localStorage\.setItem\("wave-saved-places"/);
  assert.match(tripSelection, /const \[storageReady, setStorageReady\] = useState\(false\)/);
  assert.match(tripSelection, /localStorage\.getItem\(SAVED_PLACES_KEY\)[\s\S]+setStorageReady\(true\)/);
  assert.match(tripSelection, /if \(!storageReady\) return;[\s\S]+localStorage\.setItem\(SAVED_PLACES_KEY/);
  assert.match(routeView, /routeSort === "walk"[\s\S]+a\.totalWalk - b\.totalWalk/);
  assert.match(routePlanning, /useRouteView\(routeAlternatives, transportContext\)/);
  assert.match(routePlanning, /useRouteOrigin\(clearPrivateOriginRoutes\)/);
  assert.match(routeOrigin, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(routeOrigin, /좌표는 서버나 저장소로 전송하지 않습니다/);
  assert.doesNotMatch(routePlanning, /navigator\.geolocation/);
  assert.match(routePlanning, /nextOriginLabel/);
  assert.doesNotMatch(planner, /routeRequestRef|setRouteAlternatives\(/);
  assert.doesNotMatch(planner, /enrichmentRequestRef|setKeyHealth\(|setWeather\(/);
  assert.doesNotMatch(planner, /setPlanError\(|planRequestRef/);
  assert.doesNotMatch(planner, /plannerJson|setShareState\(|setFeedbackState\(/);
  assert.match(planController, /plannerJson<PlanData>/);
  assert.match(planController, /const abortPlan = useCallback/);
  assert.match(participation, /plannerJson<\{ url\?: string \}>\("\/api\/trips"/);
  assert.match(participation, /plannerJson<\{ ok\?: boolean \}>\("\/api\/feedback"/);
  assert.match(participation, /navigator\.clipboard\?\.writeText\(data\.url\)/);
  assert.match(signals, /optionalPlannerJson<KeyHealth>\("\/api\/health"\)/);
  assert.match(signals, /optionalPlannerJson<WeatherData>/);
  assert.match(audioGuide, /const resetAudio = useCallback/);
  assert.match(chrome, /window\.cancelAnimationFrame\(frame\)/);
});

test("the server entry delegates shared policy and provider domains to focused modules", async () => {
  const [worker, env, http, providerFacade, providerNormalizers, tourismProvider, publicTransportProvider, weather, location, transport, transportContext, odsay, kakaoRoute, transportHealth, tourism, planBuilder, restoration, tourismCatalog, tourismModels, tourismPhotos, regionPhoto, spotPhoto, tourismInsights, tourismConcentration, enrichmentSources, regionalEnrichment, waterTravel, expresswayRests, visitorDemand, trips, tripActions, tripDatabase, tripFeedback] = await Promise.all([
    source("worker/index.ts"),
    source("server/shared/env.ts"),
    source("server/shared/http.ts"),
    source("server/shared/provider-data.ts"),
    source("server/shared/provider-normalizers.ts"),
    source("server/shared/tourism-provider.ts"),
    source("server/shared/public-transport-provider.ts"),
    Promise.all([
      source("server/weather/handler.ts"),
      source("server/weather/catalog.ts"),
      source("server/weather/model.ts"),
      source("server/weather/open-meteo.ts"),
    ]).then((parts) => parts.join("\n")),
    source("server/location/handler.ts"),
    source("server/transport/handler.ts"),
    source("server/transport/public-context.ts"),
    source("server/transport/odsay.ts"),
    source("server/transport/kakao-route.ts"),
    source("server/transport/health.ts"),
    source("server/tourism/handler.ts"),
    source("server/tourism/plan-builder.ts"),
    source("server/tourism/shared-plan-restoration.ts"),
    source("server/tourism/catalog.ts"),
    source("server/tourism/models.ts"),
    source("server/tourism/photos.ts"),
    source("server/tourism/region-photo.ts"),
    source("server/tourism/spot-photo.ts"),
    source("server/tourism/insights.ts"),
    source("server/tourism/concentration.ts"),
    source("server/tourism/enrichment-sources.ts"),
    source("server/tourism/regional-enrichment.ts"),
    source("server/tourism/water-travel.ts"),
    source("server/tourism/expressway-rests.ts"),
    source("server/tourism/visitor-demand.ts"),
    source("server/trips/handler.ts"),
    source("server/trips/itinerary-actions.ts"),
    source("server/trips/database.ts"),
    source("server/trips/feedback-handler.ts"),
  ]);
  assert.match(worker, /import \{ portableEnv \} from "\.\.\/server\/shared\/env"/);
  assert.match(worker, /import \{ json \} from "\.\.\/server\/shared\/http"/);
  assert.match(worker, /handleWaveApi/);
  assert.match(worker, /handleHealthApi, handleMapConfig, handleRouteApi/);
  assert.match(worker, /if \(url\.pathname === "\/api\/weather"\) return handleWeatherApi\(request\)/);
  assert.match(worker, /if \(url\.pathname === "\/api\/location-search"\) return handleLocationSearch\(request, env\)/);
  assert.doesNotMatch(worker, /api\.open-meteo\.com|dapi\.kakao\.com/);
  assert.doesNotMatch(worker, /async function fetchKto|async function fetchPublicTransport|function normalizeItems|async function handleRouteApi|async function handleWaveApi|async function handleTripsApi/);
  assert.match(env, /typeof process === "undefined" \? \{\} : process\.env/);
  assert.match(http, /x-content-type-options/);
  assert.match(providerFacade, /export \* from "\.\/provider-normalizers"/);
  assert.match(providerFacade, /export \* from "\.\/tourism-provider"/);
  assert.match(providerFacade, /export \* from "\.\/public-transport-provider"/);
  assert.match(providerNormalizers, /export function normalizeXmlItems/);
  assert.match(tourismProvider, /export async function fetchTourismData/);
  assert.match(tourismProvider, /export async function fetchRegionalList/);
  assert.match(publicTransportProvider, /export async function fetchPublicTransportData/);
  assert.match(`${tourismProvider}\n${publicTransportProvider}`, /AbortSignal\.timeout\(9500\)/);
  assert.match(transport, /export async function handleRouteApi/);
  assert.match(transport, /fetchTransportContext/);
  assert.match(transport, /Promise\.all\(\[/);
  assert.doesNotMatch(transport, /api\.odsay\.com|apis-navi\.kakaomobility\.com|travelerTrainRunPlan2/);
  assert.match(transportContext, /travelerTrainRunPlan2/);
  assert.match(transportContext, /getCrdntPrxmtSttnList/);
  assert.match(odsay, /api\.odsay\.com\/v1\/api\/searchPubTransPathT/);
  assert.match(kakaoRoute, /apis-navi\.kakaomobility\.com\/v1\/directions/);
  assert.match(transportHealth, /export function handleHealthApi/);
  assert.match(tourism, /export async function handleWaveApi/);
  assert.doesNotMatch(tourism, /export async function buildPlan|restoreSharedPlan|mergePlaces/);
  assert.match(planBuilder, /export async function buildPlan/);
  assert.match(restoration, /export async function restoreSharedPlan/);
  assert.doesNotMatch(`${tourism}\n${planBuilder}`, /regionPhotoKeywords|normalizeXmlItems|calculateAccessibilityEvidence/);
  assert.match(tourismCatalog, /export const regionCodes/);
  assert.match(tourismModels, /calculateAccessibilityEvidence/);
  assert.match(tourismPhotos, /export \{ fetchPhoto, photoFrom \} from "\.\/region-photo"/);
  assert.match(regionPhoto, /export async function fetchPhoto/);
  assert.match(spotPhoto, /export async function fetchSpotPhoto/);
  assert.match(tourismInsights, /export async function buildEnrichment/);
  assert.match(tourismInsights, /fetchEnrichmentSources/);
  assert.doesNotMatch(tourismInsights, /GoCamping|DataLabService|TatsCnctrRateService/);
  assert.match(tourismConcentration, /TatsCnctrRateService/);
  assert.match(regionalEnrichment, /GoCamping/);
  assert.match(waterTravel, /B500001\/myportal\/travel/);
  assert.match(expresswayRests, /data\.ex\.co\.kr\/openapi\/restinfo\/restThemeList/);
  assert.doesNotMatch(enrichmentSources, /GoCamping|B500001|data\.ex\.co\.kr/);
  assert.match(visitorDemand, /DataLabService/);
  assert.match(trips, /export async function handleTripsApi/);
  assert.match(trips, /loadSharedTrip/);
  assert.match(tripActions, /export async function saveSharedTrip/);
  assert.match(tripFeedback, /export async function handleFeedbackApi/);
  assert.match(tripDatabase, /CREATE TABLE IF NOT EXISTS itineraries/);
  assert.match(providerNormalizers, /export function normalizeXmlItems/);
  assert.match(weather, /AbortSignal\.timeout\(8000\)/);
  assert.match(weather, /export function resolveWeatherRegion/);
  assert.match(weather, /export function normalizeWeatherForecast/);
  assert.match(weather, /export async function fetchOpenMeteoForecast/);
  assert.match(weather, /return json\(normalizeWeatherForecast\(raw, region\), 200, true\)/);
  assert.match(location, /AbortSignal\.timeout\(7000\)/);
});

test("route-map rendering delegates controller, provider adapters, controls and domain helpers", async () => {
  const [map, controller, layers, drawing, nearby, roadview, journeyActions, mapShell, commandBar, nearbyPanel, placePanel, planner, types, sdk, helpers, renderer, kakaoRenderer, leafletRenderer, imageExport] = await Promise.all([
    source("components/RouteMap.tsx"),
    source("features/routing/useRouteMapController.ts"),
    source("features/routing/useMapLayers.ts"),
    source("features/routing/useMapDrawingTools.ts"),
    source("features/routing/useNearbyPlaces.ts"),
    source("features/routing/useRoadviewController.ts"),
    source("features/routing/useMapJourneyActions.ts"),
    source("features/routing/useMapShell.ts"),
    source("features/routing/components/MapCommandBar.tsx"),
    source("features/routing/components/NearbyPlacesPanel.tsx"),
    source("features/routing/components/MapPlacePanel.tsx"),
    plannerProductSource(),
    source("features/routing/types.ts"),
    source("features/routing/kakao-sdk.ts"),
    source("features/routing/map-utils.ts"),
    source("features/routing/useMapRenderer.ts"),
    source("features/routing/kakao-map-renderer.ts"),
    source("features/routing/leaflet-map-renderer.ts"),
    source("features/routing/export-route-image.ts"),
  ]);
  assert.match(map, /useRouteMapController\(props\)/);
  assert.doesNotMatch(map, /useState|useEffect|useMapRenderer/);
  assert.match(controller, /useMapJourneyActions\(\{/);
  assert.match(controller, /useMapShell\(\{/);
  assert.match(controller, /useMapRenderer\(\{/);
  assert.match(controller, /useMapLayers\(kakaoMapRef\)/);
  assert.match(controller, /useMapDrawingTools\(\{ drawingManagerRef, setProviderDetail \}\)/);
  assert.match(controller, /useNearbyPlaces\(\{ kakaoMapRef, choosePlace \}\)/);
  assert.match(controller, /useRoadviewController\(\{ provider, setProviderDetail, setPickMode, setToolPanel \}\)/);
  assert.doesNotMatch(controller, /categorySearch|manager\.select|RoadviewClient|addOverlayMapTypeId/);
  assert.match(layers, /addOverlayMapTypeId/);
  assert.match(drawing, /manager\.select/);
  assert.match(nearby, /categorySearch/);
  assert.match(roadview, /RoadviewClient/);
  assert.match(journeyActions, /exportRouteImage/);
  assert.match(journeyActions, /navigator\.geolocation/);
  assert.match(mapShell, /requestFullscreen/);
  assert.doesNotMatch(controller, /navigator\.geolocation|localStorage\.setItem|requestFullscreen/);
  assert.match(map, /<MapCommandBar/);
  assert.match(map, /<NearbyPlacesPanel/);
  assert.doesNotMatch(map, /className="map-command-scroll"|className="map-poi-list"|className="map-place-copy"/);
  assert.match(commandBar, /className="map-command-scroll"/);
  assert.match(nearbyPanel, /className="map-poi-list"/);
  assert.match(placePanel, /className="map-place-copy"/);
  assert.doesNotMatch(`${map}\n${controller}`, /loadKakaoSdk|L\.tileLayer|new K\.Map|canvas\.width = 1600/);
  assert.match(planner, /import type \{ MapPlace \} from "\.\.\/\.\.\/routing\/types"/);
  assert.match(types, /export type RouteAlternative/);
  assert.match(sdk, /Kakao SDK load timed out/);
  assert.match(sdk, /data-wave-kakao/);
  assert.match(helpers, /export function summarizeMeasurements/);
  assert.match(helpers, /export function safeMapImageUrl/);
  assert.match(renderer, /renderKakaoMap\(key, context, isCancelled\)/);
  assert.match(renderer, /renderLeafletMap\(context, isCancelled\)/);
  assert.doesNotMatch(renderer, /loadKakaoSdk|L\.tileLayer|new K\.Map/);
  assert.match(kakaoRenderer, /loadKakaoSdk/);
  assert.match(kakaoRenderer, /new K\.Map/);
  assert.match(leafletRenderer, /OpenStreetMap contributors/);
  assert.match(leafletRenderer, /L\.tileLayer/);
  assert.match(renderer, /return \(\) => \{/);
  assert.match(imageExport, /canvas\.width = 1600/);
  assert.match(imageExport, /URL\.revokeObjectURL/);
});

test("the wave canvas delegates its renderer, motion math and intro-mask rasterization", async () => {
  const [wave, renderer, model, masks] = await Promise.all([
    source("components/WaveField.tsx"),
    source("features/motion/useWaveFieldRenderer.ts"),
    source("features/motion/wave-model.ts"),
    source("features/motion/intro-masks.ts"),
  ]);
  assert.match(wave, /useWaveFieldRenderer\(\{ tone, mode, wordmark, motion \}\)/);
  assert.doesNotMatch(wave, /useEffect|requestAnimationFrame|createIntroMasks/);
  assert.match(renderer, /import \{ createIntroMasks \} from "\.\/intro-masks"/);
  assert.match(renderer, /const \{ tints, background \} = wavePalette\(tone\)/);
  assert.doesNotMatch(renderer, /new Float32Array\(SIN_STEPS\)|target\.bezierCurveTo/);
  assert.match(model, /const SIN_STEPS = 4096/);
  assert.match(model, /export const fastSin/);
  assert.match(model, /export function stageWeight/);
  assert.match(masks, /target\.bezierCurveTo/);
  assert.match(masks, /target\.arc\(ux\(6\), uy\(28\)/);
  assert.match(masks, /target\.fillText\(wordmark, centerX, centerY\)/);
});

test("every user-facing footer exposes the repository with an accessible tooltip", async () => {
  const [link, landing, planner, shared, css] = await Promise.all([
    source("components/GithubFooterLink.tsx"),
    landingProductSource(),
    plannerProductSource(),
    source("app/trip/[id]/page.tsx"),
    styleSource(),
  ]);
  assert.match(link, /https:\/\/github\.com\/jeongiryang\/wave-barrier-free-gyeongnam/);
  assert.match(link, /aria-label="W\.A\.V\.E GitHub 저장소 열기"/);
  assert.match(link, /data-tooltip="GitHub"/);
  for (const page of [landing, planner, shared]) assert.match(page, /<GithubFooterLink \/>/);
  assert.match(css, /\.github-footer-link \{ width: 44px; height: 44px/);
  assert.match(css, /\.github-footer-link:hover::after,.github-footer-link:focus-visible::after/);
});

test("core controls keep 44px targets on every viewport and pointer type", async () => {
  const css = await styleSource();
  const touchStart = css.indexOf("포인터 종류와 화면 폭에 관계없이");
  const globalTouchRules = css.slice(touchStart, css.indexOf("@media (max-width: 780px)", touchStart));
  for (const selector of [
    ".play", ".save-card", ".player-controls button", ".map-command-bar button",
    ".map-type-switch button", ".map-side-drawer header > button",
    ".trip-point-picker header > button", ".transport-dataset-grid > button",
    ".day-planner select", ".feedback-box button", ".help-button",
  ]) assert.match(globalTouchRules, new RegExp(selector.replaceAll(".", "\\.").replaceAll(">", "\\>")));
  assert.match(globalTouchRules, /min-height: 44px/);
  assert.match(globalTouchRules, /\.landing-region-map > button::after[\s\S]+inset: -8px/);
});

test("shared trips restore saved places, order and date assignments from official IDs", async () => {
  const [planner, participation, trips, restoration, shared] = await Promise.all([
    plannerProductSource(),
    source("features/planner/hooks/usePlannerParticipation.ts"),
    source("server/trips/payload.ts"),
    source("server/tourism/shared-plan-restoration.ts"),
    source("app/trip/[id]/page.tsx"),
  ]);
  assert.match(planner, /scheduleAssignments,[\s\S]+selectedPlaceIds: saved/);
  assert.match(participation, /scheduleAssignments,[\s\S]+selectedPlaceIds/);
  assert.match(restoration, /export async function restoreSharedPlan/);
  assert.match(restoration, /"KorService2", "detailCommon2"/);
  assert.match(restoration, /"KorWithService2", "detailWithTour2"/);
  assert.match(trips, /selectedIds\.size[\s\S]+places\.filter/);
  assert.match(restoration, /restoration: \{ requested: refs\.length, restored: places\.length, missing, mode: "content-id" \}/);
  assert.match(shared, /저장 장소 최신 확인/);
  assert.match(shared, /날짜별 저장 일정/);
  assert.match(shared, /shared-restoration-notice/);
});
