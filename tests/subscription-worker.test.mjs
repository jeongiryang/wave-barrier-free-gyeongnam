import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runSubscriptionTask, validateGeneratedEdits } from "../scripts/subscription-worker.mjs";

const file = "docs/subscription-only-automation.md";
const order = { scope: [file], validation: "documentation", acceptance: ["Fix the stale schedule statement."] };
const files = { [file]: "Existing source.\n" };
const quota = { rateLimits: { primary: { usedPercent: 10 }, credits: { hasCredits: false, unlimited: false } } };
const executable = process.platform === "win32" ? "C:\\fixture\\codex.exe" : "/fixture/codex";

test("generation cannot modify an undeclared file, executable documentation or duplicate path", () => {
  const valid = { summary: "Updated evidence", edits: [{ path: file, content: "Verified evidence\n" }] };
  assert.deepEqual(validateGeneratedEdits(valid, order, files), valid);
  for (const edits of [[{ path: ".github/workflows/ci.yml", content: "bad" }], [{ path: file, content: "<script>alert(1)</script>" }], [...valid.edits, ...valid.edits]]) assert.throws(() => validateGeneratedEdits({ ...valid, edits }, order, files));
});

test("generation and QA are separate ephemeral tool-free ChatGPT executions with no publishing credentials", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "wave-worker-test-"));
  const calls = [];
  try {
    for (const mode of ["implementation", "qa"]) {
      const expected = mode === "implementation" ? { summary: "changed", edits: [{ path: file, content: "Updated\n" }] } : { verdict: "pass", findings: [] };
      const result = runSubscriptionTask({ executable, directory, mode, order, files, quota, env: { PATH: "fixture", GH_TOKEN: "never-pass", OPENAI_API_KEY: "never-pass" }, run: (_exe, args, options) => {
        calls.push(args);
        assert.equal(options.env.GH_TOKEN, undefined); assert.equal(options.env.OPENAI_API_KEY, undefined);
        if (args[0] === "login") return { status: 0, stdout: "Logged in using ChatGPT", stderr: "" };
        for (const value of ["--ephemeral", "read-only", "features.shell_tool=false", "features.apps=false", "features.plugins=false", 'forced_login_method="chatgpt"']) assert.ok(args.includes(value));
        writeFileSync(args[args.indexOf("--output-last-message") + 1], JSON.stringify(expected));
        return { status: 0 };
      } });
      assert.deepEqual(result, expected);
    }
    assert.equal(calls.filter(args => args[0] === "exec").length, 2);
  } finally {
    assert.ok(path.resolve(directory).startsWith(`${path.resolve(tmpdir())}${path.sep}wave-worker-test-`));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("unknown included quota stops before generation; execution failure is not retried", () => {
  let calls = 0;
  const run = () => { calls++; return { status: 0, stdout: "Logged in using ChatGPT", stderr: "" }; };
  assert.throws(() => runSubscriptionTask({ executable, directory: tmpdir(), mode: "implementation", order, files, quota: {}, env: {}, run }), /BLOCKED_QUOTA/);
  assert.equal(calls, 1);
  assert.throws(() => runSubscriptionTask({ executable, directory: tmpdir(), mode: "implementation", order, files, quota, env: {}, run: () => { calls++; return calls === 2 ? { status: 0, stdout: "Logged in using ChatGPT" } : { status: 1 }; } }), /BLOCKED_EXEC/);
  assert.equal(calls, 3);
});
