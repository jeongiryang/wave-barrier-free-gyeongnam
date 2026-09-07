import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, lstatSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { REPOSITORY, QUEUE_BRANCH, assertLease, implementationResult } from "./subscription-queue.mjs";

export function git(directory, args, { input, env = process.env, run = spawnSync } = {}) {
  const result = run("git", ["-c", "user.name=WAVE Engineering", "-c", "user.email=wave-automation@users.noreply.github.com", ...args], { cwd: directory, input, env, encoding: "utf8", windowsHide: true, timeout: 60_000, maxBuffer: 1_000_000 });
  if (result.status !== 0) throw new Error("GIT_OPERATION_FAILED: preserve worktree; inspect locally; never force or retry publication");
  return result.stdout.trim();
}

export function createIsolatedWorktree(repository, headSha) {
  const remote = git(repository, ["remote", "get-url", "origin"]);
  if (![ `https://github.com/${REPOSITORY}.git`, `https://github.com/${REPOSITORY}`, `git@github.com:${REPOSITORY}.git` ].includes(remote)) throw new Error("UNEXPECTED_REMOTE");
  if (!/^[a-f0-9]{40}$/.test(headSha)) throw new Error("INVALID_HEAD");
  git(repository, ["fetch", "origin", headSha]);
  const root = mkdtempSync(path.join(tmpdir(), "wave-queue-work-"));
  const directory = path.join(root, "checkout");
  git(repository, ["worktree", "add", "--detach", directory, headSha]);
  return { root, directory };
}

export function applyEdits(directory, headSha, edits) {
  if (git(directory, ["rev-parse", "HEAD"]) !== headSha || git(directory, ["status", "--porcelain"])) throw new Error("WORKTREE_NOT_CLEAN");
  const root = realpathSync(directory);
  for (const edit of edits) {
    const file = path.resolve(root, edit.path);
    if (!file.startsWith(`${root}${path.sep}`) || lstatSync(file).isSymbolicLink() || realpathSync(file) !== file || !git(directory, ["ls-tree", headSha, "--", edit.path]).startsWith("100644 blob ")) throw new Error("UNSAFE_FILE_TARGET");
  }
  for (const edit of edits) writeFileSync(path.join(root, edit.path), edit.content, "utf8");
  git(directory, ["diff", "--check"]);
}

// Two normal fast-forward ref updates in one atomic Git push fence late workers:
// if another actor changes the queue or PR ref, neither update is published.
// There is deliberately no non-atomic or force-push fallback.
export function publishImplementation({ directory, task, token, headSha, now = Date.now(), runGit = git }) {
  assertLease(task, token, now);
  if (!/^[a-f0-9]{40}$/.test(headSha)) throw new Error("INVALID_HEAD");
  runGit(directory, ["fetch", "origin", `refs/heads/${QUEUE_BRANCH}`]);
  const queueHead = runGit(directory, ["rev-parse", "FETCH_HEAD"]);
  const key = `.wave/queue/issue-${task.order.issue}.json`;
  const remoteTask = JSON.parse(runGit(directory, ["show", `${queueHead}:${key}`]));
  assertLease(remoteTask, token, now, task.headSha);
  if (remoteTask.order.revision !== task.order.revision) throw new Error("STALE_WORK_ORDER");
  const result = implementationResult(remoteTask, token, now, { headSha, pullRequest: task.order.pullRequest });
  const root = mkdtempSync(path.join(tmpdir(), "wave-queue-index-"));
  const env = { ...process.env, GIT_INDEX_FILE: path.join(root, "index") };
  runGit(directory, ["read-tree", queueHead], { env });
  const blob = runGit(directory, ["hash-object", "-w", "--stdin"], { input: `${JSON.stringify(result, null, 2)}\n`, env });
  runGit(directory, ["update-index", "--add", "--cacheinfo", "100644", blob, key], { env });
  const tree = runGit(directory, ["write-tree"], { env });
  const commit = runGit(directory, ["commit-tree", tree, "-p", queueHead, "-m", `chore: record issue ${task.order.issue} implementation ${headSha.slice(0, 7)}`], { env });
  runGit(directory, ["push", "--atomic", "origin", `${headSha}:refs/heads/${task.order.branch}`, `${commit}:refs/heads/${QUEUE_BRANCH}`]);
  return { headSha, queueCommit: commit, state: result.state, pullRequest: task.order.pullRequest };
}

export function readScopedFiles(directory, order) {
  return Object.fromEntries(order.scope.map(file => {
    const target = path.resolve(directory, file), root = realpathSync(directory);
    if (!target.startsWith(`${root}${path.sep}`) || lstatSync(target).isSymbolicLink() || realpathSync(target) !== target) throw new Error("UNSAFE_FILE_TARGET");
    return [file, readFileSync(target, "utf8")];
  }));
}
