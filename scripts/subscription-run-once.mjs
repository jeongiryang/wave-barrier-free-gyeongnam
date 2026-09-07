import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { REPOSITORY, block, heartbeat, qaResult, assertLease } from "./subscription-queue.mjs";
import { githubApi, GitHubQueue, pages } from "./subscription-queue-github.mjs";
import { main as queueCommand, scan } from "./subscription-queue-cli.mjs";
import { subscriptionEnvironment } from "./check-subscription-codex.mjs";
import { readSubscriptionQuota } from "./subscription-quota.mjs";
import { runSubscriptionTask } from "./subscription-worker.mjs";
import { git, createIsolatedWorktree, applyEdits, readScopedFiles, publishImplementation } from "./subscription-publish.mjs";
import { assertValidationSandbox, validateInSandbox } from "./subscription-sandbox.mjs";


export async function workerEvidence(task, phase, api = githubApi) {
  const evidence = { githubReceipts: task.receipts, phase, implementationOwner: task.implementationOwner || null };
  // Older receipts contain a URL only. Retrieve the exact coordinator comment,
  // never arbitrary Issue instructions, so a retry can address the actual defect.
  const rejection = task.receipts.findLast(item => item.kind === "qa" && item.conclusion === "fail" && item.headSha === task.headSha);
  if (phase !== "implementation" || !rejection || rejection.findings?.length) return evidence;
  const prefix = `https://github.com/${REPOSITORY}/pull/${task.order.pullRequest}#issuecomment-`;
  const commentId = rejection.evidenceUrl?.startsWith(prefix) && rejection.evidenceUrl.slice(prefix.length);
  if (!/^[1-9][0-9]*$/.test(commentId || "")) throw new Error("INVALID_QA_EVIDENCE");
  const comment = await api(`repos/${REPOSITORY}/issues/comments/${commentId}`);
  const marker = `<!-- wave-subscription-qa:${task.order.revision}:${task.headSha} -->`;
  if (comment.user?.login !== "jeongiryang" || !comment.body?.startsWith(marker) || comment.body.length > 45_000 || !comment.body.includes("별도 QA: **FAIL**")) throw new Error("INVALID_QA_EVIDENCE");
  return { ...evidence, priorRejection: { headSha: task.headSha, evidenceUrl: rejection.evidenceUrl, text: comment.body } };
}

export function validateDocumentation(directory, logRoot, beforeCheck, notify = console.log) {
  return validateInSandbox(directory, logRoot, beforeCheck, notify);
}

