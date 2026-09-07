import { createHash, randomUUID } from "node:crypto";

export const REPOSITORY = "jeongiryang/wave-barrier-free-gyeongnam";
export const QUEUE_BRANCH = "automation/queue-state";
export const LEASE_MS = 30 * 60_000;
export const MAX_ATTEMPTS = 2;
export const RETRY_DELAY_MS = 15 * 60_000;
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const id = value => Number.isSafeInteger(value) && value > 0;
const fail = code => { throw new Error(code); };

// Only an immutable, owner-authored work order can grant scope. Issue/mail text,
// labels, event actors and this marker on somebody else's comment cannot do so.
export function readWorkOrder(issue, comment) {
  if (!id(issue) || comment?.user?.login !== "jeongiryang" || !id(comment.id) || typeof comment.created_at !== "string" || !Number.isFinite(Date.parse(comment.created_at)) || comment.created_at !== comment.updated_at) fail("UNTRUSTED_WORK_ORDER");
  const match = /^<!-- wave-work-order:v2 -->\s*```json\s*\n([\s\S]+?)\n```\s*$/.exec(comment.body || "");
  if (!match) fail("INVALID_WORK_ORDER");
  let order; try { order = JSON.parse(match[1]); } catch { fail("INVALID_WORK_ORDER"); }
  const allowed = new Set(["version", "issue", "priority", "baseSha", "branch", "pullRequest", "scope", "acceptance", "validation"]);
  if (Object.keys(order).some(key => !allowed.has(key)) || order.version !== 2 || order.issue !== issue || !/^P[0-3]$/.test(order.priority) || !sha(order.baseSha) || !id(order.pullRequest)) fail("INVALID_WORK_ORDER");
  if (!/^(?:fix|feat|chore|refactor)\/[a-z0-9][a-z0-9/-]{0,100}$/.test(order.branch) || order.branch.includes("..") || order.branch.endsWith("/")) fail("INVALID_BRANCH");
  if (!Array.isArray(order.scope) || order.scope.length < 1 || order.scope.length > 20 || order.scope.some(file => typeof file !== "string" || !/^[A-Za-z0-9_./-]+$/.test(file) || file.startsWith("/") || file.split("/").some(part => ["", ".", "..", ".git"].includes(part)) || /(?:^|\/)(?:\.env[^/]*|auth\.json|credentials[^/]*|node_modules)(?:\/|$)/i.test(file))) fail("INVALID_SCOPE");
  if (new Set(order.scope).size !== order.scope.length || !Array.isArray(order.acceptance) || order.acceptance.length < 1 || order.acceptance.length > 10 || order.acceptance.some(item => typeof item !== "string" || item.length < 1 || item.length > 2000)) fail("INVALID_ACCEPTANCE");
  // Validation is a trusted profile, never shell supplied in an Issue comment.
  if (!["documentation", "application"].includes(order.validation)) fail("INVALID_VALIDATION");
  return { ...order, commentId: comment.id, revision: digest({ issue, commentId: comment.id, order }) };
}

export function enqueue(previous, order, now) {
  if (previous?.order.revision === order.revision) return previous;
  // A replacement cannot race a live owner. It must be claimed after expiry.
  if (previous?.lease?.expiresAt > now) fail("ACTIVE_LEASE");
  return { version: 1, order, state: "queued", attempts: { implementation: 0, qa: 0 }, headSha: order.baseSha, generation: (previous?.generation || 0) + 1, updatedAt: now, lease: null, receipts: [], report: null };
}

export function claim(task, phase, owner, now, token = randomUUID()) {
  if (!["implementation", "qa"].includes(phase) || !/^[a-zA-Z0-9_-]{1,60}$/.test(owner)) fail("INVALID_CLAIM");
  if (task.lease?.expiresAt > now) fail("ACTIVE_LEASE");
  if (task.notBefore > now) fail("RETRY_WAIT");
  const eligible = phase === "implementation" ? ["queued", "implementing"] : ["qa-ready", "qa-running"];
  if (!eligible.includes(task.state)) fail("INELIGIBLE_STATE");
  if (phase === "qa" && owner === task.implementationOwner) fail("INDEPENDENT_QA_REQUIRED");
  if (task.attempts[phase] >= MAX_ATTEMPTS) return { ...task, state: "blocked-retry", lease: null, updatedAt: now };
  return { ...task, state: phase === "qa" ? "qa-running" : "implementing", attempts: { ...task.attempts, [phase]: task.attempts[phase] + 1 }, generation: task.generation + 1, updatedAt: now, lease: { phase, owner, token, expiresAt: now + LEASE_MS, headSha: task.headSha } };
}

export function assertLease(task, token, now, headSha = task.headSha) {
  if (!task.lease || task.lease.token !== token || task.lease.expiresAt <= now) fail("LOST_LEASE");
  if (task.headSha !== headSha || task.lease.headSha !== headSha) fail("STALE_HEAD");
}

