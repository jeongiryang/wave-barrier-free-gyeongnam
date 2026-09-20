import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadTypeScript(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", code)(loaded, loaded.exports, name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  });
  return { exports: loaded.exports, source };
}

const declining = loadTypeScript("../features/planner/declining-regions.ts");
const landing = loadTypeScript("../features/landing/content.ts");
const catalog = loadTypeScript("../server/tourism/catalog.ts", {
  "../../lib/facility-selection.js": { FACILITIES: [] },
});

test("every official Gyeongnam name matches the landing and tourism catalogs", () => {
  const landingNames = new Set(landing.exports.landingRegions.map(region => region.name));
  const catalogNames = new Set(Object.keys(catalog.exports.regionCodes));
  assert.equal(declining.exports.decliningRegionNotice.regions.length, 11);
  for (const name of declining.exports.decliningRegionNotice.regions) {
    assert.equal(landingNames.has(name), true, `${name} must exist in landingRegions`);
    assert.equal(catalogNames.has(name), true, `${name} must exist in regionCodes`);
  }
});

test("the designation has a dated HTTPS official source without demographic metrics", () => {
  const notice = declining.exports.decliningRegionNotice;
  assert.match(notice.source, /행정안전부고시 제2021-66호/);
  assert.match(notice.sourceUrl, /^https:\/\/www\.mois\.go\.kr\//);
  assert.match(notice.noticedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(notice.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(Object.keys(notice).sort(), ["checkedOn", "noticedOn", "regions", "source", "sourceUrl"]);
  assert.doesNotMatch(declining.exports.DECLINING_REGION_LABEL, /소멸/);
});

test("sorting changes only order and the static module has no location or network side effects", () => {
  const input = ["창원", "거창", "통영", "남해"];
  const sorted = declining.exports.decliningRegionsFirst(input);
  assert.deepEqual(sorted, ["거창", "남해", "창원", "통영"]);
  assert.deepEqual(new Set(sorted), new Set(input));
  for (const forbidden of ["fetch(", "navigator.geolocation", "localStorage", "sessionStorage", "/api/"]) {
    assert.equal(declining.source.includes(forbidden), false, `must not reference ${forbidden}`);
  }
});
