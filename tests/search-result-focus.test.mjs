import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function requestFixture(previousPlan = null) {
  const state = [], timers = [];
  let cursor = 0, resolve, reject;
  const response = new Promise((yes, no) => { resolve = yes; reject = no; });
  const browser = new EventTarget();
  browser.setTimeout = fn => { timers.push(fn); return timers.length; };
  browser.clearTimeout = id => { timers[id - 1] = null; };
  browser.scrollTo = () => {};
  const apiCode = ts.transpileModule(readFileSync(new URL("../features/planner/services/api.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const api = { exports: {} };
  new Function("module", "exports", "require", apiCode)(api, api.exports, name => {
    if (name.endsWith("request-budget.js")) return { CLIENT_BUDGET_MS: { plan: 1000 } };
    throw Error(name);
  });
  const compiled = ts.transpileModule(readFileSync(new URL("../features/planner/hooks/usePlanRequest.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", "window", "navigator", compiled)(mod, mod.exports, name => {
    if (name === "react") return {
      useState(initial) { const index = cursor++; const value = index === 0 ? previousPlan : initial; state[index] = value; return [value, next => { state[index] = next; }]; },
      useRef: initial => ({ current: initial }), useCallback: fn => fn, useEffect() {},
    };
    if (name.endsWith("request-budget.js")) return { CLIENT_BUDGET_MS: { plan: 1000 } };
    if (name.endsWith("reduced-motion.js")) return { scrollToSection: () => false };
    if (name.endsWith("services/api")) return { ...api.exports, plannerJson: () => response };
    if (name.endsWith("services/plan-response")) {
      const result = { exports: {} };
      const source = ts.transpileModule(readFileSync(new URL("../features/planner/services/plan-response.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      new Function("module", "exports", source)(result, result.exports);
      return result.exports;
    }
    if (name.endsWith("planner-criteria.js")) return { criteriaSignature: JSON.stringify };
    if (name.endsWith("condition-copy")) return { planNotices: { idle: ["", ""] } };
    throw Error(name);
  }, browser, { onLine: true });
  const actions = mod.exports.usePlanRequest({ locale: "ko", region: "창원", selected: ["wheel"], theme: "nature" });
  let reveals = 0, routeResets = 0, audioResets = 0;
  const pending = actions.runPlan({ resetRouteData() { routeResets++; }, resetAudio() { audioResets++; }, onRevealResults() { reveals++; } });
  return { actions, browser, resolve, reject, pending, plan: () => state[0], reveals: () => reveals, resets: () => [routeResets, audioResets] };
}
const plan = { mode: "live", generatedAt: "2026-09-09T00:00:00Z", baseYm: "202608", places: [], stops: [], course: null, audio: null, statuses: [{ id: "tour", name: "Tour", role: "Places", note: "", state: "live", count: 0 }] };

test("a requested successful result invokes navigation once after storing its data", async () => {
  const f = requestFixture(); f.resolve(plan);
  assert.equal(await f.pending, true);
  assert.equal(f.plan(), plan); assert.equal(f.reveals(), 1);
});
for (const action of ["keydown", "pointerdown", "wheel", "touchstart"]) test(`a pending result preserves a later ${action} decision while retaining new data`, async () => {
  const f = requestFixture(); f.browser.dispatchEvent(new Event(action)); f.resolve(plan);
  assert.equal(await f.pending, true);
  assert.equal(f.plan(), plan); assert.equal(f.reveals(), 0);
});
test("a failed search never navigates away from its recovery controls", async () => {
  const f = requestFixture(); f.reject(new Error("Unavailable"));
  assert.equal(await f.pending, false); assert.equal(f.plan(), null); assert.equal(f.reveals(), 0);
});
test("an aborted response cannot navigate or replace the current plan", async () => {
  const f = requestFixture(); f.actions.abortPlan(); f.resolve(plan);
  assert.equal(await f.pending, false); assert.equal(f.plan(), null); assert.equal(f.reveals(), 0);
});

test("a malformed response cannot replace previous results or reset their route and audio", async () => {
  const f = requestFixture(plan); f.resolve({});
  assert.equal(await f.pending, false);
  assert.equal(f.plan(), plan); assert.equal(f.reveals(), 0);
  assert.deepEqual(f.resets(), [0, 0]);
});
