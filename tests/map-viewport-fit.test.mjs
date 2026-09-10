import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { GYEONGNAM_MAP_BOUNDS, constrainedGyeongnamViewport } from '../lib/gyeongnam-map-viewport.js';
const root = new URL('../', import.meta.url);
function compile(name) {
  return ts.transpileModule(readFileSync(new URL(name, root), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
}
const utils = { exports: {} };
new Function('module', 'exports', compile('features/routing/map-utils.ts'))(utils, utils.exports);
const { mapFitPadding } = utils.exports;
const rect = (left, top, width, height) => ({
  left, top, width, height, right: left + width, bottom: top + height
});
function fixture() {
  const state = {
    canvas: rect(20, 100, 944, 710), bar: rect(210, 112, 730, 60), badge: rect(34, 112, 160, 36), marker: rect(380, 340, 64, 72), photo: rect(380, 330, 84, 84), rank: rect(450, 322, 21, 21)
  };
  const node = name => ({ getBoundingClientRect: () => state[name] });
  const marker = { ...node('marker'), querySelectorAll: () => [node('photo'), node('rank')] };
  const controls = [node('bar'), node('badge')];
  const style = new Map();
  const shell = { ...node('canvas'), style: { setProperty: (name, value) => style.set(name, value), getPropertyValue: name => style.get(name) }, querySelector: selector => selector === '.route-map-canvas' ? canvas : null, querySelectorAll: () => controls };
  const canvas = {
    ...node('canvas'), get clientWidth() {
      return state.canvas.width;
    }, get clientHeight() {
      return state.canvas.height;
    }, parentElement: shell, querySelectorAll: () => [marker]
  };
  return {
    state, canvas, shell, controls
  };
}
test('full overflowing photo and rank are framed below measured toolbar, with side clearance', () => {
  const { canvas, state } = fixture();
  const [top, right, bottom, left] = mapFitPadding(canvas);
  const visualHeight = Math.max(state.marker.bottom, state.photo.bottom, state.rank.bottom) - Math.min(state.marker.top, state.photo.top, state.rank.top);
  assert.ok(top >= state.bar.bottom - state.canvas.top + visualHeight);
  assert.ok(right >= state.rank.right - (state.marker.left + state.marker.width / 2));
  assert.ok(left >= state.marker.width / 2);
  assert.ok(bottom > 0);
  assert.ok(top + bottom < state.canvas.height);
});
test('page scroll and user map pan do not change padding', () => {
  const f = fixture(), initial = mapFitPadding(f.canvas);
  for (const key of Object.keys(f.state)) {
    const r = f.state[key];
    f.state[key] = rect(r.left, r.top - 220, r.width, r.height);
  }
  assert.deepEqual(mapFitPadding(f.canvas), initial);
  for (const key of ['marker', 'photo', 'rank']) {
    const r = f.state[key];
    f.state[key] = rect(r.left + 75, r.top - 60, r.width, r.height);
  }
  assert.deepEqual(mapFitPadding(f.canvas), initial);
});
test('390px two-row control layout uses lower badge, not a desktop magic padding', () => {
  const f = fixture(), before = mapFitPadding(f.canvas);
  f.state.canvas = rect(24, 200, 342, 500);
  f.state.bar = rect(32, 209, 326, 64);
  f.state.badge = rect(33, 274, 270, 44);
  const after = mapFitPadding(f.canvas);
  assert.ok(after[0] > before[0]);
  assert.ok(after[0] >= f.state.badge.bottom - f.state.canvas.top + f.state.photo.height);
  assert.ok(after[0] + after[2] < 500);
});
test('hidden and off-canvas controls do not consume map space', () => {
  const f = fixture();
  f.state.bar = rect(0, 0, 0, 0);
  f.state.badge = rect(1100, 100, 100, 100);
  const p = mapFitPadding(f.canvas);
  f.state.badge = rect(1100, 100, 0, 0);
  assert.deepEqual(mapFitPadding(f.canvas), p);
});
function shellHarness() {
  const f = fixture(), effects = [], timers = new Map(), frames = new Map();
  let timerId = 0;
  const observers = [];
  const calls = {
    relayout: 0, invalidate: 0, fit: []
  };
  const bounds = { points: ['origin', 'Junam'] };
  const fitMapRef = { current: () => calls.fit.push(bounds) };
  const react = {
    useCallback: x => x, useEffect: x => effects.push(x), useState: x => [x, () => {
      }], useRef: x => ({ current: x })
  };
  const sdkMap = { relayout: () => calls.relayout++ };
  const leaflet = { invalidateSize: () => calls.invalidate++ };
  const win = { setTimeout: fn => {
      timers.set(++timerId, fn);
      return timerId;
    }, clearTimeout: id => timers.delete(id), requestAnimationFrame: fn => {
      frames.set(++timerId, fn);
      return timerId;
    }, cancelAnimationFrame: id => frames.delete(id) };
  class RO {
    constructor(callback) {
      this.callback = callback;
      this.nodes = [];
      observers.push(this);
    }
    observe(n) {
      this.nodes.push(n);
    }
    disconnect() {
      this.disconnected = true;
    }
  }
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', 'window', 'document', 'ResizeObserver', compile('features/routing/useMapShell.ts'))(mod, mod.exports, n => n === 'react' ? react : utils.exports, win, { addEventListener() {
    }, removeEventListener() {
    } }, RO);
  const view = mod.exports.useMapShell({
    fitMapRef, kakaoMapRef: { current: sdkMap }, mapRef: { current: leaflet }, pickModeRef: { current: null }, setPickMode() {
    }, layoutKey: 'closed:0'
  });
  view.shellRef.current = f.shell;
  const cleanups = effects.map(fn => fn());
  const observer = observers[0];
  const tick = () => {
    const pendingFrames = [...frames.values()];
    frames.clear();
    pendingFrames.forEach(fn => fn());
    const items = [...timers.values()];
    timers.clear();
    items.forEach(fn => fn());
  };
  return {
    ...f, calls, bounds, fitMapRef, tick, notify: () => observer.callback(), observer, dispose: () => cleanups.forEach(fn => fn?.()), timers, frames
  };
}
test('shell reuses original fit callback only on geometry change, not pan/scroll', () => {
  const h = shellHarness();
  h.tick();
  assert.equal(h.calls.fit.length, 1);
  assert.equal(h.calls.fit[0], h.bounds);
  assert.equal(h.shell.style.getPropertyValue('--map-controls-bottom'), '72px');
  h.notify();
  h.tick();
  assert.equal(h.calls.fit.length, 1);
  for (const key of Object.keys(h.state)) {
    const r = h.state[key];
    h.state[key] = rect(r.left, r.top - 120, r.width, r.height);
  }
  h.notify();
  h.tick();
  assert.equal(h.calls.fit.length, 1);
  h.state.canvas = rect(24, 200, 342, 500);
  h.state.bar = rect(32, 209, 326, 64);
  h.state.badge = rect(33, 274, 270, 44);
  h.notify();
  h.tick();
  assert.equal(h.calls.fit.length, 2);
  assert.equal(h.calls.fit[1], h.bounds);
  assert.equal(h.shell.style.getPropertyValue('--map-controls-bottom'), '118px');
  const next = { points: ['origin', 'Daesan'] };
  h.fitMapRef.current = () => h.calls.fit.push(next);
  h.state.canvas = rect(0, 0, 390, 844);
  h.notify();
  h.tick();
  assert.equal(h.calls.fit.at(-1), next);
  h.dispose();
});
test('shell observes actual canvas/controls and disconnects/cancels pending work on cleanup', () => {
  const h = shellHarness();
  assert.equal(h.observer.nodes.length, 3);
  h.tick();
  const before = h.calls.relayout;
  h.state.canvas = rect(0, 0, 390, 844);
  h.notify();
  h.dispose();
  h.tick();
  assert.equal(h.observer.disconnected, true);
  assert.equal(h.timers.size, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.calls.relayout, before);
});
test('a replacement day map receives settled padding even at identical shell dimensions', () => {
  const h = shellHarness();
  h.tick();
  const replacement = { points: ['origin', 'Daesan'] };
  h.fitMapRef.current = () => h.calls.fit.push(replacement);
  h.notify();
  h.tick();
  assert.equal(h.calls.fit.length, 2);
  assert.equal(h.calls.fit.at(-1), replacement);
  h.notify();
  h.tick();
  assert.equal(h.calls.fit.length, 2, 'unchanged geometry must not keep refitting the same map');
  h.dispose();
});
test('renderer cleanup clears fitting callback before late configuration resolves', async () => {
  let cleanup, release;
  const pending = new Promise(resolve => release = resolve);
  const fitMapRef = { current: () => {
      throw Error('stale callback');
    } };
  const mod = { exports: {} };
  const require = n => n === 'react' ? { useEffect: fn => cleanup = fn() } : n === './kakao-map-renderer' ? { renderKakaoMap: () => {
      throw Error('cancelled render ran');
    } } : { renderLeafletMap: () => {
      throw Error('cancelled fallback ran');
    } };
  new Function('module', 'exports', 'require', 'fetch', compile('features/routing/useMapRenderer.ts'))(mod, mod.exports, require, () => pending);
  const noop = () => {
  };
  mod.exports.useMapRenderer({
    fitMapRef, containerRef: { current: null }, mapRef: { current: null }, kakaoMapRef: { current: null }, drawingManagerRef: { current: null }, clearCategoryMarkers: noop, setProvider: noop, setProviderDetail: noop
  });
  cleanup();
  assert.equal(fitMapRef.current, null);
  release(Response.json({ javascriptKey: '' }));
  await new Promise(setImmediate);
});
// Execute the production renderer bodies with bounded SDK adapters. These
// assert SDK call contracts; they do not emulate geographic projection or
// establish actual Kakao/Leaflet visual placement.
function rendererHarness(provider, { deferredMarkers = false } = {}) {
  const f = fixture();
  let markersMounted = !deferredMarkers;
  const markerNodes = f.canvas.querySelectorAll;
  f.canvas.querySelectorAll = () => markersMounted ? markerNodes() : [];
  f.canvas.replaceChildren = () => { markersMounted = !deferredMarkers; };
  const maps = [], overlays = [];
  const noop = () => undefined;
  const context = {
    containerRef: { current: f.canvas }, mapRef: { current: null },
    kakaoMapRef: { current: null }, drawingManagerRef: { current: null },
    fitMapRef: { current: null }, origin: { lat: 35.2, lng: 128.6 },
    places: [
      {
        id: "Junam", name: "Junam", mapY: "35.31", mapX: "128.67", image: "https://example.invalid/photo.jpg"
      },
      {
        id: "Daesan", name: "Daesan", mapY: "35.35", mapX: "128.71", image: "https://example.invalid/photo.jpg"
      },
    ],
    route: null, crowdVisual: null, pickModeRef: { current: null },
    roadviewSelectModeRef: { current: false }, onOriginChangeRef: { current: noop },
    onDestinationChangeRef: { current: noop }, openRoadviewAt: noop,
    choosePlace: noop, clearCategoryMarkers: noop, setProvider: noop,
    setProviderDetail: noop, setSelectedMapPlace: noop, setPickMode: noop,
    setRoadviewSelectMode: noop, setMeasureSummary: noop,
  };
  class MapAdapter {
    constructor() {
      this.fits = [];
      maps.push(this);
    }
    setBounds(...args) {
      this.fits.push(args);
    }
    fitBounds(...args) {
      this.fits.push(args);
      // Real Leaflet mounts queued layers when the first view is established.
      markersMounted = true;
    }
    whenReady(callback) {
      callback();
      return this;
    }
    setCenter() {
    }
    setLevel() {
    }
    getLevel() { return 9; }
    setMaxLevel(level) { this.maxLevel = level; }
    getCenter() { return new LatLng(35.2, 128.6); }
    getBounds() { return { getSouthWest: () => new LatLng(35.1, 128.5), getNorthEast: () => new LatLng(35.4, 128.8) }; }
    setMinZoom(zoom) { this.minZoom = zoom; }
    getBoundsZoom() { return 9; }
    setView() {
    }
    on() {
    }
    remove() {
      this.removed = true;
    }
  }
  class LatLng {
    constructor(lat, lng) {
      this.lat = lat;
      this.lng = lng;
    }
    getLat() {
      return this.lat;
    }
    getLng() {
      return this.lng;
    }
  }
  class Bounds {
    points = [];
    extend(point) {
      this.points.push([point.getLat(), point.getLng()]);
    }
  }
  class Overlay {
  }
  const sdk = {
    Map: MapAdapter, LatLng, LatLngBounds: Bounds, Marker: Overlay,
    CustomOverlay: class {
      constructor(options) {
        overlays.push(options);
      }
    },
    Polyline: Overlay, load: done => done(),
  };
  const layer = () => ({
    addTo() {
      return this;
    }, bindPopup() {
      return this;
    }, on() {
      return this;
    }
  });
  const leaflet = {
    map: () => new MapAdapter(), control: { zoom: layer }, tileLayer: layer,
    latLngBounds: (...points) => points,
    divIcon: options => options, marker: layer, polyline: layer,
  };
  const document = {
    createElement(tag) {
      return {
        tag, children: [], style: { setProperty: noop },
        setAttribute(name, value) {
          this[name] = value;
        },
        appendChild(child) {
          this.children.push(child);
        }, addEventListener: noop
      };
    },
  };
  const require = name => {
    if (name === "../../lib/gyeongnam-map-viewport.js")
      return { GYEONGNAM_MAP_BOUNDS, constrainedGyeongnamViewport };
    if (name === "./kakao-map-viewport") {
      const viewport = { exports: {} };
      new Function("module", "exports", "require", compile("features/routing/kakao-map-viewport.ts"))(viewport, viewport.exports, require);
      return viewport.exports;
    }
    if (name === "./map-utils")
      return utils.exports;
    if (name === "./kakao-sdk")
      return { loadKakaoSdk: async () => undefined };
    if (name === "./map-renderer-context")
      return { pickedDestination: noop };
    if (name === "leaflet")
      return leaflet;
    throw Error("Unexpected renderer dependency: " + name);
  };
  const compiledModule = { exports: {} };
  new Function("module", "exports", "require", "window", "document", compile("features/routing/" + provider + "-map-renderer.ts"))(compiledModule, compiledModule.exports, require, {
    kakao: { maps: sdk }, setTimeout, clearTimeout
  }, document);
  let cancelled = false;
  const render = provider === "kakao"
    ? () => compiledModule.exports.renderKakaoMap("unit-only-no-network", context, () => cancelled)
    : () => compiledModule.exports.renderLeafletMap(context, () => cancelled);
  return {
    ...f, maps, overlays, context, render, cancel: () => {
      cancelled = true;
    }
  };
}
for (const provider of ["kakao", "leaflet"]) {
  test(provider + " renderer retains original selected-place bounds, updates padding, and ignores stale callbacks", async () => {
    const f = rendererHarness(provider);
    await f.render();
    const firstMap = f.maps[0], firstBounds = firstMap.fits[0][0];
    const points = bounds => provider === "kakao" ? bounds.points : bounds;
    assert.deepEqual(points(firstBounds), [[35.2, 128.6], [35.31, 128.67], [35.35, 128.71]]);
    const paddings = args => provider === "kakao"
      ? args.slice(1)
      : [args[1].paddingTopLeft[1], args[1].paddingBottomRight[0], args[1].paddingBottomRight[1], args[1].paddingTopLeft[0]];
    const initialPadding = paddings(firstMap.fits[0]);
    assert.equal(initialPadding.length, 4);
    assert.ok(initialPadding[0] > initialPadding[1]);
    assert.ok(initialPadding[0] > initialPadding[2]);
    assert.ok(initialPadding.every(value => Number.isFinite(value) && value > 0));
    if (provider === "leaflet")
      assert.equal(firstMap.fits[0][1].maxZoom, 13);
    else
      assert.deepEqual(f.overlays.map(overlay => overlay.content["aria-label"].split(" · ")[0]), ["Junam", "Daesan"]);
    const oldFit = f.context.fitMapRef.current;
    f.state.canvas = rect(24, 200, 342, 500);
    f.state.bar = rect(32, 209, 326, 64);
    f.state.badge = rect(33, 274, 270, 44);
    oldFit();
    assert.equal(firstMap.fits.at(-1)[0], firstBounds);
    assert.ok(paddings(firstMap.fits.at(-1))[0] > initialPadding[0]);
    f.context.places = [f.context.places[1]];
    await f.render();
    const nextMap = f.maps[1], nextBounds = nextMap.fits[0][0];
    assert.notEqual(nextBounds, firstBounds);
    assert.deepEqual(points(nextBounds), [[35.2, 128.6], [35.35, 128.71]]);
    const previousCount = firstMap.fits.length;
    oldFit();
    assert.equal(firstMap.fits.length, previousCount);
    f.context.fitMapRef.current();
    assert.equal(nextMap.fits.at(-1)[0], nextBounds);
    const currentCount = nextMap.fits.length;
    f.cancel();
    f.context.fitMapRef.current();
    assert.equal(nextMap.fits.length, currentCount);
  });
}

test('Leaflet measures mounted photo pins on every new day with unchanged shell geometry', async () => {
  const f = rendererHarness('leaflet', { deferredMarkers: true });
  f.state.canvas = rect(24, 200, 342, 500);
  f.state.bar = rect(32, 209, 326, 64);
  f.state.badge = rect(33, 274, 320, 50);
  for (const place of [f.context.places[0], f.context.places[1]]) {
    f.context.places = [place];
    await f.render();
    const fits = f.maps.at(-1).fits;
    const final = fits.at(-1);
    const requiredTop = f.state.badge.bottom - f.state.canvas.top + f.state.photo.height;
    assert.ok(final[1].paddingTopLeft[1] >= requiredTop, 'the final fit must include the newly mounted photo, not only the toolbar');
    assert.equal(final[0], fits[0][0], 'the original requested bounds must survive initialization');
    assert.deepEqual(final[0], [[35.2, 128.6], [Number(place.mapY), Number(place.mapX)]]);
    assert.equal(final[1].maxZoom, 13);
  }
});
