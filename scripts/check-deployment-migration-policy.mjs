import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { captureProductionDeployment } from './capture-production-deployment.mjs';
import { PRODUCTION_HOST, validDeploymentHealth } from './check-deployment-health.mjs';

const shaPattern = /^[a-f0-9]{40}$/;
const repository = 'jeongiryang/wave-barrier-free-gyeongnam';
const migrationPath = value => value?.startsWith('migrations/')
  || value === 'server/deployment/migration-handler.ts' || value === 'lib/deployment/migrations.js';

// Compare the deployed revision, rather than HEAD~1: releases can span several PRs.
// GitHub caps this non-paginated response at 250 commits and 300 changed files.
// Incomplete or unrelated evidence must never authorise a write or promotion.
export function migrationPolicy(previousCommit, currentCommit, comparison) {
  const total = comparison?.total_commits;
  if (!shaPattern.test(previousCommit || '') || !shaPattern.test(currentCommit || '')
    || comparison?.base_commit?.sha !== previousCommit || comparison?.merge_base_commit?.sha !== previousCommit
    || !Number.isSafeInteger(total) || total < 0 || total > 250 || comparison?.behind_by !== 0
    || comparison?.ahead_by !== total || !Array.isArray(comparison?.commits) || comparison.commits.length !== total
    || !Array.isArray(comparison?.files) || comparison.files.length >= 300
    || (currentCommit === previousCommit
      ? comparison.status !== 'identical' || total !== 0 || comparison.files.length !== 0
      : comparison.status !== 'ahead' || total === 0 || comparison.commits.at(-1)?.sha !== currentCommit)) {
    throw new Error('Cannot prove a complete comparison from the deployed revision');
  }
  const changedMigrationFiles = new Set();
  for (const file of comparison.files) {
    if (!file || typeof file.filename !== 'string' || !file.filename
      || !['added', 'modified', 'removed', 'renamed', 'copied', 'changed', 'unchanged'].includes(file.status)
      || (file.status === 'renamed' && (typeof file.previous_filename !== 'string' || !file.previous_filename))) {
      throw new Error('Incomplete changed-file evidence');
    }
    for (const filename of [file.filename, file.previous_filename]) {
      if (migrationPath(filename)) changedMigrationFiles.add(filename);
    }
  }
  return { previousCommit, currentCommit, mode: changedMigrationFiles.size ? 'apply' : 'inspect',
    changedMigrationFiles: [...changedMigrationFiles].sort() };
}

function compareCommits(previousCommit, currentCommit) {
  return JSON.parse(execFileSync('gh', ['api', `repos/${repository}/compare/${previousCommit}...${currentCommit}`],
    { encoding: 'utf8', timeout: 20_000, maxBuffer: 12 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }));
}

export async function resolveMigrationPolicy(env, { fetchRead = fetch, compare = compareCommits } = {}) {
  if (!shaPattern.test(env.DEPLOYMENT_SHA || '') || !/^dpl_[a-zA-Z0-9]+$/.test(env.PREVIOUS_DEPLOYMENT_ID || '')) {
    throw new Error('Verified candidate and rollback deployment are required');
  }
  const response = await fetchRead(`https://${PRODUCTION_HOST}/api/health`,
    { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000) });
  const health = response.ok ? await response.json() : null;
  if (!validDeploymentHealth(health, health?.commit)) throw new Error('Previous Production revision is unverified');
  // Bind the health revision to the still-current alias and the saved rollback ID.
  if (await captureProductionDeployment(env, fetchRead) !== env.PREVIOUS_DEPLOYMENT_ID) {
    throw new Error('Production alias changed while preparing deployment');
  }
  return migrationPolicy(health.commit, env.DEPLOYMENT_SHA, await compare(health.commit, env.DEPLOYMENT_SHA));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.GITHUB_OUTPUT) throw new Error('Step output required');
    const policy = await resolveMigrationPolicy(process.env);
    appendFileSync(process.env.GITHUB_OUTPUT, `mode=${policy.mode}\nprevious_commit=${policy.previousCommit}\n`);
    console.log(JSON.stringify(policy));
  } catch {
    console.error('Deployment migration policy could not be verified; no migration or promotion is authorised.');
    process.exitCode = 1;
  }
}
