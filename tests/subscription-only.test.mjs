import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import yaml from "js-yaml";
import { checkSubscription, subscriptionEnvironment } from "../scripts/check-subscription-codex.mjs";
import { assertIncludedQuota } from "../scripts/subscription-quota.mjs";
const quota = { rateLimits: { primary: { usedPercent: 10 }, credits: { hasCredits: false, unlimited: false } } };

test("unknown, exhausted or credit-backed usage cannot start subscription smoke", () => {
  assert.doesNotThrow(() => assertIncludedQuota(quota));
  assert.throws(() => assertIncludedQuota({}), /BLOCKED_QUOTA/);
  assert.throws(() => assertIncludedQuota({ rateLimits: { ...quota.rateLimits, primary: { usedPercent: 100 } } }), /BLOCKED_QUOTA/);
  assert.throws(() => assertIncludedQuota({ rateLimits: { ...quota.rateLimits, credits: { hasCredits: true, unlimited: false } } }), /BLOCKED_QUOTA/);
});

test("every preserved API job is statically disabled, including recovery and publication", () => {
  for (const file of readdirSync(".github/workflows")) {
    if (!/^automation-(codex-worker|independent-qa|pm-dispatch|post-deploy-qa)\.yml$/.test(file)) continue;
    const workflow = yaml.load(readFileSync(`.github/workflows/${file}`, "utf8"));
    for (const [name, job] of Object.entries(workflow.jobs)) {
      if (file.includes("post-deploy") && name !== "notify-pm") continue;
      assert.match(job.if, /^false && \(/, `${file}:${name}`);
    }
  }
});

test("subscription smoke never inherits model keys, auth tokens, endpoint overrides, or CI credentials", () => {
  const result = subscriptionEnvironment({ PATH: "fixture", USERPROFILE: "fixture", OPENAI_API_KEY: "fixture", CODEX_API_KEY: "fixture", CODEX_ACCESS_TOKEN: "fixture", OPENAI_BASE_URL: "fixture", CODEX_HOME: "fixture", GH_TOKEN: "fixture", HTTPS_PROXY: "fixture" });
  assert.deepEqual(result, { PATH: "fixture", USERPROFILE: "fixture" });
});

test("non-ChatGPT auth and CI execution stop before inference", () => {
  let calls = 0;
  const options = { executable: process.platform === "win32" ? "C:\\fixture\\codex.exe" : "/fixture/codex", directory: process.cwd(), env: {}, run: () => { calls++; return { status: 0, stdout: "Logged in using an API key", stderr: "" }; } };
  assert.throws(() => checkSubscription(options), /BLOCKED_AUTH/);
  assert.equal(calls, 1);
  assert.throws(() => checkSubscription({ ...options, env: { CI: "true" } }), /LOCAL_ONLY/);
  assert.equal(calls, 1);
});

test("quota or authentication failure has no retry or paid fallback", () => {
  let calls = 0;
  const options = { executable: process.platform === "win32" ? "C:\\fixture\\codex.exe" : "/fixture/codex", directory: process.cwd(), env: {}, quota, run: (_command, args, config) => {
    calls++;
    if (calls === 1) return { status: 0, stdout: "Logged in using ChatGPT", stderr: "" };
    assert.ok(args.includes('forced_login_method="chatgpt"'));
    assert.ok(args.includes("--ignore-user-config"));
    assert.ok(args.includes("read-only"));
    assert.equal(config.env.OPENAI_API_KEY, undefined);
    return { status: 1, stdout: "", stderr: "usage limit reached" };
  } };
  assert.throws(() => checkSubscription(options), /BLOCKED_EXEC/);
  assert.equal(calls, 2);
});
