import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../features/routing/useMapJourneyActions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function journey() {
  let available = true, success, failure, requests = 0;
  const origins = [], notices = [], modes = [], cleanups = [];
  const compiledModule = { exports: {} };
  const require = (name) => {
    if (name === "react") return { useCallback: (callback) => callback, useRef: (value) => ({ current: value }), useState: (value) => [value, () => undefined], useEffect: (effect) => cleanups.push(effect()) };
    if (name === "./export-route-image") return { exportRouteImage: () => false };
    if (name === "../../lib/location-consent.js") return { confirmMapLocationUse: () => true };
    if (name === "../../components/SitePreferences") return { useSitePreferences: () => ({ locale: "ko" }) };
    throw new Error(`Unexpected fixture dependency ${name}`);
  };
  const navigator = { geolocation: { getCurrentPosition: (onSuccess, onFailure) => { requests++; success = onSuccess; failure = onFailure; } } };
  new Function("module", "exports", "require", "window", "navigator", compiled)(compiledModule, compiledModule.exports, require, {}, navigator);
  const actions = compiledModule.exports.useMapJourneyActions({
    origin: { lat: 35.2, lng: 128.6 }, places: [], route: null, kakaoMapRef: { current: null },
    onOriginChange: (...args) => origins.push(args), setProviderDetail: (message) => notices.push(message), setPickMode: (mode) => modes.push(mode),
    isMapAvailable: () => available,
  });
  return { actions, origins, notices, modes, changeTrip: () => cleanups.forEach(cleanup => cleanup?.()), failMap: () => { available = false; }, requests: () => requests,
    success: () => success({ coords: { latitude: 35.3, longitude: 128.7 } }), failure: () => failure() };
}

test("location cannot start after the map has failed", () => {
  const fixture = journey();
  fixture.failMap();
  fixture.actions.moveToCurrentLocation();
  assert.equal(fixture.requests(), 0);
  assert.deepEqual(fixture.origins, []);
});

test("a location response pending before map failure cannot replace the itinerary origin or error notice", () => {
  const fixture = journey();
  fixture.actions.moveToCurrentLocation();
  assert.equal(fixture.requests(), 1);
  fixture.failMap();
  fixture.success();
  fixture.failure();
  assert.deepEqual(fixture.origins, []);
  assert.deepEqual(fixture.notices, []);
  assert.deepEqual(fixture.modes, []);
});

test("an available map still accepts an explicitly requested location response", () => {
  const fixture = journey();
  fixture.actions.moveToCurrentLocation();
  fixture.success();
  assert.equal(fixture.requests(), 1);
  assert.deepEqual(fixture.origins, [[{ lat: 35.3, lng: 128.7 }, "현재 위치"]]);
  assert.deepEqual(fixture.modes, [null]);
});

test("a changed or unmounted itinerary rejects both late map location outcomes", () => {
  const fixture = journey();
  fixture.actions.moveToCurrentLocation();
  fixture.changeTrip();
  fixture.success(); fixture.failure();
  assert.deepEqual(fixture.origins, []);
  assert.deepEqual(fixture.notices, []);
  assert.deepEqual(fixture.modes, []);
});
