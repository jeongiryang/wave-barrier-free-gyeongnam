import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function data(path) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", compiled)(compiledModule.exports);
  return compiledModule.exports;
}

test("all eighteen landing choices match the existing public boundary geometry exactly once", () => {
  const { landingRegions } = data("../features/landing/content.ts");
  const { regionBoundaries } = data("../features/landing/region-boundaries.ts");
  assert.equal(landingRegions.length, 18);
  assert.equal(regionBoundaries.length, 18);
  const names = (regions) => regions.map((region) => region.name).sort();
  assert.deepEqual(names(regionBoundaries), names(landingRegions));
  assert.equal(new Set(names(regionBoundaries)).size, 18);
  for (const region of regionBoundaries) {
    assert.match(region.path, /^M /);
    assert.ok(Number.isFinite(region.x) && region.x > 0 && region.x < 800);
    assert.ok(Number.isFinite(region.y) && region.y > 0 && region.y < 814);
  }
});

test("the local national overview contains only static paths and one highlighted province", () => {
  const svg = readFileSync(new URL("../public/maps/korea-sgis-2020.svg", import.meta.url), "utf8");
  assert.equal((svg.match(/<path\b/g) || []).length, 17);
  assert.equal((svg.match(/data-highlighted="true"/g) || []).length, 1);
  assert.match(svg, /SGIS 2020 \/ StatGarten MIT, d5f8ea3208f19a73a01f865847d20cc195ae91ba/);
  assert.doesNotMatch(svg, /<script|<foreignObject|\b(?:href|onload|onclick)=/i);
  assert.ok(Buffer.byteLength(svg) <= 200 * 1024);
});

test("every region has distinct official place photographs without inventing regional matches", () => {
  const { regionShowcaseAlbums } = data("../features/landing/region-showcase-photos.ts");
  assert.equal(Object.keys(regionShowcaseAlbums).length, 18);
  for (const [region, photos] of Object.entries(regionShowcaseAlbums)) {
    assert.ok(photos.length >= 2, region);
    assert.equal(new Set(photos.map(photo => photo.image)).size, photos.length);
    for (const photo of photos) {
      assert.match(photo.image, /^https:\/\/tong\.visitkorea\.or\.kr\//);
      assert.ok(photo.location.includes(region) || photo.title.includes(region), photo.title);
    }
  }
  assert.deepEqual(regionShowcaseAlbums["창원"].map(photo => photo.title), ["2019 진해군항제", "주남저수지 철새도래지", "대산플라워랜드"]);
});
