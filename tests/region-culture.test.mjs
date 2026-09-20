import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", code)(mod, mod.exports);
  return mod.exports;
}

const { regionCultures } = load("features/landing/region-culture.ts");
const { landingRegions } = load("features/landing/content.ts");

test("모든 문화 항목의 지역은 소개 화면 18개 지역과 정확히 일치한다", () => {
  const regions = new Set(landingRegions.map(item => item.name));
  assert.ok(regionCultures.length > 0);
  assert.equal(new Set(regionCultures.map(item => item.region)).size, regionCultures.length);
  for (const item of regionCultures) assert.ok(regions.has(item.region), item.region);
});

test("소개는 한 문장 40자 이내이고 공식 https 출처와 확인 날짜가 있다", () => {
  for (const item of regionCultures) {
    assert.ok(item.title.trim());
    assert.ok(Array.from(item.summary).length <= 40, `${item.region}: ${item.summary}`);
    assert.equal((item.summary.match(/[.!?。！？]/g) || []).length, 1, `${item.region}은 한 문장이어야 한다`);
    assert.equal(new URL(item.url).protocol, "https:");
    assert.match(new URL(item.url).hostname, /(^|\.)heritage\.go\.kr$/);
    assert.ok(item.institution.trim());
    assert.match(item.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("문화 카드 데이터에는 음원·재생·사용자 위치 필드가 없다", () => {
  const text = JSON.stringify(regionCultures);
  assert.doesNotMatch(text, /"(?:src|audio|sound|file|media|latitude|longitude|accuracy)"/i);
  const source = readFileSync(new URL("../features/landing/region-culture.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch\(|navigator|geolocation|localStorage|sessionStorage|Audio\(|<audio/i);
});
