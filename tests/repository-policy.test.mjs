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