export function heartbeat(task, token, now) {
  assertLease(task, token, now);
  return { ...task, updatedAt: now, lease: { ...task.lease, expiresAt: now + LEASE_MS } };
}

export function implementationResult(task, token, now, result) {
  assertLease(task, token, now);
  if (!sha(result.headSha) || result.pullRequest !== task.order.pullRequest) fail("INVALID_RESULT");
  return { ...task, state: "ci-pending", headSha: result.headSha, implementationOwner: task.lease.owner, lease: null, updatedAt: now, report: null };
}

export function ciResult(task, now, { headSha, runId, runAttempt, conclusion }) {
  if (!sha(headSha) || !id(runId) || !id(runAttempt) || !["success", "failure", "cancelled", "timed_out"].includes(conclusion)) fail("INVALID_CI_RESULT");
  if (headSha !== task.headSha) fail("STALE_HEAD");
  if (task.receipts.some(receipt => receipt.kind === "ci" && receipt.id === runId && receipt.attempt === runAttempt)) return task;
  if (task.state !== "ci-pending") fail("INELIGIBLE_STATE");
  return { ...task, state: conclusion === "success" ? "qa-ready" : task.attempts.implementation >= MAX_ATTEMPTS ? "blocked-retry" : "queued", notBefore: conclusion === "success" ? now : now + RETRY_DELAY_MS, updatedAt: now, receipts: [...task.receipts, { kind: "ci", id: runId, attempt: runAttempt, headSha, conclusion }] };
}

export function qaResult(task, token, now, { headSha, conclusion, evidenceUrl }) {
  assertLease(task, token, now, headSha);
  if (task.lease.phase !== "qa" || !["pass", "fail"].includes(conclusion) || !new RegExp(`^https://github\\.com/${REPOSITORY}/(?:pull|issues)/[0-9]+#(?:issuecomment|discussion_r|pullrequestreview)-?[0-9]+$`).test(evidenceUrl)) fail("INVALID_QA_RESULT");
  const state = conclusion === "pass" ? "verified-awaiting-human" : task.attempts.implementation >= MAX_ATTEMPTS ? "blocked-retry" : "queued";
  const receipt = { kind: "qa", headSha, conclusion, evidenceUrl, owner: task.lease.owner };
  return { ...task, state, lease: null, notBefore: now + (conclusion === "fail" ? RETRY_DELAY_MS : 0), updatedAt: now, receipts: [...task.receipts, receipt], report: { digest: digest({ revision: task.order.revision, headSha, state, receipt }), acknowledged: false } };
}

export function block(task, token, now, reason) {
  assertLease(task, token, now);
  if (!["auth", "quota", "sandbox", "external"].includes(reason)) fail("INVALID_BLOCKER");
  return { ...task, state: `blocked-${reason}`, blockedPhase: task.lease.phase, lease: null, updatedAt: now };
}

// Explicit operator recovery only. It never resets attempts or bypasses quota,
// authentication, a fresh HEAD check, or the next worker's sandbox gate.
export function resume(task, now) {
  if (!["blocked-auth", "blocked-quota", "blocked-external", "blocked-sandbox"].includes(task.state) || !["implementation", "qa"].includes(task.blockedPhase)) fail("INELIGIBLE_RESUME");
  if (task.attempts[task.blockedPhase] >= MAX_ATTEMPTS) fail("RETRY_LIMIT");
  return { ...task, state: task.blockedPhase === "qa" ? "qa-ready" : "queued", notBefore: now, updatedAt: now };
}

// A new PR HEAD invalidates both CI and QA, including an active QA lease.
export function synchronizeHead(task, headSha, now) {
  if (!sha(headSha)) fail("INVALID_HEAD");
  if (task.headSha === headSha) return task;
  return { ...task, headSha, state: "ci-pending", lease: null, generation: task.generation + 1, updatedAt: now, report: null };
}

export function acknowledgeReport(task, expectedDigest, headSha, now) {
  if (!task.report || task.report.digest !== expectedDigest || task.headSha !== headSha) fail("STALE_REPORT");
  if (task.report.acknowledged) return task;
  return { ...task, updatedAt: now, report: { ...task.report, acknowledged: true } };
}

// Inputs carry IDs only. No body, email address or title is copied to public state.
// updated_at/comments are deliberately excluded: our own receipts cannot retrigger.
export function eventKey(event) {
  if (!["issue", "work_order", "pull_request", "ci_failure", "production_bug", "official_notice"].includes(event.kind) || !id(event.id) || typeof event.revision !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(event.revision)) fail("INVALID_EVENT");
  return digest({ kind: event.kind, id: event.id, revision: event.revision });
}

export function observe(previous, events) {
  const known = new Set(previous || []);
  const fresh = events.filter(event => { const key = eventKey(event); if (known.has(key)) return false; known.add(key); return true; });
  return { keys: [...known], fresh };
}
