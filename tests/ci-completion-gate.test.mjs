import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import yaml from "js-yaml";

const workflow = yaml.load(readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"));
const archivedWorkflow = yaml.load(readFileSync(new URL("../.github/workflow-archive/ci-full-sandbox-pre-rc.yml", import.meta.url), "utf8"));

test("the protected CI gate rejects failed, cancelled and skipped dependencies", () => {
  const gate = workflow.jobs.validate;
  assert.deepEqual(gate.needs, ["quality", "browser", "sandbox-boundary", "impact", "fast-browser"]);
  assert.equal(gate.if, "${{ always() }}");
  const step = gate.steps[0];
  assert.equal(step.env.QUALITY_RESULT, "${{ needs.quality.result }}");
  assert.equal(step.env.BROWSER_RESULT, "${{ needs.impact.outputs.mode == 'fast' && needs.fast-browser.result || needs.browser.result }}");
  assert.equal(step.env.BOUNDARY_RESULT, "${{ needs.sandbox-boundary.result }}");
  assert.equal(step.env.SANDBOX_RESULT, undefined);
  assert.equal(workflow.jobs["sandbox-application"], undefined);
  const script = /^node -e '(.+)'$/.exec(step.run)?.[1];
  assert.ok(script);
  for (const quality of ["success", "failure", "cancelled", "skipped", ""]) {
    for (const browser of ["success", "failure", "cancelled", "skipped", ""]) {
      const result = spawnSync(process.execPath, ["-e", script], { env: { ...process.env, QUALITY_RESULT: quality, BROWSER_RESULT: browser, BOUNDARY_RESULT: "success" } });
      assert.equal(result.status, quality === "success" && browser === "success" ? 0 : 1, `${quality}/${browser}`);
    }
  }
  for (const key of ["BOUNDARY_RESULT"]) for (const status of ["failure", "cancelled", "skipped", ""]) {
    const result = spawnSync(process.execPath, ["-e", script], { env: { ...process.env, QUALITY_RESULT: "success", BROWSER_RESULT: "success", BOUNDARY_RESULT: "success", [key]: status } });
    assert.equal(result.status, 1, `${key}/${status}`);
  }
});
test("CI retains all checks and runs every browser shard without fail-fast or secrets", () => {
  assert.deepEqual(workflow.permissions, { contents: "read" });
  const { quality, browser } = workflow.jobs;
  assert.deepEqual(browser.strategy.matrix.shard, [1, 2]);
  assert.equal(browser.strategy["fail-fast"], false);
  assert.equal(browser.steps.find(step => step.name === "브라우저·접근성 회귀 테스트").run, "npm run test:e2e -- --shard=${{ matrix.shard }}/2");
  for (const command of ["npm audit --omit=dev --audit-level=high", "npm audit --audit-level=moderate", "npm run lint", "npm run typecheck", "npm test", "npm run build:vercel", "npm run check:performance"]) {
    assert.ok(quality.steps.some(step => step.run === command), command);
  }
  assert.doesNotMatch(JSON.stringify(workflow), /continue-on-error|secrets\.|pull_request_target|OPENAI_API_KEY/);
  for (const job of Object.values(workflow.jobs)) assert.ok(job["timeout-minutes"] <= 25);
  for (const step of browser.steps.filter(step => step.uses?.startsWith("actions/upload-artifact@"))) assert.match(step.with.name, /matrix\.shard/);
  // Preserve the former runtime configuration and its safety contracts as history.
  // It is not an active workflow or evidence that the browser crash was fixed.
  const sandbox = archivedWorkflow.jobs["sandbox-application"];
  assert.deepEqual(sandbox.strategy.matrix.shard, [1, 2, 3, 4]);
  assert.equal(sandbox.strategy["fail-fast"], false);
  assert.equal(sandbox.env.WAVE_VALIDATION_SHARD, "${{ matrix.shard }}");
  const execution = sandbox.steps.find(step => step.name === "Run every application check inside the actual boundary").run;
  assert.match(execution, /RuntimeMaxSec=1200/);
  assert.match(execution, /boundary\.validate\(config, str\(archive\), \{\}, shard=shard\)/);
  assert.match(execution, /assert checks == boundary\.application_checks\(shard\)/);
  assert.ok(workflow.jobs["sandbox-boundary"].steps.some(step => step.run === 'python3 -I -B "$RUNNER_TEMP/wave-trusted/tests/subscription-resource-boundary.py"'));
  for (const step of sandbox.steps.filter(step => step.uses?.startsWith("actions/upload-artifact@"))) assert.match(step.with.name, /matrix\.shard/);
});

test("sandbox jobs import only the immutable external runtime and never prepare candidate executables on the host", () => {
  for (const job of [workflow.jobs["sandbox-boundary"], archivedWorkflow.jobs["sandbox-application"]]) {
    const runs = job.steps.map(step => step.run || "").join("\n");
    const bootstrap = job.steps.find(step => step.name === "Verify immutable CI bootstrap before candidate execution").run;
    const distribution = job === workflow.jobs["sandbox-boundary"] ? "61d40b0a24c06e55395b73daa73234750a8ce041" : "b02726fd4407a8537c2ece3b5d2af80ddd3e3edf";
    assert.ok(bootstrap.includes(`${distribution}/scripts/subscription-ci-bootstrap.py`));
    if (job === workflow.jobs["sandbox-boundary"]) {
      const bytes = readFileSync(new URL("../scripts/subscription-ci-bootstrap.py", import.meta.url), "utf8").replaceAll("\r\n", "\n");
      assert.ok(bootstrap.includes(createHash("sha256").update(bytes).digest("hex")));
    }
    assert.ok(bootstrap.indexOf("sha256sum --check") < bootstrap.indexOf('python3 -I -B "$RUNNER_TEMP/wave-ci-bootstrap.py"'));
    assert.doesNotMatch(runs, /npm ci|npx |spec_from_file_location\("boundary", "scripts\/|python3 -I(?: -B)? tests\//);
    assert.match(runs, /WAVE_TRUSTED_RUNTIME/);
  }
  const steps = archivedWorkflow.jobs["sandbox-application"].steps;
  const verify = steps.findIndex(step => step.name === "Verify immutable CI bootstrap before candidate execution");
  const tooling = steps.findIndex(step => step.name === "Prepare fixed public Chromium tooling outside candidate checkout");
  assert.ok(verify >= 0 && tooling > verify);
  assert.match(steps[tooling].run, /cd "\$RUNNER_TEMP\/wave-public-tools"/);
  assert.match(steps[tooling].run, /--ignore-scripts.*playwright@1\.62\.1/);
});

// The scope change preserves every full-suite command and test configuration.
test("RC separates complete hosted product validation from frozen bounded sandbox smoke", () => {
  for (const name of ["quality", "browser"]) {
    const expected = structuredClone(archivedWorkflow.jobs[name]);
    if (name === "browser") {
      expected.needs = "impact";
      expected.if = "${{ needs.impact.outputs.mode == 'full' }}";
    }
    assert.deepEqual(workflow.jobs[name], expected, name);
  }
  // Only the explicitly reviewed immutable distribution may differ from the
  // archived boundary job. Every command, timeout and safety probe stays equal.
  const expectedBoundary = structuredClone(archivedWorkflow.jobs["sandbox-boundary"]);
  const bootstrap = expectedBoundary.steps.find(step => step.name === "Verify immutable CI bootstrap before candidate execution");
  bootstrap.run = bootstrap.run.replaceAll("b02726fd4407a8537c2ece3b5d2af80ddd3e3edf", "61d40b0a24c06e55395b73daa73234750a8ce041")
    .replaceAll("add5ef22f9ff8f37638498ca4db0848655ecdb17430b5e31de076e72b81e5f25", "13d79d30fa03dd369bd1a4641c1c2ff31563028ffe2260b19ac65c70b5bbaaf2");
  assert.deepEqual(workflow.jobs["sandbox-boundary"], expectedBoundary);
  const boundary = readFileSync(new URL("./subscription-sandbox-boundary.py", import.meta.url), "utf8");
  assert.match(boundary, /checks = boundary\.validate\(config, str\(archive\), \{\}\)/);
  assert.match(boundary, /assert len\(checks\) == 6/);
  assert.match(boundary, /no application QA claim/);
  const config = readFileSync(new URL("../playwright.config.ts", import.meta.url), "utf8");
  assert.match(config, /failOnFlakyTests: Boolean\(process\.env\.CI\)/);
  assert.match(config, /workers: process\.env\.CI \? 2/);
  assert.match(config, /timeout: 45_000/);
  assert.match(config, /expect: \{ timeout: 8_000 \}/);
});
