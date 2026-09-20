import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function registry() {
  const source = await readFile(new URL("features/landing/region-sound.ts", root), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", code)(loaded, loaded.exports);
  return { source, entries: loaded.exports.regionSounds };
}

test("공개 배경 소리 목록은 승인된 라이선스 메타데이터만 허용한다", async () => {
  const { entries } = await registry();
  assert.ok(Array.isArray(entries));
  for (const sound of entries) {
    for (const key of ["id", "title", "credit", "license", "licenseUrl", "src", "checkedOn"]) {
      assert.equal(typeof sound[key], "string", `${key}가 문자열이어야 합니다`);
      assert.ok(sound[key].trim(), `${key}가 비어 있습니다`);
    }
    assert.match(sound.licenseUrl, /^https:\/\//);
    assert.match(sound.src, /^\/media\/sound\/[a-z0-9._-]+$/);
    assert.match(sound.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number.isFinite(sound.seconds) && sound.seconds > 0);
  }
});

test("사람의 라이선스 확인 전에는 빈 목록이고 재생기는 그려지지 않는다", async () => {
  const { entries } = await registry();
  assert.deepEqual(entries, []);
  const landing = await readFile(new URL("features/landing/components/LandingRegionStory.tsx", root), "utf8");
  const player = await readFile(new URL("features/landing/components/RegionSoundPlayer.tsx", root), "utf8");
  assert.match(landing, /regionSounds\.length > 0/);
  assert.match(landing, /sound=\{regionSounds\[0\]\}/);
  assert.match(player, /if \(!sound\) return null/);
});

test("재생기는 지연 로드·자극 감소·상호 배제·메모리 전용 계약을 유지한다", async () => {
  const player = await readFile(new URL("features/landing/components/RegionSoundPlayer.tsx", root), "utf8");
  for (const expected of [
    'preload="none"',
    'node.volume = 0.3',
    'document.hidden',
    'prefers-reduced-motion: reduce',
    'dataset.motion !== "calm"',
    'connection?.saveData !== true',
    'wave:audio-start',
    '소리 재생 중',
    '지금은 들을 수 없어요.',
  ]) assert.ok(player.includes(expected), `재생 계약이 빠졌습니다: ${expected}`);
  for (const forbidden of ["localStorage", "sessionStorage", "geolocation", "getUserMedia", "fetch("]) {
    assert.equal(player.includes(forbidden), false, `재생기에 금지 API가 있습니다: ${forbidden}`);
  }
});

test("저장소에는 승인되지 않은 음원 파일이 없고 검토 상태가 문서화돼 있다", async () => {
  const assets = await readFile(new URL("docs/assets-and-licenses.md", root), "utf8");
  assert.match(assets, /지역 배경 소리 검토 상태 \(2026-09-20\)/);
  assert.match(assets, /공개 목록은 비어/);
  const { source } = await registry();
  assert.doesNotMatch(source, /https?:\/\/.*\.(?:mp3|wav|ogg|m4a)/i);
});
