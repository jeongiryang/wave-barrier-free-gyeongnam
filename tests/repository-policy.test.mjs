import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

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
  const [component, planner, worker] = await Promise.all([
    source("components/SmartSpotImage.tsx"),
    source("app/planner/page.tsx"),
    source("worker/index.ts"),
  ]);
  assert.match(component, /action: "spot-photo"/);
  assert.match(component, /contentId/);
  assert.match(component, /smart-image-skeleton/);
  assert.match(component, /공식 사진 준비 중/);
  assert.match(planner, /className=\{`place-visual visual-/);
  assert.match(planner, /region=\{place\.city \|\| region\}/);
  assert.match(planner, /contentId=\{place\.id\}/);
  assert.match(worker, /PhotoGalleryService1/);
  assert.match(worker, /searchKeyword2/);
  assert.match(worker, /detailCommon2/);
  assert.match(worker, /scoreSpotPhotoTitle/);
  assert.match(worker, /for \(const keyword of keywords\)/);
  assert.doesNotMatch(worker, /Promise\.all\(keywords\.map/);
  assert.match(worker, /regionPhotoFallbackKeywords/);
  assert.match(worker, /남해 다랭이마을/);
  assert.match(worker, /산청 황매산/);
  const regionalPhoto = worker.slice(worker.indexOf("async function fetchPhoto"), worker.indexOf("function normalizedSearchText"));
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
  const saveRoute = map.slice(map.indexOf("function saveRoute"), map.indexOf("function exportRouteImage"));
  assert.doesNotMatch(saveRoute, /origin\s*,|geometry|mapX|mapY|lat:|lng:/);
  assert.match(saveRoute, /places\.slice/);
});

test("transport provider placeholders settle even when health lookup fails", async () => {
  const planner = await source("app/planner/page.tsx");
  assert.match(planner, /keyHealthChecked \? "error" : "checking"/);
  assert.match(planner, /setKeyHealthChecked\(true\)/);
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
  const preferences = await source("components/SitePreferences.tsx");
  // 저장된 값을 읽기 전에 기본값을 써 버리면 이용자가 고른 테마와 언어가 지워진다.
  // 읽기가 끝났음을 알리는 표시가 있고, 저장이 그 뒤에만 일어나야 한다.
  assert.match(preferences, /setHydrated\(true\)/);
  assert.match(preferences, /finally\s*\{\s*\/\/[^\n]*\n\s*setHydrated\(true\)/);
  const persistEffect = preferences.slice(preferences.indexOf("document.documentElement.dataset.theme"));
  const gateIndex = persistEffect.indexOf("if (!hydrated) return;");
  const writeIndex = persistEffect.indexOf('window.localStorage.setItem("wave-theme"');
  assert.ok(gateIndex >= 0, "저장 전에 hydrated 확인이 있어야 한다");
  assert.ok(gateIndex < writeIndex, "hydrated 확인이 저장보다 먼저 와야 한다");
  assert.match(persistEffect, /try\s*\{[\s\S]*localStorage\.setItem\("wave-theme"[\s\S]*\}\s*catch/);
});

test("wave motion preference is persisted, localized and respects reduced motion", async () => {
  const [preferences, wave, landing, css] = await Promise.all([
    source("components/SitePreferences.tsx"),
    source("components/WaveField.tsx"),
    source("app/page.tsx"),
    source("app/globals.css"),
  ]);
  assert.match(preferences, /localStorage\.getItem\("wave-motion"\)/);
  assert.match(preferences, /localStorage\.setItem\("wave-motion", motion\)/);
  assert.match(preferences, /aria-pressed=\{motion === "calm"\}/);
  assert.match(preferences, /const motionCopy: Record<Locale/);
  assert.match(wave, /motion === "calm" \|\| window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(landing, /motion === "calm" \|\| window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(css, /html\[data-motion="calm"\] \.hero-wave-canvas \{ display: none; \}/);
});

test("non-Korean locales are visibly marked Beta without breaking narrow headers", async () => {
  const [preferences, css] = await Promise.all([
    source("components/SitePreferences.tsx"),
    source("app/globals.css"),
  ]);
  assert.match(preferences, /id: "ko"[^\n]+beta: false/);
  assert.equal((preferences.match(/beta: true/g) || []).length, 7);
  assert.match(preferences, /item\.beta \? " · Beta"/);
  assert.match(preferences, /className="language-beta"/);
  assert.match(css, /\.preference-controls select,.preference-controls button \{ min-height: 44px/);
  assert.match(css, /@media \(max-width: 780px\)[\s\S]*\.preference-controls select \{ width: 58px/);
  assert.match(css, /@media \(max-width: 380px\)[\s\S]*\.language-beta \{ position: absolute/);
});

test("planner ignores stale route, enrichment and location-search responses", async () => {
  const planner = await source("app/planner/page.tsx");
  for (const request of ["routeRequestRef", "enrichmentRequestRef", "searchRequestRef"]) {
    assert.match(planner, new RegExp(`${request}\\.current\\?\\.abort\\(\\)`));
    assert.match(planner, new RegExp(`${request}\\.current !== controller`));
  }
  assert.match(planner, /fetch\(`\/api\/route\?\$\{params\.toString\(\)\}`,[^;]+signal: controller\.signal/);
  assert.match(planner, /action: "enrich"[\s\S]+signal: controller\.signal/);
  assert.match(planner, /\/api\/location-search\?q=[\s\S]+signal: controller\.signal/);
  assert.match(planner, /useEffect\(\(\) => \(\) => \{[\s\S]+routeRequestRef\.current\?\.abort\(\)/);
});

test("every user-facing footer exposes the repository with an accessible tooltip", async () => {
  const [link, landing, planner, shared, css] = await Promise.all([
    source("components/GithubFooterLink.tsx"),
    source("app/page.tsx"),
    source("app/planner/page.tsx"),
    source("app/trip/[id]/page.tsx"),
    source("app/globals.css"),
  ]);
  assert.match(link, /https:\/\/github\.com\/jeongiryang\/wave-barrier-free-gyeongnam/);
  assert.match(link, /aria-label="W\.A\.V\.E GitHub 저장소 열기"/);
  assert.match(link, /data-tooltip="GitHub"/);
  for (const page of [landing, planner, shared]) assert.match(page, /<GithubFooterLink \/>/);
  assert.match(css, /\.github-footer-link \{ width: 44px; height: 44px/);
  assert.match(css, /\.github-footer-link:hover::after,.github-footer-link:focus-visible::after/);
});
