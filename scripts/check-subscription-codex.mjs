import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertIncludedQuota, readSubscriptionQuota } from "./subscription-quota.mjs";

export function subscriptionEnvironment(source) {
  const allowed = new Set(["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "LOCALAPPDATA", "APPDATA", "USERPROFILE", "HOME"]);
  return Object.fromEntries(Object.entries(source).filter(([key]) => allowed.has(key.toUpperCase())));
}

export function checkSubscription({ executable, run = spawnSync, env = process.env, directory, quota }) {
  if (env.CI || env.GITHUB_ACTIONS) throw new Error("LOCAL_ONLY: never copy subscription credentials into CI");
  if (!path.isAbsolute(executable) || !/codex(?:\.exe)?$/i.test(executable)) throw new Error("Use the installed official Codex executable absolute path");
  const childEnv = subscriptionEnvironment(env);
  const invoke = (args, extra = {}) => run(executable, args, { env: childEnv, cwd: directory, encoding: "utf8", windowsHide: true, timeout: 60_000, maxBuffer: 1_000_000, ...extra });
  const status = invoke(["login", "status"]);
  // Only inspect the authentication method. Never log raw authentication output.
  if (status.status !== 0 || !/Logged in using ChatGPT/.test(`${status.stdout}\n${status.stderr}`)) throw new Error("BLOCKED_AUTH: sign in locally with ChatGPT; no API fallback");
  assertIncludedQuota(quota);
  const output = path.join(directory, "result.txt");
  const args = ["exec", "--ignore-user-config", "--ignore-rules", "--ephemeral", "--skip-git-repo-check", "--sandbox", "read-only", "-c", 'forced_login_method="chatgpt"', "-c", 'model_provider="openai"', "-c", 'web_search="disabled"', "-c", "features.shell_tool=false", "-c", "features.apps=false", "-c", "features.plugins=false", "-c", "features.multi_agent=false", "--color", "never", "--output-last-message", output, "-"];
  const prompt = 'This is a fixed, read-only subscription smoke test. Do not use any tools, files, network, plugins, or APIs. Evaluate only this fixture: required reviews=3; approved reviews=0; CI=pass; deployed=false. A PR is ready to merge only if CI passes and approved reviews >= required reviews. Reply exactly: BLOCKED_REVIEW. Do not create tasks or change anything.';
  const result = invoke(args, { input: prompt });
  if (result.status !== 0) throw new Error("BLOCKED_EXEC: quota/auth/transport/execution failure; stop without retry or paid fallback");
  if (readFileSync(output, "utf8").trim() !== "BLOCKED_REVIEW") throw new Error("SMOKE_FAILED: unexpected decision");
  return { authentication: "chatgpt", fixture: "PASS", repositoryWrites: 0, paidApiFallback: false, scheduledExecution: "not_tested" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const directory = mkdtempSync(path.join(tmpdir(), "wave-subscription-smoke-"));
    if (process.env.CI || process.env.GITHUB_ACTIONS) throw new Error("LOCAL_ONLY: never copy subscription credentials into CI");
    const executable = process.argv[2] || "";
    const quota = await readSubscriptionQuota(executable, subscriptionEnvironment(process.env), directory);
    console.log(JSON.stringify(checkSubscription({ executable, directory, quota })));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
