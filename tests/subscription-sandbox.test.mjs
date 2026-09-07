import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { sandboxCall, sandboxConfiguration, wslPath } from "../scripts/subscription-sandbox.mjs";
import { validateDocumentation } from "../scripts/subscription-run-once.mjs";

test("documentation validation stops before lease heartbeat or execution without a sandbox", async () => {
  const saved = process.env.WAVE_VALIDATION_SANDBOX_CONFIG;
  delete process.env.WAVE_VALIDATION_SANDBOX_CONFIG;
  let calls = 0;
  try {
    await assert.rejects(validateDocumentation("untrusted-checkout", "unused", async () => { calls++; }, () => { calls++; }), /^Error: BLOCKED_SANDBOX$/);
    assert.equal(calls, 0);
  } finally {
    if (saved === undefined) delete process.env.WAVE_VALIDATION_SANDBOX_CONFIG;
    else process.env.WAVE_VALIDATION_SANDBOX_CONFIG = saved;
  }
});

test("missing or invalid sandbox configuration cannot authorize host validation", () => {
  assert.throws(() => sandboxConfiguration({}), /^Error: BLOCKED_SANDBOX$/);
  const root = mkdtempSync(path.join(tmpdir(), "wave-config-test-"));
  const file = path.join(root, "public-test.json");
  for (const value of [{}, { version: 1, bwrap: "/bwrap", runtime: "/runtime", browsers: "/browser", token: "PUBLIC-TEST-ONLY" }]) {
    writeFileSync(file, JSON.stringify(value));
    assert.throws(() => sandboxConfiguration({ WAVE_VALIDATION_SANDBOX_CONFIG: file }), /^Error: BLOCKED_SANDBOX$/);
  }
  assert.throws(() => sandboxConfiguration({ WAVE_VALIDATION_SANDBOX_CONFIG: path.join(root, "missing") }), /^Error: BLOCKED_SANDBOX$/);
});

test("sandbox failures discard arbitrary output and never invoke an alternate executor", () => {
  for (const result of [{ status: 1, stderr: "PUBLIC-TEST-PATH" }, { status: 0, stdout: "not JSON PUBLIC-TEST-PATH" }, { status: 0, stdout: JSON.stringify({ result: "PASS" }) }]) {
    let calls = 0;
    assert.throws(() => sandboxCall("probe", {}, {}, (executable, args) => {
      calls++;
      assert.ok(path.isAbsolute(executable));
      assert.ok(args.includes("-I"));
      for (const property of ["MemoryMax=6G", "MemorySwapMax=0", "TasksMax=1024", "CPUQuota=200%", "OOMPolicy=kill", "RuntimeMaxSec=1200"]) {
        assert.ok(args.includes(`--property=${property}`));
      }
      assert.ok(args.includes("--user"));
      return result;
    }), error => /BLOCKED_SANDBOX/.test(error.message) && !error.message.includes("PUBLIC-TEST-PATH"));
    assert.equal(calls, 1);
  }
});

test("WSL path arguments are data, never shell command text", () => {
  assert.equal(wslPath("D:\\a directory\\public.txt"), "/mnt/d/a directory/public.txt");
  assert.throws(() => wslPath("relative"), /BLOCKED_SANDBOX/);
  assert.throws(() => wslPath("D:\\line\ncommand"), /BLOCKED_SANDBOX/);
});

test("coordinator probes before model execution and keeps sandbox failures out of publication", () => {
  const source = readFileSync(new URL("../scripts/subscription-run-once.mjs", import.meta.url), "utf8");
  assert.ok(source.indexOf("assertValidationSandbox();") < source.indexOf("const result = runSubscriptionTask("));
  assert.ok(source.indexOf("await validateDocumentation(") < source.indexOf("publishImplementation({"));
  assert.doesNotMatch(source, /spawn\(|npmCli|process\.env\.npm_execpath/);
  assert.match(source, /\/SANDBOX\/.test\(error.message\) \? "sandbox"/);
});
