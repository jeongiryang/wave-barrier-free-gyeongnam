import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
const require = createRequire(import.meta.url);
const { authorizeTask, trustedActors } = require("../.github/automation/authorize-task.cjs");
const { validateEntries } = require("../.github/automation/check-patch.cjs");
const handoff = "<!-- wave-pm-task:v1 -->\nDECISION: READY_FOR_DEV\nPRIORITY: P1\nALLOW_SENSITIVE_AUTOMATION_CHANGES: false\nSCOPE:\n- Approved change\nACCEPTANCE_CRITERIA:\n- Observable result\nVALIDATION:\n- Full CI\nCONSTRAINTS:\n- No secrets";
const args = () => ({ actor: "pm-app[bot]", actors: trustedActors('["pm-app[bot]"]'), issue: { state: "open", labels: ["status:ready-for-dev"] }, comments: [{ id: 1, created_at: "2026-09-05", updated_at: "2026-09-05", user: { login: "pm-app[bot]" }, body: handoff }] });

test("only explicitly configured event actor and current trusted handoff authorize work", () => {
  assert.equal(authorizeTask(args()).allowSensitive, false);
  assert.throws(() => authorizeTask({ ...args(), actor: "random[bot]" }), /actor/);
  assert.throws(() => trustedActors('["*"]'), /allowlist/);
  const revoked = args();
  revoked.comments.push({ ...revoked.comments[0], id: 2, body: handoff.replace("READY_FOR_DEV", "BLOCKED") });
  assert.throws(() => authorizeTask(revoked), /decision/);
  const stale = args(); stale.issue.labels.push("status:blocked-human");
  assert.throws(() => authorizeTask(stale), /no longer/);
  const forged = args(); forged.comments[0].user.login = "attacker";
  assert.throws(() => authorizeTask(forged), /No trusted/);
  const edited = args(); edited.comments[0].updated_at = "2026-09-06";
  assert.throws(() => authorizeTask(edited), /Edited handoff/);
});

test("duplicate authorization fields fail closed and repeated handoffs keep one revision", () => {
  const duplicate = args(); duplicate.comments[0].body += "\nALLOW_SENSITIVE_AUTOMATION_CHANGES: true";
  assert.throws(() => authorizeTask(duplicate), /Ambiguous/);
  assert.equal(authorizeTask(args()).revision, authorizeTask(args()).revision);
});

test("symlinks, submodules, credentials and path traversal cannot reach publish", () => {
  for (const entry of [{ path: "docs/log.md", mode: "120000" }, { path: "lib/vendor", mode: "160000" }, { path: "../escape", mode: "100644" }, { path: ".npmrc", mode: "100644" }, { path: ".env.local", mode: "100644" }, { path: ".gitattributes", mode: "100644" }]) {
    assert.throws(() => validateEntries([entry], true));
  }
  assert.throws(() => validateEntries([{ path: ".github/workflows/ci.yml", mode: "100644" }], false));
  assert.equal(validateEntries([{ path: ".github/workflows/ci.yml", mode: "100644" }], true).publishable, false);
  assert.equal(validateEntries([{ path: "app/page.tsx", mode: "100644" }], false).publishable, true);
});

test("worker authorization, generation, credential-free validation and publication remain isolated", () => {
  const workflow = yaml.load(readFileSync(".github/workflows/automation-codex-worker.yml", "utf8"));
  assert.deepEqual(workflow.jobs.generate.needs, "authorize");
  assert.doesNotMatch(JSON.stringify(workflow.jobs.authorize), /secrets\./);
  assert.doesNotMatch(JSON.stringify(workflow.jobs.validate), /secrets\.|cache:|WAVE_GITHUB_AUTOMATION_TOKEN|OPENAI_API_KEY/);
  assert.match(workflow.jobs.publish.if, /publishable == 'true'/);
  const publish = workflow.jobs.publish.steps.find(step => step.id === "publish");
  assert.doesNotMatch(publish.run, /^\s*(npm|npx|yarn|pnpm)\s/gm);
  assert.doesNotMatch(publish.run, /https:\/\/x-access-token/);
  assert.match(publish.run, /core\.hooksPath=\/dev\/null/);
  assert.match(publish.env.PUBLISH_BRANCH, /needs.authorize.outputs.branch/);
});
