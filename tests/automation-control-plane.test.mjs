import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import yaml from "js-yaml";

test("every workflow parses and every inline GitHub script compiles", () => {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const file of readdirSync(".github/workflows")) {
    const workflow = yaml.load(readFileSync(`.github/workflows/${file}`, "utf8"));
    assert.ok(workflow.name && workflow.on && workflow.jobs, file);
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps || []) {
        if (step.uses?.startsWith("actions/github-script@") && step.with?.script) {
          assert.doesNotThrow(() => new AsyncFunction("github", "context", "core", "require", step.with.script), `${file}: ${step.name}`);
        }
      }
    }
  }
});

test("unmeasured engineering and production release gates start UNKNOWN", () => {
  const gates = yaml.load(readFileSync(".wave/release-gate.yaml", "utf8"));
  assert.equal(gates.status, "NO_GO");
  for (const group of ["engineering", "production"]) {
    assert.ok(Object.values(gates.gates[group].checks).every(value => value === "UNKNOWN"));
    assert.ok(Object.values(gates.gates[group].expected).every(value => value === "PASS"));
  }
});
