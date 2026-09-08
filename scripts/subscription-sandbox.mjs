import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, lstatSync, mkdtempSync, openSync, closeSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { git, trustedGitExecutable } from "./subscription-publish.mjs";

const bridge = fileURLToPath(new URL("./subscription-sandbox.py", import.meta.url));
export function wslPath(value) {
  if (!/^[A-Za-z]:[\\/]/.test(value) || /[\0\r\n]/.test(value)) throw new Error("BLOCKED_SANDBOX");
  return `/mnt/${value[0].toLowerCase()}/${value.slice(3).replaceAll("\\", "/")}`;
}

export function sandboxConfiguration(env = process.env) {
  const file = env.WAVE_VALIDATION_SANDBOX_CONFIG;
  let config;
  try {
    if (!file || !path.isAbsolute(file) || lstatSync(file).isSymbolicLink()) throw new Error("BLOCKED_SANDBOX");
    config = JSON.parse(readFileSync(realpathSync(file), "utf8"));
  } catch { throw new Error("BLOCKED_SANDBOX"); }
  if (config?.version !== 1 || ![config.bwrap, config.runtime, config.browsers, config.scratch, ...(config.quotaBwrap === undefined ? [] : [config.quotaBwrap])].every(value => typeof value === "string" && value.startsWith("/") && !/[\0\r\n]/.test(value)) || ![config.bwrapSha256, config.nodeSha256].every(value => /^[a-f0-9]{64}$/.test(value || "")) || Object.keys(config).some(key => !["version", "bwrap", "runtime", "browsers", "scratch", "bwrapSha256", "nodeSha256", "quotaBwrap"].includes(key))) throw new Error("BLOCKED_SANDBOX");
  return config;
}

export function sandboxCall(action, config, extra = {}, run = spawnSync) {
  if (!["probe", "validate"].includes(action)) throw new Error("BLOCKED_SANDBOX");
  const windows = process.platform === "win32";
  const command = windows ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "wsl.exe") : "/usr/bin/systemd-run";
  // No sudo/polkit fallback on an operator host. Missing user-manager/controller
  // delegation is blocked-sandbox, not permission to run the helper unbounded.
  const bounded = ["--user", "--quiet", "--wait", "--pipe", "--collect",
    "--property=MemoryMax=6G", "--property=MemorySwapMax=0", "--property=TasksMax=1024",
    "--property=CPUQuota=200%", "--property=OOMPolicy=kill", "--property=KillMode=control-group",
    "--property=RuntimeMaxSec=1200", "--", "/usr/bin/python3", "-I", "-B", windows ? wslPath(bridge) : bridge];
  const args = windows ? ["--exec", "/usr/bin/systemd-run", ...bounded] : bounded;
  const result = run(command, args, { input: JSON.stringify({ action, config, ...extra }), encoding: "utf8", windowsHide: true, timeout: action === "probe" ? 30_000 : 25 * 60_000, maxBuffer: 100_000 });
  // Never print helper stderr or a generated repository's arbitrary output.
  if (result.status !== 0) throw new Error("BLOCKED_SANDBOX: isolated validation failed; preserve checkpoint; no host fallback");
  let receipt;
  try { receipt = JSON.parse(result.stdout); } catch { throw new Error("BLOCKED_SANDBOX"); }
  if (receipt.result !== "PASS" || receipt.boundary !== "linux-bwrap-v1" || receipt.network !== "isolated" || receipt.filesystem !== "isolated") throw new Error("BLOCKED_SANDBOX");
  return receipt;
}

export function assertValidationSandbox(env = process.env) {
  const config = sandboxConfiguration(env);
  sandboxCall("probe", config);
  return config;
}

const boundaryChecks = ["outside-files", "home-appdata-userprofile", "external-network", "local-network", "host-mounts"];
const applicationChecks = ["npm run lint", "npm run typecheck", "npm test", "npm run build:vercel", "npm run check:performance"];

// The active documentation worker reads approved files as data. It never starts
// the candidate's package scripts; complete product validation belongs to the
// exact published HEAD's unchanged GitHub-hosted CI before independent QA.
export function documentationEvidence(directory, scope) {
  if (!Array.isArray(scope) || !scope.length || scope.some(file => typeof file !== "string" || !/^docs\/[A-Za-z0-9_./-]+\.md$/.test(file) || file.split("/").includes(".."))) throw new Error("UNAPPROVED_DOCUMENTATION_CHANGE");
  if (git(directory, ["ls-files", "--others", "--exclude-standard", "-z"])) throw new Error("UNAPPROVED_DOCUMENTATION_CHANGE");
  const changed = git(directory, ["diff", "--no-ext-diff", "--no-textconv", "--name-only", "-z", "HEAD"]).split("\0").filter(Boolean);
  if (!changed.length) throw new Error("EMPTY_DOCUMENTATION_CHANGE");
  if (changed.some(file => !scope.includes(file))) throw new Error("UNAPPROVED_DOCUMENTATION_CHANGE");
  git(directory, ["diff", "--no-ext-diff", "--no-textconv", "--check", "HEAD"]);
  const root = realpathSync(directory);
  const files = changed.map(file => {
    const target = path.resolve(root, file);
    let content;
    try {
      if (!target.startsWith(`${root}${path.sep}`) || lstatSync(target).isSymbolicLink() || realpathSync(target) !== target || !git(directory, ["ls-tree", "HEAD", "--", file]).startsWith("100644 blob ")) throw new Error();
      content = readFileSync(target, "utf8");
    } catch { throw new Error("UNSAFE_DOCUMENTATION_RESULT"); }
    if (content.length > 100_000 || content.includes("\0") || /<script\b|javascript:/i.test(content)) throw new Error("UNSAFE_DOCUMENTATION_RESULT");
    return { path: file, sha256: createHash("sha256").update(content).digest("hex") };
  });
  return { kind: "approved-documentation-data", result: "PASS", files, productValidation: { source: "GitHub-hosted CI", state: "pending-exact-head-ci" } };
}

