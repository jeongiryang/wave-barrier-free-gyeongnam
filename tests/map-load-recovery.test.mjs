import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../features/routing/useMapRenderer.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const settle = () => new Promise((resolve) => setImmediate(resolve));

// Execute real effects with persistent refs, dependency comparisons and cleanup.
// The adapters never load a map SDK or contact a configuration/provider service.
function renderer({ fetch = async () => Response.json({ javascriptKey: "" }), kakao = async () => false, leaflet = async () => undefined } = {}) {
  const hooks = [], configurations = [];
  let cursor = 0, pending = [];
  const react = {
    useRef(value) { const at = cursor++; return hooks[at] ??= { current: value }; },
    useEffectEvent(callback) {
      const at = cursor++;
      const cell = hooks[at] ??= { current: callback };
      cell.current = callback;
      return cell.event ??= (...args) => cell.current(...args);
    },
    useEffect(effect, dependencies) {
      const at = cursor++, cell = hooks[at] ??= {};
      if (!cell.dependencies || dependencies.some((value, index) => !Object.is(value, cell.dependencies[index]))) {
        cell.dependencies = dependencies;
        pending.push({ cell, effect });
      }
    },
  };
  const compiledModule = { exports: {} };
  const require = (name) => {
    if (name === "react") return react;
    if (name === "./kakao-map-renderer") return { renderKakaoMap: kakao };
    if (name === "./leaflet-map-renderer") return { renderLeafletMap: leaflet };
    throw new Error(`Unexpected fixture dependency: ${name}`);
  };
  new Function("module", "exports", "require", "fetch", compiled)(compiledModule, compiledModule.exports, require, (...args) => { configurations.push(args); return fetch(...args); });
  const states = [], notices = [];
  let clears = 0;
  const noop = () => undefined;
  const options = {
    origin: { lat: 35.2, lng: 128.6 }, places: [], route: null, retryNonce: 0,
    containerRef: { current: null }, mapRef: { current: null }, kakaoMapRef: { current: null }, drawingManagerRef: { current: null },
    fitMapRef: { current: null },
    crowdVisual: null, crowdPlace: undefined,
    pickModeRef: { current: null }, roadviewSelectModeRef: { current: false },
    onOriginChangeRef: { current: noop }, onDestinationChangeRef: { current: noop }, openRoadviewAt: noop,
    clearCategoryMarkers: () => clears++, choosePlace: noop, setMeasureSummary: noop, setPickMode: noop, setRoadviewSelectMode: noop, setSelectedMapPlace: noop,
    setProvider: (state) => states.push(state), setProviderDetail: (notice) => notices.push(notice),
  };
  const rerender = (changes = {}) => {
    Object.assign(options, changes); cursor = 0; pending = [];
    compiledModule.exports.useMapRenderer(options);
    for (const { cell } of pending) cell.cleanup?.();
    for (const { cell, effect } of pending) cell.cleanup = effect();
  };
  rerender();
  return { states, notices, options, configurations, rerender, clears: () => clears,
    dispose: () => { for (const cell of hooks) { cell.cleanup?.(); cell.cleanup = undefined; } } };
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

const venue = (id, x = "128.67", y = "35.31") => ({ id, name: `Place ${id}`, mapX: x, mapY: y, image: "" });
function controller(context, history) {
  const instance = { updates: [], disposals: 0, map: { removals: 0, remove() { this.removals++; } },
    update(content) { this.updates.push(content); }, dispose() { this.disposals++; } };
  context.mapRef.current = instance.map;
  context.fitMapRef.current = () => undefined;
  history.push(instance);
  return instance;
}

test("late metadata, route and crowd updates preserve the map, nearby generation and fit callback", async () => {
  const history = [];
  const run = renderer({ leaflet: async context => controller(context, history) });
  run.rerender({ places: [venue("1001"), venue("1002", "128.71", "35.35")] });
  await settle();
  const initial = history[0], fit = run.options.fitMapRef.current, generation = run.clears();
  assert.equal(history.length, 1);
  const configCount = run.configurations.length;
  // An ordinary fresh object with equivalent coordinates must not reinitialize.
  run.rerender({ origin: { ...run.options.origin }, places: run.options.places.map(place => ({ ...place, mapX: Number(place.mapX).toFixed(4) })) });
  const metadata = run.options.places.map(place => ({ ...place, address: "Latest official address", checkedAt: "2026-09-14T03:00:00Z", score: 97 }));
  run.rerender({ places: metadata });
  const route = { configured: true, geometry: [{ lat: 35.2, lng: 128.6 }, { lat: 35.31, lng: 128.67 }] };
  run.rerender({ route });
  const crowdVisual = { level: "low", radius: 950, color: "#18a974", soft: "green" };
  run.rerender({ crowdVisual, crowdPlace: metadata[0] });
  await settle();
  assert.equal(run.configurations.length, configCount);
  assert.equal(history.length, 1);
  assert.equal(run.options.mapRef.current, initial.map);
  assert.equal(run.options.fitMapRef.current, fit);
  assert.equal(initial.disposals, 0); assert.equal(initial.map.removals, 0);
  assert.equal(run.clears(), generation, "the in-flight nearby query must not be invalidated");
  assert.equal(initial.updates.at(-1).places, metadata);
  assert.equal(initial.updates.at(-1).route, route);
  assert.equal(initial.updates.at(-1).crowdVisual, crowdVisual);
  run.dispose();
  assert.equal(initial.disposals, 1); assert.equal(initial.map.removals, 1);
  assert.equal(run.options.fitMapRef.current, null);
  assert.equal(run.clears(), generation + 1);
});

test("content received during pending SDK initialization reaches the completed controller without a second SDK", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const history = [];
  const run = renderer({ fetch: async () => Response.json({ javascriptKey: "synthetic-public-key" }),
    kakao: async (_key, context) => { await gate; return controller(context, history); } });
  await settle();
  const latestRoute = { configured: true, geometry: [{ lat: 35.2, lng: 128.6 }, { lat: 35.25, lng: 128.65 }] };
  run.rerender({ route: latestRoute, origin: { ...run.options.origin, label: "Latest origin label" } });
  release(); await settle();
  assert.equal(history.length, 1); assert.equal(run.configurations.length, 1);
  assert.equal(history[0].updates.length, 1);
  assert.equal(history[0].updates[0].route, latestRoute);
  assert.equal(history[0].updates[0].origin.label, "Latest origin label");
  run.dispose();
});

