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
  const [component, worker] = await Promise.all([
    source("components/SmartSpotImage.tsx"),
    source("worker/index.ts"),
  ]);
  assert.match(component, /action: "spot-photo"/);
  assert.match(component, /smart-image-skeleton/);
  assert.match(component, /공식 사진 준비 중/);
  assert.match(worker, /PhotoGalleryService1/);
  assert.match(worker, /searchKeyword2/);
  assert.match(worker, /Promise\.all\(keywords\.map/);
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
