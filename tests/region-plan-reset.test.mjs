import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { criteriaSignature } from "../lib/planner-criteria.js";

function fixture() {
  const slots = [], effects = [], calls = [];
  let cursor = 0;
  const hooks = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v, j) => v !== old[j])) { slots[i] = deps; effects.push(fn); } },
  };
  const window = { addEventListener() {}, clearTimeout() {}, setTimeout() { return 1; }, scrollTo() {}, scrollY: 0, scrollX: 0 };
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../features/planner/hooks/usePlanRequest.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("module", "exports", "require", "window", "navigator", code)(mod, mod.exports, name => {
    if (name === "react") return hooks;
    if (name.endsWith("request-budget.js")) return { CLIENT_BUDGET_MS: { plan: 1000 } };
    if (name.endsWith("reduced-motion.js")) return { scrollToSection: () => false };
    if (name.endsWith("planner-criteria.js")) return { criteriaSignature };
    if (name === "../condition-copy") return { planNotices: Object.fromEntries(["idle", "loading", "updated", "empty", "error", "offline"].map(key => [key, [key, key]])) };
    if (name === "../services/api") return { plannerJson: (_url, options) => new Promise(resolve => calls.push({ resolve, signal: options.signal })) };
    throw Error(name);
  }, window, { onLine: true });
  let criteria = { locale: "ko", region: "Changwon", selected: ["wheelchair"], theme: "nature" };
  function render(next = {}) { criteria = { ...criteria, ...next }; cursor = 0; const result = mod.exports.usePlanRequest(criteria); effects.splice(0).forEach(effect => effect()); return result; }
  return { render, calls };
}
const options = { resetRouteData() {}, resetAudio() {} };
const plan = { places: [{ id: "old" }], statuses: [{ state: "live" }] };
test("ordinary criteria changes keep results until an explicit confirmed region reset", async () => {
  const app = fixture();
  const pending = app.render().runPlan(options, false);
  app.calls[0].resolve(plan); await pending;
  assert.equal(app.render().plan, plan);
  const changed = app.render({ region: "Hadong" });
  assert.equal(changed.plan, plan); assert.equal(changed.dirty, true);
  changed.resetPlan();
  const fresh = app.render();
  assert.equal(fresh.plan, null); assert.equal(fresh.loading, false);
  assert.equal(fresh.resultCurrent, false); assert.equal(fresh.planError, "");
});
test("a late response from the old trip cannot repopulate a confirmed new trip", async () => {
  const app = fixture();
  const pending = app.render().runPlan(options, false);
  app.render().resetPlan();
  assert.equal(app.calls[0].signal.aborted, true);
  app.calls[0].resolve(plan);
  assert.equal(await pending, false);
  assert.equal(app.render({ region: "Hadong" }).plan, null);
  assert.equal(app.render().loading, false);
});