export async function validateDocumentationData(directory, logRoot, beforeCheck, notify = console.log, { scope, probe = () => sandboxCall("probe", sandboxConfiguration()) } = {}) {
  const boundary = probe();
  if (boundary?.result !== "PASS" || boundary.boundary !== "linux-bwrap-v1" || boundary.network !== "isolated" || boundary.filesystem !== "isolated" || JSON.stringify(boundary.checks) !== JSON.stringify(boundaryChecks)) throw new Error("BLOCKED_SANDBOX");
  await beforeCheck();
  const documentation = documentationEvidence(directory, scope);
  await beforeCheck();
  writeFileSync(path.join(logRoot, "documentation-validation.json"), JSON.stringify({ boundary, documentation }, null, 2));
  notify("VALIDATED: frozen boundary and approved documentation data; full product CI pending on published HEAD");
  return { result: "PASS", localChecks: ["frozen sandbox boundary", "approved documentation data"], boundary: boundary.boundary, productValidation: documentation.productValidation };
}

// Each call has its own unchanged 20-minute process-group limit. A partial,
// repeated or missing shard is never evidence for publication of the full suite.
// Preserved historical validation path; the active documentation worker does
// not call it. Tests and four-shard failure evidence remain intact.
export async function collectValidationShards(validateShard) {
  const shards = [];
  for (const shard of [1, 2, 3, 4]) {
    const receipt = await validateShard(shard);
    const checks = [...boundaryChecks, ...applicationChecks, `npm run test:e2e -- --shard=${shard}/4`];
    if (receipt?.result !== "PASS" || receipt.boundary !== "linux-bwrap-v1" || receipt.network !== "isolated" || receipt.filesystem !== "isolated" || receipt.shard !== shard || JSON.stringify(receipt.checks) !== JSON.stringify(checks)) throw new Error("BLOCKED_SANDBOX: incomplete isolated suite");
    shards.push(receipt);
  }
  return { result: "PASS", boundary: "linux-bwrap-v1", network: "isolated", filesystem: "isolated", checks: [...boundaryChecks, ...applicationChecks, "npm run test:e2e (all four shards)"], shards };
}

export async function validateInSandbox(directory, logRoot, beforeCheck, notify = console.log) {
  const config = assertValidationSandbox();
  await beforeCheck();
  // Export tracked bytes only: no .git link, local .env, credentials or node_modules.
  // Only the already validated documentation edits are overlaid by the bridge.
  const root = mkdtempSync(path.join(tmpdir(), "wave-validation-export-"));
  const archive = path.join(root, "source.tar");
  const fd = openSync(archive, "wx");
  let result;
  try { result = spawnSync(trustedGitExecutable(), ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "archive", "HEAD"], { cwd: directory, stdio: ["ignore", fd, "pipe"], windowsHide: true, timeout: 30_000 }); } finally { closeSync(fd); }
  if (result.status !== 0) throw new Error("BLOCKED_SANDBOX");
  const changes = spawnSync(trustedGitExecutable(), ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "diff", "--no-ext-diff", "--name-only", "-z", "HEAD"], { cwd: directory, encoding: "utf8", windowsHide: true, timeout: 30_000 });
  if (changes.status !== 0) throw new Error("BLOCKED_SANDBOX");
  const edits = {};
  for (const file of changes.stdout.split("\0").filter(Boolean)) {
    if (!/^docs\/[A-Za-z0-9_./-]+\.md$/.test(file) || file.split("/").includes("..")) throw new Error("BLOCKED_SANDBOX");
    const target = path.resolve(directory, file);
    if (lstatSync(target).isSymbolicLink() || realpathSync(target) !== target) throw new Error("BLOCKED_SANDBOX");
    edits[file] = readFileSync(target, "utf8");
  }
  notify("VALIDATING: isolated Linux filesystem and network; no host npm execution");
  const receipt = await collectValidationShards(async shard => {
    await beforeCheck();
    return sandboxCall("validate", config, { archive: process.platform === "win32" ? wslPath(archive) : archive, edits, shard });
  });
  await beforeCheck();
  writeFileSync(path.join(logRoot, "sandbox-validation.json"), JSON.stringify(receipt, null, 2));
  return { localChecks: receipt.checks, result: "PASS", boundary: receipt.boundary };
}
