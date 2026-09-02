import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const assetRoot = join(root, ".vercel/output/static/assets");
const rscRoot = join(root, "node_modules/.nitro/vite/services/rsc");

// 현재 실측값에 작은 변동 여유를 둔다. 전역 CSS를 성급히 경로별로 쪼개
// hydration 스타일 순서를 깨뜨리기보다, 전송비가 이 선을 넘을 때만 분할한다.
const BUDGET = {
  cssGzipKiB: 70,
  landingInitialJsGzipKiB: 155,
  landingInitialJsRawKiB: 520,
  plannerInitialJsGzipKiB: 270,
  largestJsChunkGzipKiB: 110,
};

function kib(bytes) {
  return Math.round((bytes / 1024) * 100) / 100;
}

async function bytes(path) {
  const raw = await readFile(path);
  return { raw: raw.byteLength, gzip: gzipSync(raw).byteLength };
}

function fail(label, actual, limit) {
  if (actual <= limit) return;
  throw new Error(`${label}: ${actual} KiB > ${limit} KiB 성능 예산`);
}

const [manifestSource, rscSource, assetNames] = await Promise.all([
  readFile(join(rscRoot, "__vite_rsc_assets_manifest.js"), "utf8"),
  readFile(join(rscRoot, "index.js"), "utf8"),
  readdir(assetRoot),
]);
const manifest = JSON.parse(manifestSource.replace(/^export default\s+/, "").replace(/;?\s*$/, ""));
function clientReference(routePath) {
  return rscSource.match(new RegExp(`#region ${routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]{0,600}?registerClientReference\\([\\s\\S]*?,\\s*"([a-z0-9]+)",\\s*"default"\\)`))?.[1];
}

const landingReference = clientReference("app/page.tsx");
const plannerReference = clientReference("app/planner/page.tsx");
if (!landingReference || !plannerReference) throw new Error("랜딩 또는 플래너 client reference를 빌드 결과에서 찾지 못했습니다.");

const landingAssets = manifest.clientReferenceDeps?.[landingReference]?.js;
const plannerAssets = manifest.clientReferenceDeps?.[plannerReference]?.js;
if (!Array.isArray(landingAssets) || !landingAssets.length) throw new Error("랜딩 초기 JavaScript 목록이 비어 있습니다.");
if (!Array.isArray(plannerAssets) || !plannerAssets.length) throw new Error("플래너 초기 JavaScript 목록이 비어 있습니다.");

const landingStats = await Promise.all(landingAssets.map(async (asset) => ({
  name: basename(asset),
  ...await bytes(join(assetRoot, basename(asset))),
})));
const plannerStats = await Promise.all(plannerAssets.map(async (asset) => ({
  name: basename(asset),
  ...await bytes(join(assetRoot, basename(asset))),
})));
const cssStats = await Promise.all(assetNames.filter((name) => name.endsWith(".css")).map(async (name) => ({ name, ...await bytes(join(assetRoot, name)) })));
const jsStats = await Promise.all(assetNames.filter((name) => name.endsWith(".js")).map(async (name) => ({ name, ...await bytes(join(assetRoot, name)) })));

const totals = {
  cssRawKiB: kib(cssStats.reduce((sum, item) => sum + item.raw, 0)),
  cssGzipKiB: kib(cssStats.reduce((sum, item) => sum + item.gzip, 0)),
  landingInitialJsRawKiB: kib(landingStats.reduce((sum, item) => sum + item.raw, 0)),
  landingInitialJsGzipKiB: kib(landingStats.reduce((sum, item) => sum + item.gzip, 0)),
  plannerInitialJsRawKiB: kib(plannerStats.reduce((sum, item) => sum + item.raw, 0)),
  plannerInitialJsGzipKiB: kib(plannerStats.reduce((sum, item) => sum + item.gzip, 0)),
  largestJsChunkGzipKiB: kib(Math.max(...jsStats.map((item) => item.gzip))),
};

fail("전체 CSS gzip", totals.cssGzipKiB, BUDGET.cssGzipKiB);
fail("랜딩 초기 JavaScript gzip", totals.landingInitialJsGzipKiB, BUDGET.landingInitialJsGzipKiB);
fail("랜딩 초기 JavaScript raw", totals.landingInitialJsRawKiB, BUDGET.landingInitialJsRawKiB);
fail("플래너 초기 JavaScript gzip", totals.plannerInitialJsGzipKiB, BUDGET.plannerInitialJsGzipKiB);
fail("가장 큰 JavaScript chunk gzip", totals.largestJsChunkGzipKiB, BUDGET.largestJsChunkGzipKiB);

const eagerAuth = landingStats.find((item) => /useHydratedSession|AccountMenu|AuthForm/i.test(item.name));
if (eagerAuth) throw new Error(`공개 랜딩이 인증 chunk를 초기 요청합니다: ${eagerAuth.name}`);
const eagerMap = plannerStats.find((item) => /RouteMap|leaflet/i.test(item.name));
if (eagerMap) throw new Error(`플래너가 숨은 지도 chunk를 초기 요청합니다: ${eagerMap.name}`);

console.log(JSON.stringify({
  budgetKiB: BUDGET,
  measuredKiB: totals,
  landingAssets: landingStats.map((item) => item.name),
  plannerAssets: plannerStats.map((item) => item.name),
}, null, 2));
