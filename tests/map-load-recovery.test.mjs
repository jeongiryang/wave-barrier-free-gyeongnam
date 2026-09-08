import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../features/routing/useMapRenderer.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const settle = () => new Promise((resolve) => setImmediate(resolve));

// Execute the real effect and cleanup with bounded map/network adapters.
function renderer({ fetch = async () => Response.json({ javascriptKey: "" }), kakao = async () => false, leaflet = async () => undefined } = {}) {
  let cleanup;
  const compiledModule = { exports: {} };
  const require = (name) => {
    if (name === "react") return { useEffect: (effect) => { cleanup = effect(); } };
    if (name === "./kakao-map-renderer") return { renderKakaoMap: kakao };
    if (name === "./leaflet-map-renderer") return { renderLeafletMap: leaflet };
    throw new Error(`Unexpected fixture dependency: ${name}`);
  };
  new Function("module", "exports", "require", "fetch", compiled)(compiledModule, compiledModule.exports, require, fetch);
  const states = [], notices = [];
  const noop = () => undefined;
  const options = {
    origin: { lat: 35.2, lng: 128.6 }, places: [], route: null, retryNonce: 0,
    containerRef: { current: null }, mapRef: { current: null }, kakaoMapRef: { current: null }, drawingManagerRef: { current: null },
    fitMapRef: { current: null },
    clearCategoryMarkers: noop, choosePlace: noop, setMeasureSummary: noop, setPickMode: noop, setRoadviewSelectMode: noop, setSelectedMapPlace: noop,
    setProvider: (state) => states.push(state), setProviderDetail: (notice) => notices.push(notice),
  };
  compiledModule.exports.useMapRenderer(options);
  return { states, notices, dispose: () => cleanup() };
}

test("a rejected alternative map leaves loading and reports an error without an unhandled rejection", async () => {
  const run = renderer({ leaflet: async () => { throw new Error("injected module failure"); } });
  await settle();
  assert.deepEqual(run.states, ["loading", "error"]);
  assert.equal(run.notices.at(-1), "지도를 불러오지 못했습니다.");
  run.dispose();
});

test("a cancelled map configuration request never starts either renderer", async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  let renders = 0;
  const run = renderer({ fetch: () => pending, kakao: async () => { renders++; return true; }, leaflet: async () => { renders++; } });
  run.dispose();
  release(Response.json({ javascriptKey: "fixture-public-key" }));
  await settle();
  assert.equal(renders, 0);
  assert.deepEqual(run.states, ["loading"]);
});

test("a stale renderer rejection cannot change the current map into an error", async () => {
  let reject;
  const pending = new Promise((_resolve, fail) => { reject = fail; });
  const run = renderer({ leaflet: () => pending });
  await settle();
  run.dispose();
  reject(new Error("stale alternative map failure"));
  await settle();
  assert.deepEqual(run.states, ["loading"]);
  assert.ok(run.notices.every((notice) => notice !== "지도를 불러오지 못했습니다."));
});
