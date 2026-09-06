import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { createRequire } from "node:module";
import { validateProductionOrigin, isReadOnlyMethod } from "../lib/production-read-only.js";
const { checkDeployment } = createRequire(import.meta.url)("../.github/automation/check-deployment.cjs");

test("Production QA rejects alternate hosts, credentials and every write method", () => {
  for (const url of ["http://wave-barrier-free-gyeongnam.vercel.app", "https://example.com", "https://a:b@wave-barrier-free-gyeongnam.vercel.app", "https://wave-barrier-free-gyeongnam.vercel.app/?token=x"]) assert.throws(() => validateProductionOrigin(url));
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "CONNECT"]) assert.equal(isReadOnlyMethod(method), false);
  for (const method of ["GET", "HEAD", "OPTIONS"]) assert.equal(isReadOnlyMethod(method), true);
});

test("Production QA refuses stale or still deploying SHA attribution", async () => {
  let sha = "old"; let state = "success";
  const github = { rest: { repos: {
    listDeployments: async () => ({ data: [{ id: 1, sha }] }),
    listDeploymentStatuses: async () => ({ data: [{ state }] }),
  } } };
  const core = { summary: { addRaw() { return this; }, async write() {} } };
  const context = { repo: {}, payload: { workflow_run: { head_sha: "new" } } };
  await assert.rejects(checkDeployment({ github, core, context }), /changed/);
  sha = "new"; state = "in_progress";
  await assert.rejects(checkDeployment({ github, core, context }), /not successful/);
  state = "success";
  assert.equal(await checkDeployment({ github, core, context }), 1);
});

test("Production smoke guards browser and API writes and reports both success and failure", () => {
  const source = readFileSync("e2e-production/read-only-fixtures.ts", "utf8");
  assert.match(source, /context\.route/);
  assert.match(source, /route\.abort/);
  assert.match(source, /new Proxy\(api/);
  const workflow = yaml.load(readFileSync(".github/workflows/automation-post-deploy-qa.yml", "utf8"));
  assert.doesNotMatch(JSON.stringify(workflow.jobs.verify), /secrets\./);
  assert.match(workflow.jobs["notify-pm"].if, /always\(\)/);
  assert.ok(workflow.jobs["notify-pm"].steps.some(step => step.env?.QA_RESULT));
  const smoke = readFileSync("scripts/check-production-apis.mjs", "utf8");
  assert.doesNotMatch(smoke, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
});