test("a true origin, ordered ID, coordinate or retry change disposes and replaces exactly that map", async () => {
  const history = [];
  const run = renderer({ leaflet: async context => controller(context, history) });
  await settle();
  const changes = [
    { places: [venue("1001"), venue("1002", "128.71", "35.35")] },
    { origin: { lat: 35.21, lng: 128.6 } },
    { places: [venue("1002", "128.71", "35.35"), venue("1001")] },
    { places: [venue("1002", "128.72", "35.35"), venue("1001")] },
    { places: [venue("1002", "128.72", "35.35"), venue("1003")] },
    { retryNonce: 1 },
  ];
  for (const change of changes) {
    const previous = history.at(-1), count = history.length, generation = run.clears();
    run.rerender(change);
    assert.equal(previous.disposals, 1); assert.equal(previous.map.removals, 1);
    assert.equal(run.options.fitMapRef.current, null);
    assert.equal(run.clears(), generation + 1);
    await settle();
    assert.equal(history.length, count + 1);
    assert.equal(run.configurations.length, history.length);
    assert.equal(run.options.mapRef.current, history.at(-1).map);
  }
  run.dispose();
  assert.ok(history.every(item => item.disposals === 1 && item.map.removals === 1));
});

test("a late disposed controller cannot replace or update the newer generation", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const history = [];
  let calls = 0;
  const run = renderer({ fetch: async () => Response.json({ javascriptKey: "synthetic-public-key" }),
    kakao: async (_key, context, cancelled) => {
      if (++calls === 1) {
        await gate;
        // A stale async adapter may return a controller, but it must not touch
        // refs after cancellation. The hook still owns disposing that result.
        assert.equal(cancelled(), true);
        const stale = { updates: [], disposals: 0, update(content) { this.updates.push(content); }, dispose() { this.disposals++; } };
        history.push(stale); return stale;
      }
      return controller(context, history);
    } });
  await settle();
  run.rerender({ origin: { lat: 35.4, lng: 128.8 } }); await settle();
  const current = history[0], fit = run.options.fitMapRef.current;
  release(); await settle();
  const stale = history[1];
  assert.equal(stale.disposals, 1); assert.deepEqual(stale.updates, []);
  assert.equal(run.options.mapRef.current, current.map); assert.equal(run.options.fitMapRef.current, fit);
  run.rerender({ route: { configured: false, geometry: [] } });
  assert.equal(current.updates.length, 2); assert.deepEqual(stale.updates, []);
  assert.ok(!run.states.includes("error")); run.dispose();
});

test("a visual-layer failure reports an explicit map error without restarting configuration or leaking a rejection", async () => {
  const history = [];
  const run = renderer({ leaflet: async context => controller(context, history) });
  await settle();
  history[0].update = () => { throw new Error('Synthetic SDK layer update failure'); };
  assert.doesNotThrow(() => run.rerender({ route: { configured: true, geometry: [] } }));
  await settle();
  assert.deepEqual(run.states, ['loading', 'error']);
  assert.equal(run.notices.at(-1), '지도를 불러오지 못했습니다.');
  assert.equal(run.configurations.length, 1); assert.equal(history.length, 1);
  run.dispose();
});
