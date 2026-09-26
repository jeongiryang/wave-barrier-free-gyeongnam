import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("기존 PWA manifest를 보존하고 환경설정에 설치 요청을 표시하지 않는다", async () => {
  const [manifest, hook, controls, styles] = await Promise.all([
    source("app/manifest.ts"),
    source("features/preferences/useAppInstall.ts"),
    source("features/preferences/PreferenceControls.tsx"),
    source("app/styles/preferences.css"),
  ]);
  assert.match(manifest, /display: "standalone"/);
  for (const size of ["192x192", "512x512"]) {
    assert.match(manifest, new RegExp(`src: "\\/app-icon\\.svg", sizes: "${size}"[\\s\\S]*?purpose: "any"`));
    assert.match(manifest, new RegExp(`src: "\\/maskable-icon\\.svg", sizes: "${size}"[\\s\\S]*?purpose: "maskable"`));
  }
  assert.doesNotMatch(manifest, /favicon\.svg[\s\S]*purpose: "maskable"/);
  assert.match(hook, /addEventListener\("beforeinstallprompt"/);
  assert.match(hook, /event\.preventDefault\(\)/);
  assert.match(hook, /const install = useCallback\(async \(\) =>/);
  assert.match(hook, /await event\.prompt\(\)/);
  assert.doesNotMatch(hook, /useEffect\([\s\S]{0,500}\.prompt\(\)/);
  assert.doesNotMatch(controls, /useAppInstall|WAVE 앱 설치|홈 화면에 추가|appInstall\.install/);
  assert.match(styles, /\.preference-row\.app-install/);
});
