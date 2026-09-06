import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";

test("QA uses the trusted base workflow and inert PR diff, never PR checkout or install", () => {
  const workflow = yaml.load(readFileSync(".github/workflows/automation-independent-qa.yml", "utf8"));
  assert.ok(workflow.on.pull_request_target);
  assert.match(workflow.jobs.review.if, /head.repo.full_name == github.repository/);
  const steps = workflow.jobs.review.steps;
  const checkout = steps.find(step => step.uses?.startsWith("actions/checkout@"));
  assert.equal(checkout.with.ref, "${{ github.event.pull_request.base.sha }}");
  const codex = steps.find(step => step.uses?.startsWith("openai/codex-action@"));
  assert.equal(codex.with.sandbox, "read-only");
  assert.equal(codex.with["safety-strategy"], "drop-sudo");
  assert.match(codex.with["working-directory"], /runner.temp.*qa-input/);
  assert.doesNotMatch(steps.filter(step => step.run).map(step => step.run).join("\n"), /^\s*(?:npm|npx|yarn|pnpm)\s/gm);
  assert.doesNotMatch(JSON.stringify(workflow.jobs.publish), /secrets\./);
});

test("stale QA cannot change current PR labels or post a current verdict", async () => {
  const workflow = yaml.load(readFileSync(".github/workflows/automation-independent-qa.yml", "utf8"));
  const body = workflow.jobs.publish.steps.find(step => step.uses?.startsWith("actions/github-script@")).with.script;
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let notices = 0;
  const old = process.env.HEAD_SHA;
  process.env.HEAD_SHA = "old";
  try {
    await new AsyncFunction("github", "context", "core", "require", body)(
      { rest: { pulls: { get: async () => ({ data: { head: { sha: "new" }, state: "open" } }) } } },
      { repo: {}, issue: { number: 1 } }, { notice: () => { notices += 1; } },
      () => ({ readFileSync: () => "VERDICT: PASS\nSEVERITY: NONE" }),
    );
    assert.equal(notices, 1);
  } finally { if (old === undefined) delete process.env.HEAD_SHA; else process.env.HEAD_SHA = old; }
});
