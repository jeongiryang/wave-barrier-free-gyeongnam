import { test } from "node:test";
import assert from "node:assert/strict";
import { publishImplementation, git } from "../scripts/subscription-publish.mjs";
import { enqueue, claim } from "../scripts/subscription-queue.mjs";

const A = "a".repeat(40), B = "b".repeat(40), Q = "c".repeat(40);
const order = { issue: 294, baseSha: A, revision: "one", branch: "chore/automation-control-plane", pullRequest: 289 };
const task = () => claim(enqueue(null, order, 0), "implementation", "worker", 0, "lease");

test("git failures retain operation and safe categories without disclosing raw remote output", () => {
  assert.throws(() => git("fixture", ["worktree", "add"], { run: () => ({ status: 1, stderr: "fatal: unable to create private-user-value/index.lock" }) }), error => error.message.includes("operation=worktree") && error.message.includes("index.lock") && !error.message.includes("private-user-value"));
});

test("publication updates implementation and fencing state atomically with no forced or partial fallback", () => {
  const calls = [];
  const runGit = (_dir, args) => {
    calls.push(args);
    if (args[0] === "show") return JSON.stringify(args[1].endsWith(":vercel.json") ? { git: { deploymentEnabled: false } } : task());
    if (["rev-parse", "hash-object", "write-tree", "commit-tree"].includes(args[0])) return Q;
    if (args[0] === "push") throw new Error("competing queue writer");
    return "";
  };
  assert.throws(() => publishImplementation({ directory: "fixture", task: task(), token: "lease", headSha: B, now: 1, runGit }), /competing/);
  assert.equal(calls.filter(args => args[0] === "push").length, 1);
  assert.deepEqual(calls.at(-1), ["push", "--atomic", "origin", `${B}:refs/heads/chore/automation-control-plane`, `${Q}:refs/heads/automation/queue-state`]);
  assert.equal(calls.flat().some(arg => arg.includes("--force")), false);
});

test("a remote lease replacement fences the old process before it can publish a commit", () => {
  const calls = [];
  const remote = { ...task(), lease: { ...task().lease, token: "replacement" } };
  assert.throws(() => publishImplementation({ directory: "fixture", task: task(), token: "lease", headSha: B, now: 1, runGit: (_dir, args) => { calls.push(args); return args[0] === "show" ? JSON.stringify(args[1].endsWith(":vercel.json") ? { git: { deploymentEnabled: false } } : remote) : Q; } }), /LOST_LEASE/);
  assert.equal(calls.some(args => args[0] === "push"), false);
});
