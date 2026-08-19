import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function styleSource() {
  const paths = [
    "app/globals.css",
    "app/styles/product-foundations.css",
    "app/styles/planner-workspace.css",
    "app/styles/map-experience.css",
    "app/styles/product-refinements.css",
    "app/styles/design-system.css",
    "app/styles/experience-accessibility.css",
  ];
  return (await Promise.all(paths.map(source))).join("\n");
}

test("shared styles keep stable cascade boundaries", async () => {
  const [layout, globalCss, productFoundations, plannerWorkspace, mapExperience, productRefinements, designSystem, experience] = await Promise.all([
    source("app/layout.tsx"),
    source("app/globals.css"),
    source("app/styles/product-foundations.css"),
    source("app/styles/planner-workspace.css"),
    source("app/styles/map-experience.css"),
    source("app/styles/product-refinements.css"),
    source("app/styles/design-system.css"),
    source("app/styles/experience-accessibility.css"),
  ]);
  const imports = [
    'import "./globals.css"',
    'import "./styles/product-foundations.css"',
    'import "./styles/planner-workspace.css"',
    'import "./styles/map-experience.css"',
    'import "./styles/product-refinements.css"',
    'import "./styles/design-system.css"',
    'import "./styles/experience-accessibility.css"',
    'import "./styles/account-community.css"',
  ].map((statement) => layout.indexOf(statement));
  assert.ok(imports.every((index) => index >= 0));
  assert.deepEqual([...imports].sort((a, b) => a - b), imports);
  assert.doesNotMatch(globalCss, /Marketing landing|Functional planner hierarchy|디자인 시스템 토큰과 패턴 통일|단계별 도움말 투어/);
  assert.match(productFoundations, /Marketing landing/);
  assert.match(productFoundations, /Functional planner hierarchy/);
  assert.match(plannerWorkspace, /V5 — tool-first workspace/);
  assert.match(mapExperience, /V6 — Kakao-first map/);
  assert.match(mapExperience, /V8\.4 — map-native crowd forecast/);
  assert.match(productRefinements, /실제 예보와 관광 집중률/);
  assert.match(productRefinements, /Deep Ocean 통합 레이어/);
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
  const [component, planner, tourism] = await Promise.all([
    source("components/SmartSpotImage.tsx"),
    source("app/planner/page.tsx"),
    source("server/tourism/handler.ts"),
  ]);
  assert.match(component, /action: "spot-photo"/);
  assert.match(component, /contentId/);
  assert.match(component, /smart-image-skeleton/);
  assert.match(component, /공식 사진 준비 중/);
  assert.match(planner, /className=\{`place-visual visual-/);
  assert.match(planner, /region=\{place\.city \|\| region\}/);
  assert.match(planner, /contentId=\{place\.id\}/);
  assert.match(tourism, /PhotoGalleryService1/);
  assert.match(tourism, /searchKeyword2/);
  assert.match(tourism, /detailCommon2/);
  assert.match(tourism, /scoreSpotPhotoTitle/);
  assert.match(tourism, /for \(const keyword of keywords\)/);
  assert.doesNotMatch(tourism, /Promise\.all\(keywords\.map/);
  assert.match(tourism, /regionPhotoFallbackKeywords/);
  assert.match(tourism, /남해 다랭이마을/);
  assert.match(tourism, /산청 황매산/);
  const regionalPhoto = tourism.slice(tourism.indexOf("async function fetchPhoto"), tourism.indexOf("function normalizedSearchText"));
  assert.match(regionalPhoto, /PhotoGalleryService1/);
  assert.match(regionalPhoto, /KorService2/);
  assert.match(regionalPhoto, /searchKeyword2/);
  assert.match(regionalPhoto, /for \(const keyword of keywords\)/);
});

test("all eighteen regions use original W.A.V.E travel characters instead of emoji markers", async () => {
  const [landing, mascot] = await Promise.all([
    source("app/page.tsx"),
    source("components/RegionMascot.tsx"),
  ]);
  const names = ["거창", "합천", "창녕", "밀양", "양산", "함양", "산청", "의령", "함안", "김해", "창원", "하동", "진주", "사천", "고성", "남해", "통영", "거제"];
  for (const name of names) assert.match(mascot, new RegExp(`${name}:`));
  const characterConfig = mascot.slice(mascot.indexOf("const regionCharacters"), mascot.indexOf("function MotifMark"));
  assert.equal((characterConfig.match(/nickname: "/g) || []).length, 18);
  assert.match(landing, /<RegionMascot region=\{region\.name\} size=\{25\}/);
  assert.match(landing, /<RegionMascot region=\{active\.name\} size=\{54\}/);
  const regionConfig = landing.slice(landing.indexOf("const regions"), landing.indexOf("const values"));
  assert.doesNotMatch(regionConfig, /[🎭🎬🌾🎶⛰🌱🌿⚔🔥🏺🌸🍵🏮✈🦕🏘⛵🌼]/u);
});

test("device location is not persisted with saved routes", async () => {
  const map = await source("components/RouteMap.tsx");
  const saveRoute = map.slice(map.indexOf("function saveRoute"), map.indexOf("async function shareRoute"));
  assert.doesNotMatch(saveRoute, /origin\s*,|geometry|mapX|mapY|lat:|lng:/);
  assert.match(saveRoute, /places\.slice/);
});

test("transport provider placeholders settle even when health lookup fails", async () => {
  const [planner, signals] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/hooks/usePlannerSignals.ts"),
  ]);
  assert.match(planner, /keyHealthChecked \? "error" : "checking"/);
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
  const [storage, controls, translations, wave, intro, css] = await Promise.all([
    source("features/preferences/storage.ts"),
    source("features/preferences/PreferenceControls.tsx"),
    source("features/preferences/translations.ts"),
    source("components/WaveField.tsx"),
    source("features/landing/useLandingIntro.ts"),
    styleSource(),
  ]);
  assert.match(storage, /localStorage\.getItem\("wave-motion"\)/);
  assert.match(storage, /localStorage\.setItem\("wave-motion", preferences\.motion\)/);
  assert.match(controls, /aria-pressed=\{motion === "calm"\}/);
  assert.match(controls, /<details className="preference-controls">/);
  assert.match(translations, /export const motionCopy: Record<Locale/);
  assert.match(wave, /motion === "calm" \|\| window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
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
  const [planner, planController, tripSelection, routePlanning, routeView, signals, audioGuide, chrome] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/hooks/usePlannerPlan.ts"),
    source("features/planner/hooks/useTripSelection.ts"),
    source("features/planner/hooks/useRoutePlanning.ts"),
    source("features/planner/hooks/useRouteView.ts"),
    source("features/planner/hooks/usePlannerSignals.ts"),
    source("features/planner/hooks/useAudioGuide.ts"),
    source("features/planner/hooks/usePlannerChrome.ts"),
  ]);
  for (const hook of ["usePlannerPlan", "useTripSelection", "useRoutePlanning", "usePlannerSignals", "useAudioGuide", "useLocationSearch", "usePlannerChrome"]) {
    assert.match(planner, new RegExp(`${hook}\\(`));
  }
  assert.doesNotMatch(planner, /localStorage\.setItem\("wave-saved-places"/);
  assert.match(tripSelection, /const \[storageReady, setStorageReady\] = useState\(false\)/);
  assert.match(tripSelection, /localStorage\.getItem\(SAVED_PLACES_KEY\)[\s\S]+setStorageReady\(true\)/);
  assert.match(tripSelection, /if \(!storageReady\) return;[\s\S]+localStorage\.setItem\(SAVED_PLACES_KEY/);
  assert.match(routeView, /routeSort === "walk"[\s\S]+a\.totalWalk - b\.totalWalk/);
  assert.match(routePlanning, /useRouteView\(routeAlternatives, transportContext\)/);
  assert.match(routePlanning, /nextOriginLabel/);
  assert.doesNotMatch(planner, /routeRequestRef|setRouteAlternatives\(/);
  assert.doesNotMatch(planner, /enrichmentRequestRef|setKeyHealth\(|setWeather\(/);
  assert.doesNotMatch(planner, /setPlanError\(|planRequestRef/);
  assert.match(planController, /plannerJson<PlanData>/);
  assert.match(planController, /const abortPlan = useCallback/);
  assert.match(signals, /optionalPlannerJson<KeyHealth>\("\/api\/health"\)/);
  assert.match(signals, /optionalPlannerJson<WeatherData>/);
  assert.match(audioGuide, /const resetAudio = useCallback/);
  assert.match(chrome, /window\.cancelAnimationFrame\(frame\)/);
});

test("the server entry delegates shared policy and provider domains to focused modules", async () => {
  const [worker, env, http, providerData, weather, location, transport, tourism, trips] = await Promise.all([
    source("worker/index.ts"),
    source("server/shared/env.ts"),
    source("server/shared/http.ts"),
    source("server/shared/provider-data.ts"),
    source("server/weather/handler.ts"),
    source("server/location/handler.ts"),
    source("server/transport/handler.ts"),
    source("server/tourism/handler.ts"),
    source("server/trips/handler.ts"),
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
  assert.match(providerData, /export async function fetchTourismData/);
  assert.match(providerData, /export async function fetchPublicTransportData/);
  assert.match(providerData, /AbortSignal\.timeout\(9500\)/);
  assert.match(transport, /export async function handleRouteApi/);
  assert.match(transport, /api\.odsay\.com\/v1\/api\/searchPubTransPathT/);
  assert.match(transport, /apis-navi\.kakaomobility\.com\/v1\/directions/);
  assert.match(tourism, /export async function handleWaveApi/);
  assert.match(tourism, /export async function buildPlan/);
  assert.match(tourism, /calculateAccessibilityEvidence/);
  assert.match(trips, /export async function handleTripsApi/);
  assert.match(trips, /export async function handleFeedbackApi/);
  assert.match(trips, /CREATE TABLE IF NOT EXISTS itineraries/);
  assert.match(providerData, /export function normalizeXmlItems/);
  assert.match(weather, /AbortSignal\.timeout\(8000\)/);
  assert.match(location, /AbortSignal\.timeout\(7000\)/);
});

test("route-map rendering delegates provider lifecycle, SDK, domain helpers and image export", async () => {
  const [map, planner, types, sdk, helpers, renderer, imageExport] = await Promise.all([
    source("components/RouteMap.tsx"),
    source("app/planner/page.tsx"),
    source("features/routing/types.ts"),
    source("features/routing/kakao-sdk.ts"),
    source("features/routing/map-utils.ts"),
    source("features/routing/useMapRenderer.ts"),
    source("features/routing/export-route-image.ts"),
  ]);
  assert.match(map, /import \{ exportRouteImage \} from "\.\.\/features\/routing\/export-route-image"/);
  assert.match(map, /useMapRenderer\(\{/);
  assert.doesNotMatch(map, /loadKakaoSdk|L\.tileLayer|new K\.Map|canvas\.width = 1600/);
  assert.match(planner, /import type \{ MapPlace \} from "\.\.\/\.\.\/features\/routing\/types"/);
  assert.match(types, /export type RouteAlternative/);
  assert.match(sdk, /Kakao SDK load timed out/);
  assert.match(sdk, /data-wave-kakao/);
  assert.match(helpers, /export function summarizeMeasurements/);
  assert.match(helpers, /export function safeMapImageUrl/);
  assert.match(renderer, /loadKakaoSdk/);
  assert.match(renderer, /OpenStreetMap contributors/);
  assert.match(renderer, /return \(\) => \{/);
  assert.match(imageExport, /canvas\.width = 1600/);
  assert.match(imageExport, /URL\.revokeObjectURL/);
});

test("the wave canvas delegates reusable motion math and intro-mask rasterization", async () => {
  const [wave, model, masks] = await Promise.all([
    source("components/WaveField.tsx"),
    source("features/motion/wave-model.ts"),
    source("features/motion/intro-masks.ts"),
  ]);
  assert.match(wave, /import \{ createIntroMasks \} from "\.\.\/features\/motion\/intro-masks"/);
  assert.match(wave, /const \{ tints, background \} = wavePalette\(tone\)/);
  assert.doesNotMatch(wave, /new Float32Array\(SIN_STEPS\)|target\.bezierCurveTo/);
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
    source("app/page.tsx"),
    source("app/planner/page.tsx"),
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
  const [planner, trips, tourism, shared] = await Promise.all([
    source("app/planner/page.tsx"),
    source("server/trips/handler.ts"),
    source("server/tourism/handler.ts"),
    source("app/trip/[id]/page.tsx"),
  ]);
  assert.match(planner, /scheduleAssignments, selectedPlaceIds: saved/);
  assert.match(tourism, /export async function restoreSharedPlan/);
  assert.match(tourism, /"KorService2", "detailCommon2"/);
  assert.match(tourism, /"KorWithService2", "detailWithTour2"/);
  assert.match(trips, /selectedIds\.size \? places\.filter/);
  assert.match(tourism, /restoration: \{ requested: refs\.length, restored: places\.length, missing, mode: "content-id" \}/);
  assert.match(shared, /저장 장소 최신 확인/);
  assert.match(shared, /날짜별 저장 일정/);
  assert.match(shared, /shared-restoration-notice/);
});
