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
  assert.deepEqual(gate.needs, ["quality", "browser", "sandbox-boundary", "certify"]);
  assert.equal(gate.if, "${{ always() }}");
  const step = gate.steps[0];
  assert.equal(step.env.QUALITY_RESULT, "${{ needs.quality.result }}");
  assert.equal(step.env.BROWSER_RESULT, "${{ needs.browser.result }}");
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
  const certified = { ...process.env, QUALITY_RESULT: 'success', BROWSER_RESULT: 'skipped', BOUNDARY_RESULT: 'skipped', CERTIFY_RESULT: 'success', REUSE_VERIFIED: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main' };
  assert.equal(spawnSync(process.execPath, ['-e', script], { env: certified }).status, 0);
  for (const override of [{ QUALITY_RESULT: 'failure' }, { BROWSER_RESULT: 'failure' }, { BOUNDARY_RESULT: 'cancelled' }, { CERTIFY_RESULT: 'failure' }, { REUSE_VERIFIED: 'false' }, { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REF: 'refs/heads/feature' }]) assert.equal(spawnSync(process.execPath, ['-e', script], { env: { ...certified, ...override } }).status, 1);
});
test("CI retains all checks and runs every browser shard without fail-fast or secrets", () => {
  assert.deepEqual(workflow.permissions, { contents: "read" });
  const { quality, browser } = workflow.jobs;
  assert.deepEqual(browser.strategy.matrix.shard, [1, 2, 3, 4]);
  assert.deepEqual(browser.strategy.matrix.device, ["desktop", "mobile"]);
  assert.equal(browser.strategy["fail-fast"], false);
  const browserRuns = browser.steps.filter(step => step.run?.startsWith("npm run test:e2e"));
  assert.equal(browserRuns.length, 1);
  assert.equal(browserRuns[0].run, "npm run test:e2e -- --project=${{ matrix.device }}-chromium --shard=${{ matrix.shard }}/4 --output=test-results/${{ matrix.device }}");
  assert.equal(browserRuns[0].env.PLAYWRIGHT_HTML_REPORT, "playwright-report/${{ matrix.device }}");
  assert.equal(browserRuns[0].if, undefined);
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
    const distribution = job === workflow.jobs["sandbox-boundary"] ? "568f6b39760a09c1a3b9939047387276794b412f" : "b02726fd4407a8537c2ece3b5d2af80ddd3e3edf";
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

// The scope change preserves full-suite coverage and test configuration.
test("RC separates complete hosted product validation from frozen bounded sandbox smoke", () => {
  const expectedQuality = structuredClone(archivedWorkflow.jobs.quality);
  expectedQuality.steps[0].with.ref = '${{ github.sha }}';
  expectedQuality.steps.push({ name: 'Record the exact tested PR merge tree', if: "${{ github.event_name == 'pull_request' }}", env: { PR_NUMBER: '${{ github.event.pull_request.number }}', PR_HEAD_SHA: '${{ github.event.pull_request.head.sha }}', PR_BASE_SHA: '${{ github.event.pull_request.base.sha }}' }, run: 'node scripts/write-ci-proof.mjs' },
    { name: 'Preserve tested checkout proof', if: "${{ github.event_name == 'pull_request' }}", uses: 'actions/upload-artifact@v7', with: { name: 'ci-tree-proof', path: '${{ runner.temp }}/ci-tree-proof.json', 'retention-days': 7, 'if-no-files-found': 'error' } });
  assert.deepEqual(workflow.jobs.quality, expectedQuality);
  const expectedBrowser = structuredClone(archivedWorkflow.jobs.browser);
  expectedBrowser.steps[0].with.ref = '${{ github.sha }}';
  expectedBrowser.needs = 'certify';
  expectedBrowser.if = "${{ !cancelled() && needs.certify.outputs.verified != 'true' }}";
  expectedBrowser.strategy.matrix.device = ["desktop", "mobile"];
  expectedBrowser.strategy.matrix.shard = [1, 2, 3, 4];
  const installBrowser = workflow.jobs.browser.steps.find(step => step.name === "브라우저 설치");
  assert.ok(installBrowser.run.trimEnd().endsWith("npx playwright install --with-deps chromium"));
  assert.doesNotMatch(installBrowser.run, /allow-unauthenticated|AllowInsecure|Check-Valid-Until|continue-on-error|\|\| true/);
  expectedBrowser.steps.find(step => step.name === "브라우저 설치").run = installBrowser.run;
  const browserStep = expectedBrowser.steps.find(step => step.name === "브라우저·접근성 회귀 테스트");
  browserStep.env = { PLAYWRIGHT_HTML_REPORT: "playwright-report/${{ matrix.device }}" };
  browserStep.run = "npm run test:e2e -- --project=${{ matrix.device }}-chromium --shard=${{ matrix.shard }}/4 --output=test-results/${{ matrix.device }}";
  for (const step of expectedBrowser.steps.filter(step => step.uses?.startsWith("actions/upload-artifact@"))) {
    step.uses = 'actions/upload-artifact@v7';
    step.with.name = step.with.name.replace("${{ matrix.shard }}", "${{ matrix.device }}-${{ matrix.shard }}");
  }
  assert.deepEqual(workflow.jobs.browser, expectedBrowser);
  // Apart from the reviewed distribution and an ephemeral runner APT-source
  // preparation, every boundary command, timeout and safety probe stays equal.
  const expectedBoundary = structuredClone(archivedWorkflow.jobs["sandbox-boundary"]);
  expectedBoundary.steps[0].with.ref = '${{ github.sha }}';
  expectedBoundary.needs = 'certify';
  expectedBoundary.if = "${{ !cancelled() && needs.certify.outputs.verified != 'true' }}";
  for (const step of expectedBoundary.steps.filter(step => step.uses?.startsWith('actions/upload-artifact@'))) step.uses = 'actions/upload-artifact@v7';
  const bootstrap = expectedBoundary.steps.find(step => step.name === "Verify immutable CI bootstrap before candidate execution");
  bootstrap.run = bootstrap.run.replaceAll("b02726fd4407a8537c2ece3b5d2af80ddd3e3edf", "568f6b39760a09c1a3b9939047387276794b412f")
    .replaceAll("add5ef22f9ff8f37638498ca4db0848655ecdb17430b5e31de076e72b81e5f25", "6fd043bece51e715044a448e307a8b973c77a9bce49c932ee9f783dc05f4e695");
  const actualBoundary = structuredClone(workflow.jobs["sandbox-boundary"]);
  const prepareApt = actualBoundary.steps.findIndex(step => step.name === "Exclude unused runner Chrome repository from APT");
  const verifyBootstrap = actualBoundary.steps.findIndex(step => step.name === "Reject tampered bootstrap before any checkout code executes");
  assert.equal(prepareApt, verifyBootstrap + 1);
  assert.doesNotMatch(actualBoundary.steps[prepareApt].run, /GITHUB_WORKSPACE|scripts\/|apt-get|allow-unauthenticated|AllowInsecure/);
  actualBoundary.steps.splice(prepareApt, 1);
  assert.deepEqual(actualBoundary, expectedBoundary);
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
