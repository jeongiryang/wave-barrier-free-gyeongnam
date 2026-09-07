import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

function fixture(stored = {}, hydrate = true) {
  const slots = [], effects = [], frames = [];
  let cursor = 0;
  const hooks = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useCallback(fn) { cursor++; return fn; },
    useMemo(fn) { cursor++; return fn(); },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v, j) => v !== old[j])) { slots[i] = deps; effects.push(fn); } },
  };
  const window = { localStorage: { getItem: key => key === "wave-trip-schedule-v1" ? JSON.stringify(stored) : null, setItem() {} }, location: { search: "" }, requestAnimationFrame(fn) { frames.push(fn); return frames.length; }, cancelAnimationFrame() {} };
  const compile = file => ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const load = file => { const mod = { exports: {} }; new Function("module", "exports", "require", compile(file))(mod, mod.exports, dependency => { if (dependency.endsWith("trip-dates.js")) return load("../lib/trip-dates.js"); throw Error(dependency); }); return mod.exports; };
  const mod = { exports: {} };
  new Function("module", "exports", "require", "window", compile("../features/planner/hooks/useTripSchedule.ts"))(mod, mod.exports, name => {
    if (name === "react") return hooks;
    if (name === "../utils") return load("../features/planner/utils.ts");
    if (name.endsWith("current-trip-storage.js")) return load("../lib/current-trip-storage.js");
    if (name.endsWith("trip-dates.js")) return load("../lib/trip-dates.js");
    throw Error(name);
  }, window);
  const actions = () => { cursor = 0; return mod.exports.useTripSchedule(); };
  const commit = () => { actions(); effects.splice(0).forEach(fn => fn()); frames.splice(0).forEach(fn => fn()); return actions(); };
  if (hydrate) { commit(); commit(); }
  return { actions, commit };
}
const initial = { travelStart: "2026-09-07", travelEnd: "2026-09-08", scheduleAssignments: { a: "2026-09-07", b: "2026-09-08" } };

test("the first render has no wall-clock dates before storage hydration", () => {
  const f = fixture(initial, false);
  assert.equal(f.actions().travelStart, "");
  assert.equal(f.actions().travelEnd, "");
  assert.equal(f.actions().lastTravelDate, "");
  assert.deepEqual(f.actions().tripDays, []);
  assert.equal(f.actions().storageReady, false);
  f.commit();
  assert.equal(f.actions().travelStart, initial.travelStart);
  assert.deepEqual(f.actions().scheduleAssignments, initial.scheduleAssignments);
});
test("shrinking the period preserves the actual dates until the traveler chooses", () => {
  const f = fixture(initial); f.actions().changeTravelStart("2026-09-06"); f.actions().changeTravelEnd("2026-09-07");
  assert.deepEqual(f.actions().scheduleAssignments, initial.scheduleAssignments);
});
test("a ninth day cannot disagree with the seven displayed days", () => {
  const f = fixture(initial); f.actions().changeTravelEnd("2026-09-16");
  assert.equal(f.actions().travelEnd, "2026-09-08"); assert.equal(f.actions().dateNotice.kind, "limit");
});
test("moving departure after arrival announces the changed arrival", () => {
  const f = fixture(initial); f.actions().changeTravelStart("2026-09-10");
  assert.equal(f.actions().travelEnd, "2026-09-10"); assert.equal(f.actions().dateNotice.end, "2026-09-10");
});
test("stored long periods normalize visibly without moving any saved place", () => {
  const f = fixture({ ...initial, travelStart: "2026-09-08", travelEnd: "2026-09-16", scheduleAssignments: { a: "2026-09-16" } });
  assert.equal(f.actions().travelEnd, "2026-09-14"); assert.equal(f.actions().dateNotice.kind, "adjusted");
  assert.equal(f.actions().scheduleAssignments.a, "2026-09-16"); assert.equal(f.actions().tripDays.length, 7);
});
test("an impossible calendar date cannot alter the period", () => {
  const f = fixture(initial); f.actions().changeTravelStart("2026-02-30"); assert.equal(f.actions().travelStart, initial.travelStart);
});
test("an invalid reassignment cannot silently move a place to the first day", () => {
  const f = fixture(initial); f.actions().assignPlaceToDay("b", "2026-09-20"); assert.equal(f.actions().scheduleAssignments.b, "2026-09-08");
});
