import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../features/planner/hooks/useRouteOrigin.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function fixture() {
  const slots = [], calls = [], privateChanges = [];
  let cursor = 0;
  const hooks = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = next; }]; },
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useCallback(fn) { cursor++; return fn; },
  };
  const mod = { exports: {} };
  const departurePresets = [{ name: "Public station", point: { lat: 35.2, lng: 128.6 } }];
  new Function("module", "exports", "require", "navigator", code)(mod, mod.exports, name => {
    if (name === "react") return hooks;
    if (name === "../constants") return { departurePresets };
    if (name.endsWith("location-consent.js")) return { confirmMapLocationUse: () => true };
    throw Error(name);
  }, { geolocation: { getCurrentPosition: (success, failure) => calls.push({ success, failure }) } });
  function render() { cursor = 0; return mod.exports.useRouteOrigin(() => privateChanges.push(true)); }
  return { render, calls, privateChanges };
}
const position = { coords: { latitude: 35.3, longitude: 128.7 } };

for (const outcome of ["success", "failure"]) test(`new-trip reset rejects a late location ${outcome} and clears the previous live notice`, () => {
  const app = fixture();
  const initial = app.render();
  initial.requestCurrentLocation();
  assert.notDeepEqual(app.render().routeNotice, initial.routeNotice);
  app.render().resetOrigin();
  app.calls[0][outcome](position);
  const fresh = app.render();
  assert.deepEqual(fresh.origin, initial.origin);
  assert.equal(fresh.originLabel, initial.originLabel);
  assert.equal(fresh.privateOrigin, false);
  assert.deepEqual(fresh.routeNotice, initial.routeNotice);
  assert.deepEqual(app.privateChanges, []);
});

test("reset clears an already displayed private location and permits a new explicit location request", () => {
  const app = fixture(), initial = app.render();
  initial.requestCurrentLocation(); app.calls[0].success(position);
  assert.equal(app.render().privateOrigin, true);
  app.render().resetOrigin();
  assert.deepEqual(app.render().routeNotice, initial.routeNotice);
  assert.deepEqual(app.render().origin, initial.origin);
  app.render().requestCurrentLocation(); app.calls[1].success(position);
  assert.equal(app.render().privateOrigin, true);
  assert.deepEqual(app.render().origin, { lat: 35.3, lng: 128.7 });
});