export async function runOnce({ issue, executable, repository = process.cwd(), phase }) {
  if (process.env.CI || process.env.GITHUB_ACTIONS) throw new Error("LOCAL_ONLY");
  if (!["implementation", "qa"].includes(phase)) throw new Error("INVALID_PHASE");
  const queue = new GitHubQueue(), key = `issue-${issue}`;
  let current = (await queue.read(key)).value;
  if (!current) {
    if (phase !== "implementation") throw new Error("NO_QUEUED_TASK");
    current = (await queueCommand(["enqueue", String(issue)])).value;
  }
  if (phase === "qa") current = (await queueCommand(["refresh", String(issue)])).value;
  if (phase === "implementation" && !["queued", "implementing"].includes(current.state)) return { state: current.state, duplicate: true, modelCalls: 0 };
  if (phase === "qa" && !["qa-ready", "qa-running"].includes(current.state)) return { state: current.state, modelCalls: 0 };
  const owner = `${phase}-${randomUUID()}`;
  current = (await queueCommand(["claim", String(issue), phase, owner])).value;
  if (!current.lease) return { state: current.state, modelCalls: 0 };
  const token = current.lease.token;
  const touch = async () => { current = (await queue.update(key, task => heartbeat(task, token, Date.now()))).value; };
  try {
    // The first real smoke is documentation-only. Do not execute generated
    // application code on a credential-bearing local PC without a tested sandbox.
    if (current.order.validation !== "documentation" || current.order.scope.some(file => !/^docs\/.+\.md$/.test(file))) {
      await queue.update(key, task => block(task, token, Date.now(), "sandbox"));
      return { state: "blocked-sandbox", modelCalls: 0 };
    }
    // Documentation changes do not make the checkout's npm scripts trustworthy.
    // Probe before model/worktree/validation/publication, with no host fallback.
    assertValidationSandbox();
    const { root, directory } = createIsolatedWorktree(repository, current.headSha);
    console.log(JSON.stringify({ phase, issue, baseSha: current.headSha, workspace: "isolated-checkout" }));
    const quota = await readSubscriptionQuota(executable, subscriptionEnvironment(process.env), root);
    const files = readScopedFiles(directory, current.order);
    const evidence = await workerEvidence(current, phase);
    const result = runSubscriptionTask({ executable, directory: root, mode: phase, order: current.order, files, evidence, quota });
    await touch();
    if (phase === "implementation") {
      applyEdits(directory, current.headSha, result.edits);
      const validation = await validateDocumentation(directory, root, touch);
      await touch();
      git(directory, ["add", "--", ...result.edits.map(edit => edit.path)]);
      git(directory, ["commit", "-m", `docs: resolve approved subscription task #${issue}`]);
      const headSha = git(directory, ["rev-parse", "HEAD"]);
      writeFileSync(path.join(root, "receipt.json"), JSON.stringify({ issue, headSha, validation, modelAuthentication: "chatgpt", paidFallback: false }, null, 2));
      // Recheck the PR immediately before the atomic publication. No ready/merge.
      const pr = await githubApi(`repos/${REPOSITORY}/pulls/${current.order.pullRequest}`);
      if (pr.state !== "open" || pr.head.sha !== current.headSha || pr.head.ref !== current.order.branch || pr.head.repo?.full_name !== REPOSITORY) throw new Error("STALE_HEAD");
      const published = publishImplementation({ directory, task: current, token, headSha });
      console.log(JSON.stringify({ ...published, validation, receipt: "receipt.json" }));
      return published;
    }
    // A fresh process/context produced this QA. Its result is pinned to the same
    // HEAD and current lease before writing the evidence comment.
    const pr = await githubApi(`repos/${REPOSITORY}/pulls/${current.order.pullRequest}`);
    if (pr.head.sha !== current.headSha || pr.state !== "open") throw new Error("STALE_HEAD");
    assertLease((await queue.read(key)).value, token, Date.now(), current.headSha);
    const marker = `<!-- wave-subscription-qa:${current.order.revision}:${current.headSha} -->`;
    const existing = (await pages(`repos/${REPOSITORY}/issues/${current.order.pullRequest}/comments`)).find(comment => comment.user?.login === "jeongiryang" && comment.body?.startsWith(marker));
    if (existing && !existing.body.includes(`별도 QA: **${result.verdict.toUpperCase()}**`)) throw new Error("CONFLICTING_QA_RECEIPT");
    const body = `${marker}\n구독 전용 별도 QA: **${result.verdict.toUpperCase()}**\n\n검증 HEAD: \`${current.headSha}\`\n작업: #${issue}; 구현 실행과 다른 ephemeral Codex 프로세스, 도구/게시 권한 없음. CI 근거는 공용 queue에 기록했습니다.\n\n${result.findings.length ? result.findings.map(finding => `- ${finding}`).join("\n") : "승인된 문서 범위의 AC와 제출된 검증 근거를 확인했습니다."}\n\n사람 승인·병합·Production·Release GO를 대신하지 않습니다.`;
    const comment = existing || await githubApi(`repos/${REPOSITORY}/issues/${current.order.pullRequest}/comments`, { method: "POST", body: { body } });
    const finished = await queue.update(key, task => qaResult(task, token, Date.now(), { headSha: current.headSha, conclusion: result.verdict, evidenceUrl: comment.html_url, findings: result.findings }));
    return { state: finished.value.state, headSha: current.headSha, evidenceUrl: comment.html_url, notion: "pending-confirmed-dashboard-update" };
  } catch (error) {
    const reason = /SANDBOX/.test(error.message) ? "sandbox" : /QUOTA/.test(error.message) ? "quota" : /AUTH/.test(error.message) ? "auth" : "external";
    try { await queue.update(key, task => block(task, token, Date.now(), reason)); } catch { /* A replaced/expired owner must not overwrite its successor. */ }
    throw error;
  }
}

export async function tick(executable, { queue = new GitHubQueue(), scanInputs = scan, command = queueCommand, execute = runOnce, now = Date.now() } = {}) {
  const inputs = await scanInputs();
  const candidates = [];
  for (const event of inputs.events.filter(item => item.kind === "work_order")) {
    let task = (await queue.read(`issue-${event.id}`)).value;
    if (!task || task.order.revision !== event.revision) task = (await command(["enqueue", String(event.id)])).value;
    if (["ci-pending", "qa-ready", "qa-running", "verified-awaiting-human"].includes(task.state)) task = (await command(["refresh", String(event.id)])).value;
    if (task.lease?.expiresAt > now || task.notBefore > now) continue;
    if (["queued", "implementing", "qa-ready", "qa-running"].includes(task.state)) candidates.push(task);
  }
  // Save observations only after eligible work orders are durably queued. A
  // failed enqueue does not consume an event and quietly lose the work.
  await command(["observe"]);
  candidates.sort((a, b) => a.order.priority.localeCompare(b.order.priority) || a.updatedAt - b.updatedAt || a.order.issue - b.order.issue);
  if (!candidates.length) return { state: "idle-or-waiting", modelCalls: 0, openIssues: inputs.openIssues, openPulls: inputs.openPulls };
  const selected = candidates[0];
  return execute({ issue: selected.order.issue, executable, phase: selected.state.startsWith("qa-") ? "qa" : "implementation" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [phase, issueArg, executable] = process.argv.slice(2);
  (phase === "tick" ? tick(issueArg) : runOnce({ phase, issue: Number(issueArg), executable })).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
