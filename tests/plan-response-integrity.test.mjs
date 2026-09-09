import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function load(path) {
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("module", "exports", code)(mod, mod.exports);
  return mod.exports;
}
const { planResponse } = load("../features/planner/services/plan-response.ts");
const { plan } = load("../e2e/fixtures.ts");

test("a valid plan keeps the exact records and original retrieval times", () => {
  const input = structuredClone(plan), before = structuredClone(input);
  assert.equal(planResponse(input), input);
  assert.deepEqual(input, before);
});

test("empty and partial successes remain valid without fabricated places", () => {
  const empty = { ...plan, mode: "fallback", places: [], stops: [], statuses: [] };
  assert.equal(planResponse(empty), empty);
  const partial = { ...plan, mode: "partial", statuses: [{ ...plan.statuses[0], state: "error", partial: true, failures: [{ kind: "timeout" }] }] };
  assert.equal(planResponse(partial), partial);
});

test("missing arrays, null records and malformed nested values are rejected without mutating the response", () => {
  const invalid = [null, {}, [], "plan", ...["places", "statuses", "stops"].flatMap(key => [
    { ...plan, [key]: null }, { ...plan, [key]: {} }, { ...plan, [key]: [null] },
  ]), { ...plan, places: [{ ...plan.places[0], features: [null] }] },
  { ...plan, places: [{ ...plan.places[0], details: {} }] },
  { ...plan, places: [{ ...plan.places[0], accessibility: [null] }] },
  { ...plan, explorationPlaces: [null] }, { ...plan, criteria: { facilityKeys: [null] } },
  { ...plan, statuses: [{ ...plan.statuses[0], state: "invented" }] },
  { ...plan, course: {} }, { ...plan, audio: {} }, { ...plan, photo: {} },
  { ...plan, crowd: { ...plan.crowd, rate: "unknown" } }];
  for (const input of invalid) {
    const before = structuredClone(input);
    assert.throws(() => planResponse(input), /Invalid plan response/);
    assert.deepEqual(input, before);
  }
});
