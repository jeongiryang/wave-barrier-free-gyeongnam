import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function requestFixture() {
  const state = [], timers = [];
  let cursor = 0, resolve, reject;
  const response = new Promise((yes, no) => { resolve = yes; reject = no; });
  const browser = new EventTarget();
  browser.setTimeout = fn => { timers.push(fn); return timers.length; };
  browser.clearTimeout = id => { timers[id - 1] = null; };
  browser.scrollTo = () => {};
  const compiled = ts.transpileModule(readFileSync(new URL("../features/planner/hooks/usePlanRequest.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", "window", "navigator", compiled)(mod, mod.exports, name => {
    if (name === "react") return {
      useState(initial) { const index = cursor++; state[index] = initial; return [initial, value => { state[index] = value; }]; },
      useRef: initial => ({ current: initial }), useCallback: fn => fn, useEffect() {},
    };
    if (name.endsWith("request-budget.js")) return { CLIENT_BUDGET_MS: { plan: 1000 } };
    if (name.endsWith("reduced-motion.js")) return { scrollToSection: () => false };
    if (name.endsWith("services/api")) return { plannerJson: () => response };
    if (name.endsWith("planner-criteria.js")) return { criteriaSignature: JSON.stringify };
    if (name.endsWith("condition-copy")) return { planNotices: { idle: ["", ""] } };
    throw Error(name);
  }, browser, { onLine: true });
  const actions = mod.exports.usePlanRequest({ locale: "ko", region: "창원", selected: ["wheel"], theme: "nature" });
  let reveals = 0;
  const pending = actions.runPlan({ resetRouteData() {}, resetAudio() {}, onRevealResults() { reveals++; } });
  return { actions, browser, resolve, reject, pending, plan: () => state[0], reveals: () => reveals };
}
const plan = { places: [{ id: "public-place" }], statuses: [{ state: "live" }] };

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
