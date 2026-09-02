import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("PWA 설치는 기존 manifest와 환경설정 안의 명시적 요청만 사용한다", async () => {
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
  assert.match(controls, /aria-label="W\.A\.V\.E 앱 설치"/);
  assert.match(controls, /브라우저 메뉴에서 ‘홈 화면에 추가’를 선택하세요/);
  assert.match(styles, /\.preference-row\.app-install/);
});
