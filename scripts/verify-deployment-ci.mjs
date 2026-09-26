import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const quickJobs = ['quality', 'validate', ...['desktop', 'mobile'].flatMap(device => [1, 2].map(shard => `browser (${shard}, ${device})`))];
export const releaseJobs = ['quality', 'release-validate', ...['desktop', 'mobile'].flatMap(device => [1,2,3,4,5,6,7,8].map(shard => `browser (${shard}, ${device})`))];
export function assertRun(run, jobs, { sha, repository, workflow = 'ci.yml', release = false }) {
  if (!/^[a-f0-9]{40}$/.test(sha || '') || run.head_sha !== sha || run.repository?.full_name !== repository
      || run.path !== `.github/workflows/${workflow}` || run.status !== 'completed' || run.conclusion !== 'success'
      || (!release && (run.event !== 'push' || run.head_branch !== 'main'))
      || (release && run.event !== 'workflow_dispatch')) throw new Error('Exact commit workflow proof is missing or invalid');
  const expected = release ? releaseJobs : quickJobs;
  if (jobs.length !== expected.length || expected.some(name => jobs.filter(job => job.name === name && job.status === 'completed' && job.conclusion === 'success').length !== 1)) throw new Error('Required workflow jobs missing, duplicated, skipped, or failed');
}
export function github(path) {
  return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 5_000_000 }));
}
export function verifyWorkflow({ sha, repository, workflow = 'ci.yml', release = false, runId }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !/^[a-f0-9]{40}$/.test(sha || '') || !['ci.yml','release-audit.yml'].includes(workflow)) throw new Error('Invalid repository/commit/workflow');
  const runs = github(`repos/${repository}/actions/workflows/${workflow}/runs?head_sha=${sha}&per_page=100`).workflow_runs;
  // Never pick an older green run while the latest attempt is pending or failed.
  const run = runs.filter(item => release ? item.event === 'workflow_dispatch' : item.head_branch === 'main').sort((a,b) => b.id-a.id)[0];
  if (!run || (runId && String(run.id) !== String(runId))) throw new Error('Latest matching workflow run is not the supplied evidence');
  const jobResponse = github(`repos/${repository}/actions/runs/${run.id}/jobs?per_page=100`);
  if (jobResponse.total_count !== jobResponse.jobs.length) throw new Error('Incomplete job evidence');
  assertRun(run, jobResponse.jobs, { sha, repository, workflow, release });
  return run;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sha = process.env.DEPLOYMENT_SHA;
  const repository = process.env.GITHUB_REPOSITORY;
  if (github(`repos/${repository}/git/ref/heads/main`).object.sha !== sha) throw new Error('Stale deployment: main advanced; wait for the current main CI');
  const run = verifyWorkflow({ sha, repository });
  console.log(`Verified current main ${sha}, CI ${run.id}, all ${quickJobs.length} jobs.`);
}
