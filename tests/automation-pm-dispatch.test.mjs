import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
const require = createRequire(import.meta.url);
const { notifyPm, eventKey } = require("../.github/automation/pm-notify.cjs");

test("subscription-only production entry never calls PM API even with configured credentials", async () => {
  const result = await notifyPm({}, { env: { WAVE_PM_AGENT_TRIGGER_ID: "agtch_test", WAVE_PM_AGENT_ACCESS_TOKEN: "fixture-token" } });
  assert.deepEqual(result, { state: "blocked_subscription_only", completed: false });
});

test("missing PM configuration does not call the network or claim completion", async () => {
  const result = await notifyPm({}, { env: {}, fetchImpl: () => { throw new Error("network forbidden"); } });
  assert.deepEqual(result, { state: "not_configured", completed: false });
});

test("202 is accepted only; stable source-event keys deduplicate retries", async () => {
  let captured;
  const result = await notifyPm({ input: 'metadata $(not-a-command)', key: eventKey("workflow", [123, 1]), conversation: "issue-1" }, {
    env: { WAVE_PM_AGENT_TRIGGER_ID: "agtch_test", WAVE_PM_AGENT_ACCESS_TOKEN: "fixture-token" },
    fetchImpl: async (url, options) => { captured = { url, options }; return { status: 202, json: async () => ({ agent_trigger_run_id: "apirun_fixture" }) }; },
  });
  assert.deepEqual(result, { state: "accepted", completed: false, run: "apirun_fixture" });
  assert.equal(captured.options.redirect, "error");
  assert.equal(JSON.parse(captured.options.body).input, 'metadata $(not-a-command)');
  assert.equal(eventKey("workflow", [123, 1]), eventKey("workflow", [123, 1]));
  assert.notEqual(eventKey("workflow", [123, 1]), eventKey("workflow", [123, 2]));
});

test("API errors and unexpected trigger IDs cannot leak body or redirect credentials", async () => {
  const env = { WAVE_PM_AGENT_TRIGGER_ID: "agtch_test", WAVE_PM_AGENT_ACCESS_TOKEN: "fixture-token" };
  await assert.rejects(notifyPm({}, { env, fetchImpl: async () => ({ status: 401, json: async () => ({ error: "sensitive fixture" }) }) }), /^Error: PM dispatch HTTP 401; response body withheld$/);
  await assert.rejects(notifyPm({}, { env: { ...env, WAVE_PM_AGENT_TRIGGER_ID: "../elsewhere" }, fetchImpl: () => { throw new Error("network forbidden"); } }), /identifier/);
});

test("CI results explicitly return to PM without depending on GITHUB_TOKEN issue events", () => {
  const workflow = yaml.load(readFileSync(".github/workflows/automation-pm-dispatch.yml", "utf8"));
  for (const name of ["CI", "CD", "Codex Engineering Worker", "Independent AI QA Reviewer"]) assert.ok(workflow.on.workflow_run.workflows.includes(name));
  assert.ok(!workflow.on.workflow_run.workflows.includes(workflow.name));
  assert.doesNotMatch(JSON.stringify(workflow.jobs), /issue\.body|issue\.title/);
});
