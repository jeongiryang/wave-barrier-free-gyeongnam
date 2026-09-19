import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import * as coordinates from "../lib/map-coordinates.js";
import * as accessibility from "../lib/accessibility-score.js";
import { SLOPE_DESCRIPTION_DISCLAIMER } from "../lib/slope-description.js";

// 스펙 16(1단계만 구현): 고도 계산이나 등급·색 신호등 없이, `route` 필드의
// 원문 설명을 요약 없이 그대로 보여주고 항상 같은 안내 문구를 붙인다. 0단계에서
// 경남 표본이 있는 경사로 OpenAPI를 확인하지 못했으므로(docs/ai-logs/
// spec-16-slope-info.md 참고) 2단계(server/tourism/slope-info.ts)는 만들지 않는다.

const root = fileURLToPath(new URL("../", import.meta.url));
function loadServer(fetchFixture = async () => { throw Error("Unexpected provider call"); }) {
  const cache = new Map();
  const load = name => {
    let file = resolve(root, name);
    if (!existsSync(file)) file += ".ts";
    if (file.endsWith("map-coordinates.js")) return coordinates;
    if (file.endsWith("accessibility-score.js")) return accessibility;
    if (file.endsWith("plan-builder.ts")) return { buildPlan: () => { throw Error("Unexpected new recommendation search"); } };
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function("module", "exports", "require", "fetch", code)(mod, mod.exports, specifier => {
      if (!specifier.startsWith(".")) throw Error("Unexpected external dependency");
      return load(resolve(dirname(file), specifier));
    }, fetchFixture);
    return mod.exports;
  };
  return load;
}

test("the disclaimer is a single fixed sentence and never implies a measured gradient", () => {
  assert.equal(SLOPE_DESCRIPTION_DISCLAIMER, "경사와 턱의 정도는 등록된 설명 그대로예요. 실제 기울기는 확인되지 않았어요.");
  assert.doesNotMatch(SLOPE_DESCRIPTION_DISCLAIMER, /완만|평탄|급경사|힘듦|초록|노랑|빨강/);
});

test("lib/slope-description.js stays free of network/storage/location/elevation access", () => {
  const source = readFileSync(new URL("../lib/slope-description.js", import.meta.url), "utf8");
  for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "indexedDB", "navigator", "geolocation", "elevation", "altitude", "difficulty", "hard", "steep"]) {
    assert.ok(!source.includes(forbidden), `lib/slope-description.js 가 ${forbidden} 를 참조하면 안 된다`);
  }
});

test("route field detail is not truncated at the default clean() length and HTML markup is stripped, not just sliced", () => {
  const { placeFrom } = loadServer()("server/tourism/accessibility-model.ts");
  const long = "경사로가 설치돼 있으나 입구 턱이 있습니다.".repeat(15); // > 240자, < 600자
  const detail = { route: `${long}<br/>주차장에서 정문까지 계단 없음.` };
  const result = placeFrom({ contentid: "9001", title: "표본 관광지" }, detail, "창원", ["route"], 0);
  const route = result.accessibility.find(field => field.key === "route");
  assert.ok(route, "route 항목이 있어야 한다");
  assert.ok(route.detail.length > 240, "clean()의 기본 240자보다 길게 보존돼야 한다");
  assert.ok(!route.detail.includes("<br"), "HTML 태그가 화면에 그대로 남으면 안 된다");
  assert.ok(route.detail.includes("주차장에서 정문까지 계단 없음"), "원문 뒷부분이 잘리면 안 된다");
});

test("no judgement fields (difficulty/hard/steep) or a user-coordinate field appear in the accessibility item", () => {
  const { placeFrom } = loadServer()("server/tourism/accessibility-model.ts");
  const result = placeFrom({ contentid: "9002", title: "표본 관광지" }, { route: "경사로 있음" }, "창원", ["route"], 0);
  const route = result.accessibility.find(field => field.key === "route");
  for (const forbidden of ["difficulty", "hard", "steep", "gradient", "latitude", "longitude"]) {
    assert.ok(!Object.hasOwn(route, forbidden), `route 항목에 ${forbidden} 필드가 있으면 안 된다`);
  }
});

test("no elevation/altitude module exists for this spec (2단계는 0단계 검증 실패로 구현하지 않았다)", () => {
  assert.ok(!existsSync(resolve(root, "server/tourism/slope-info.ts")), "0단계에서 경남 표본 제공처를 확인하지 못했으므로 2단계 서버 모듈을 만들지 않는다");
});
