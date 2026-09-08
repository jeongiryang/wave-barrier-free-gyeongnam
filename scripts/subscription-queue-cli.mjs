import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { REPOSITORY, readWorkOrder, enqueue, claim, heartbeat, ciResult, synchronizeHead, observe, resume, acknowledgeReport } from "./subscription-queue.mjs";
import { githubApi, GitHubQueue, pages } from "./subscription-queue-github.mjs";

// CI run success alone can be Fast feedback. Only these exact, completed job
// results authorize QA/CD. Latest jobs include successful earlier-attempt jobs
// when GitHub reruns only failed jobs; every job must still belong to this run/SHA.
export function ciGateEvidence(run, jobs, headSha) {
  if (!/^[a-f0-9]{40}$/.test(headSha || "") || run?.head_sha !== headSha ||
      run?.path !== ".github/workflows/ci.yml" || run?.head_repository?.full_name !== REPOSITORY ||
      !Number.isSafeInteger(run?.id) || run.id < 1 || !Number.isSafeInteger(run?.run_attempt) || run.run_attempt < 1 ||
      !["pull_request", "push"].includes(run.event) || run.status !== "completed" || run.conclusion !== "success" || !Array.isArray(jobs)) return null;
  const passed = name => {
    const matches = jobs.filter(job => job.name === name);
    return matches.length === 1 && matches[0].run_id === run.id && matches[0].head_sha === headSha && matches[0].status === "completed" && matches[0].conclusion === "success";
  };
  if (!["quality", "sandbox-boundary"].every(passed)) return null;
  if (["validate", "browser (1)", "browser (2)"].every(passed)) return "full";
  if (!jobs.some(job => job.name === "validate") && ["fast-pr-gate", "fast-browser (1)", "fast-browser (2)"].every(passed)) return "fast";
  return null;
}

async function requestFullGate(task, api, now) {
  assertEngineeringIssue(await api(`repos/${REPOSITORY}/issues/${task.order.issue}`));
  const comments = await pages(`repos/${REPOSITORY}/issues/${task.order.issue}/comments`, api);
  const latest = comments.filter(item => item.user?.login === "jeongiryang" && item.body?.startsWith("<!-- wave-work-order:v2 -->")).sort((a,b) => b.id-a.id)[0];
  if (readWorkOrder(task.order.issue, latest).revision !== task.order.revision) throw Error("STALE_WORK_ORDER");
  const current = await api(`repos/${REPOSITORY}/pulls/${task.order.pullRequest}`);
  if (current.state !== "open" || current.head.repo?.full_name !== REPOSITORY || current.head.ref !== task.order.branch) throw Error("INELIGIBLE_PR");
  if (current.head.sha !== task.headSha) return synchronizeHead(task,current.head.sha,now);
  if (current.draft === true && !current.labels?.some(label => label.name === "status:ready-for-qa")) {
    // An immutable Owner order grants this bounded handoff; Issue text supplies
    // no command. The label requests Full validation, not a QA PASS or approval.
    await api(`repos/${REPOSITORY}/issues/${task.order.pullRequest}/labels`,{method:"POST",body:{labels:["status:ready-for-qa"]}});
  }
  return task;
}

export async function scan(api = githubApi) {
  const [issues, pulls, runs] = await Promise.all([
    pages(`repos/${REPOSITORY}/issues?state=open`, api),
    pages(`repos/${REPOSITORY}/pulls?state=open`, api),
    api(`repos/${REPOSITORY}/actions/runs?status=failure&per_page=100`),
  ]);
  // Failure router history is bounded and explicitly reported. Existing failures
  // beyond this window remain on GitHub; polling is not a historical completion audit.
  const events = issues.filter(issue => !issue.pull_request).map(issue => ({ kind: "issue", id: issue.number, revision: createHash("sha256").update(JSON.stringify([issue.title, issue.body, issue.labels.map(label => label.name).sort()])).digest("hex") }));
  events.push(...pulls.map(pr => ({ kind: "pull_request", id: pr.number, revision: pr.head.sha })));
  events.push(...runs.workflow_runs.map(run => ({ kind: "ci_failure", id: run.id, revision: String(run.run_attempt) })));
  for (const issue of issues.filter(issue => !issue.pull_request && issue.comments > 0)) {
    const comments = await pages(`repos/${REPOSITORY}/issues/${issue.number}/comments`, api);
    const latest = comments.filter(item => item.user?.login === "jeongiryang" && item.body?.startsWith("<!-- wave-work-order:v2 -->")).sort((a, b) => b.id - a.id)[0];
    if (!latest) continue;
    try { events.push({ kind: "work_order", id: issue.number, revision: readWorkOrder(issue.number, latest).revision }); } catch { /* Malformed or edited orders are triage inputs, never execution grants. */ }
  }
  return { events, openIssues: issues.filter(issue => !issue.pull_request).length, openPulls: pulls.length, failureWindow: 100, totalFailures: runs.total_count };
}

