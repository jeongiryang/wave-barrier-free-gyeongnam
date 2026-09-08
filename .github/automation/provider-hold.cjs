"use strict";

// Data only: never execute a provider/Issue message, copy raw errors, or grant work.
const registry = require("../../.wave/provider-budget.json");
const externalKinds = new Set(["rate_limited", "quota_exhausted", "access_restricted", "auth_error", "missing_config"]);
const operations = new Map(registry.providers.map(provider => [provider.id, new Set(provider.operations)]));
// An application HTTP 429 does not identify an upstream account/provider.
operations.set("wave", new Set(["public-api"]));
const marker = "<!-- wave-provider-hold:v1 -->";

function safeFailure(value) {
  if (!value || !externalKinds.has(value.kind) || !operations.get(value.provider)?.has(value.operation)) return null;
  return { provider: value.provider, operation: value.operation, kind: value.kind,
    retryAfterMs: Number.isSafeInteger(value.retryAfterMs) && value.retryAfterMs >= 0 ? value.retryAfterMs : null,
    resetAt: null };
}

function providerRestrictions(body) {
  if (!body || typeof body !== "object") return [];
  const statuses = [body, body.status, ...(Array.isArray(body.statuses) ? body.statuses : []),
    ...(Array.isArray(body.providers) ? body.providers : []),
    ...(Array.isArray(body.context?.datasets) ? body.context.datasets : [])].filter(value => value && typeof value === "object");
  const failures = [];
  for (const status of statuses) {
    const candidates = [...(status.failure ? [status.failure] : []), ...(Array.isArray(status.failures) ? status.failures : [])];
    if ((status.state === "error" || status.partial) && !candidates.length) return [];
    for (const candidate of candidates) {
      const safe = safeFailure(candidate);
      // A mixed malformed/upstream failure must still reach engineering triage.
      if (!safe) return [];
      failures.push(safe);
    }
  }
  return [...new Map(failures.map(value => [`${value.provider}/${value.operation}/${value.kind}`, value])).values()];
}

function parseHold(issue) {
  if (issue?.pull_request || issue?.user?.login !== "github-actions[bot]" || !issue.body?.startsWith(marker) || issue.body.length > 12000) return null;
  const match = /\n```json\n([^`]+)\n```/.exec(issue.body);
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]);
    const failure = safeFailure(value);
    if (value.version !== 1 || !failure || !/^[a-f0-9]{40}$/.test(value.sha) || !Number.isSafeInteger(value.runId) || value.runId <= 0) return null;
    return { ...failure, sha: value.sha, runId: value.runId, issue: issue.number };
  } catch { return null; }
}

async function readHolds({github,context}) {
  const issues = await github.paginate(github.rest.issues.listForRepo,{...context.repo,state:"open",labels:"status:blocked-external",per_page:100});
  return issues.map(parseHold).filter(Boolean);
}

async function preflight({github,context,core}) {
  const holds = await readHolds({github,context});
  if (!holds.length) return;
  // An existing unresolved hold survives a fresh deployment, restart and duplicate event.
  // A manual account/reset check can resolve it; this job never guesses a reset or retries.
  core.setOutput("provider_block", JSON.stringify(holds.map(({provider,operation,kind,retryAfterMs,resetAt})=>({provider,operation,kind,retryAfterMs,resetAt}))));
  core.setFailed("BLOCKED_EXTERNAL: unresolved provider hold; no live API calls made. This is not a code-fix request.");
}

async function recordHolds({github,context,core}, {serialized,sha,runId}) {
  let values;
  try { values = JSON.parse(serialized); } catch { throw Error("Invalid provider hold metadata"); }
  if (!Array.isArray(values) || !values.length || values.length > 100 || !/^[a-f0-9]{40}$/.test(sha) || !Number.isSafeInteger(runId) || runId <= 0) throw Error("Invalid provider hold metadata");
  const failures = values.map(safeFailure);
  if (failures.some(value=>!value)) throw Error("Unverified provider restriction");
  const existing = await readHolds({github,context});
  for (const failure of failures) {
    if (existing.some(hold=>hold.provider===failure.provider && hold.operation===failure.operation)) continue;
    const evidence = {...failure,version:1,sha,runId};
    const body = [marker,"## Provider operation paused","", "```json",JSON.stringify(evidence),"```","",
      `Evidence: https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${runId}`,"",
      "This is an external operational hold, not an engineering task. Do not create a code-fix PR, buy quota, rotate keys or repeatedly call the provider.",
      "The exact account limit/reset is unverified. Resolve only after the account/access/reset is checked; the next bounded smoke must still satisfy every original success contract.",
      "A parser/UI/cooldown defect belongs in a separate reproduced engineering Issue. This hold never grants executor authority."].join("\n");
    const created = await github.rest.issues.create({...context.repo,title:`[Provider hold] ${failure.provider} / ${failure.operation}`,body,
      labels:["status:blocked-external","agent:pm"],assignees:["jeongiryang"]});
    existing.push({...failure,issue:created.data.number});
  }
  core.info("Provider restriction recorded; identical unresolved holds were not duplicated.");
}

module.exports = { marker, safeFailure, providerRestrictions, parseHold, readHolds, preflight, recordHolds };
