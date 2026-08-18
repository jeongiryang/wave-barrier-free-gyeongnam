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

test("the place carousel is sized by its card instead of the viewport", async () => {
  const css = await source("app/globals.css");
  const rule = css.slice(css.lastIndexOf(".planner-page > .places-section .place-carousel"));
  assert.match(css, /--card-pad-x: clamp\(/);
  assert.match(rule, /\.planner-page > \.places-section \.place-carousel/);
  assert.match(rule, /width: auto/);
  assert.match(rule, /margin-inline: calc\(var\(--card-pad-x\) \* -1\)/);
  assert.match(rule, /padding: 4px var\(--card-pad-x\) 28px/);
  assert.doesNotMatch(rule, /100vw/);
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