export async function approvedOrder(issue, api = githubApi) {
  const source = await api(`repos/${REPOSITORY}/issues/${issue}`);
  if (source.state !== "open" || source.pull_request) throw new Error("INELIGIBLE_ISSUE");
  assertEngineeringIssue(source);
  const comments = await pages(`repos/${REPOSITORY}/issues/${issue}/comments`, api);
  const comment = comments.filter(item => item.user?.login === "jeongiryang" && item.body?.startsWith("<!-- wave-work-order:v2 -->")).sort((a, b) => b.id - a.id)[0];
  const order = readWorkOrder(issue, comment);
  const pr = await api(`repos/${REPOSITORY}/pulls/${order.pullRequest}`);
  if (pr.state !== "open" || pr.head.repo?.full_name !== REPOSITORY || pr.head.ref !== order.branch || pr.head.sha !== order.baseSha) throw new Error("STALE_WORK_ORDER");
  return order;
}

function assertEngineeringIssue(source) {
  if (source.body?.startsWith("<!-- wave-provider-hold:v1 -->") || source.labels?.some(label => (typeof label === "string" ? label : label.name) === "status:blocked-external")) {
    throw new Error("BLOCKED_EXTERNAL: operational hold is not an engineering task");
  }
}

export async function main(args, { api = githubApi, queue = new GitHubQueue(api), now = Date.now() } = {}) {
  if (process.env.CI || process.env.GITHUB_ACTIONS) throw new Error("LOCAL_ONLY");
  const [command, issueArg, owner, token] = args;
  if (command === "scan") {
    const result = await scan(api);
    const previous = await queue.read("events");
    const observed = observe(previous.value?.keys, result.events);
    // Reading/printing does not consume events before successful recording.
    return { ...result, events: observed.fresh, previouslyObserved: previous.value?.keys.length || 0 };
  }
  if (command === "observe") {
    const result = await scan(api);
    let fresh;
    const saved = await queue.update("events", previous => { const observed = observe(previous?.keys, result.events); fresh = observed.fresh; return { version: 1, keys: observed.keys }; });
    return { ...saved, fresh };
  }
  if (command === "init") return queue.initialize((await api(`repos/${REPOSITORY}/commits/main`)).sha);
  const issue = Number(issueArg);
  if (!Number.isSafeInteger(issue) || issue < 1) throw new Error("INVALID_ISSUE");
  const key = `issue-${issue}`;
  if (command === "enqueue") return queue.update(key, async previous => enqueue(previous, await approvedOrder(issue, api), now));
  if (command === "show") return (await queue.read(key)).value;
  if (command === "ack-report") return queue.update(key, async task => {
    const pr = await api(`repos/${REPOSITORY}/pulls/${task.order.pullRequest}`);
    return acknowledgeReport(task, owner, pr.head.sha, now);
  });
  if (command === "resume") {
    if ((await api("user")).login !== "jeongiryang") throw new Error("OWNER_RECOVERY_REQUIRED");
    return queue.update(key, task => resume(task, now));
  }
  if (command === "claim") return queue.update(key, async task => {
    assertEngineeringIssue(await api(`repos/${REPOSITORY}/issues/${issue}`));
    const comments = await pages(`repos/${REPOSITORY}/issues/${issue}/comments`, api);
    const latest = comments.filter(item => item.user?.login === "jeongiryang" && item.body?.startsWith("<!-- wave-work-order:v2 -->")).sort((a, b) => b.id - a.id)[0];
    if (readWorkOrder(issue, latest).revision !== task.order.revision) throw new Error("STALE_WORK_ORDER");
    const pr = await api(`repos/${REPOSITORY}/pulls/${task.order.pullRequest}`);
    if (pr.state !== "open" || pr.head.repo?.full_name !== REPOSITORY || pr.head.ref !== task.order.branch || pr.head.sha !== task.headSha) throw new Error("STALE_HEAD");
    return claim(task, owner, token, now);
  });
  if (command === "heartbeat") return queue.update(key, task => heartbeat(task, owner, now));
  if (command === "refresh") return queue.update(key, async task => {
    const pr = await api(`repos/${REPOSITORY}/pulls/${task.order.pullRequest}`);
    if (pr.state !== "open" || pr.head.repo?.full_name !== REPOSITORY || pr.head.ref !== task.order.branch) throw new Error("INELIGIBLE_PR");
    let next = synchronizeHead(task, pr.head.sha, now);
    if (next.state !== "ci-pending") return next;
    const runs = await api(`repos/${REPOSITORY}/actions/workflows/ci.yml/runs?head_sha=${next.headSha}&per_page=100`);
    const latest = runs.workflow_runs.filter(run => run.head_sha === next.headSha && ["pull_request", "push"].includes(run.event)).sort((a, b) => b.id - a.id || b.run_attempt - a.run_attempt)[0];
    if (latest?.status === "completed" && latest.conclusion === "success") {
      const jobs = await pages(`repos/${REPOSITORY}/actions/runs/${latest.id}/jobs?filter=latest`, async endpoint => (await api(endpoint)).jobs);
      const gate = ciGateEvidence(latest,jobs,next.headSha);
      if (gate === "fast") return requestFullGate(next,api,now);
      if (gate !== "full") return next;
    }
    if (latest?.status === "completed" && ["success", "failure", "cancelled", "timed_out"].includes(latest.conclusion)) next = ciResult(next, now, { headSha: next.headSha, runId: latest.id, runAttempt: latest.run_attempt, conclusion: latest.conclusion });
    return next;
  });
  throw new Error("USAGE: init | scan | observe | enqueue ISSUE | show ISSUE | claim ISSUE implementation|qa OWNER | heartbeat ISSUE TOKEN | refresh ISSUE | resume ISSUE");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
