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
