import assert from 'node:assert/strict';
import test from 'node:test';
import { certifyValidation, fullValidationJobs } from '../scripts/verify-ci-reuse.mjs';
const repository = 'owner/wave', commit = 'a'.repeat(40), headSha = 'b'.repeat(40), tree = 'c'.repeat(40), checkoutSha = 'e'.repeat(40), baseSha = 'f'.repeat(40);
const now = Date.parse('2026-09-12T12:00:00Z');
function fixture(change = () => {}) {
  const data = {
    main: { sha: commit, tree: { sha: tree } }, associated: [{ number: 500 }], workflow: { id: 10 },
    pr: { number: 500, merged: true, merge_commit_sha: commit, base: { ref: 'main', repo: { full_name: repository } }, head: { sha: headSha, repo: { full_name: repository } } },
    head: { sha: headSha, tree: { sha: tree } },
    proof: { version: 1, repository, runId: 42, pr: 500, headSha, baseSha, tree, eventSha: checkoutSha, checkoutSha },
    tested: { sha: checkoutSha, tree: { sha: tree }, parents: [{ sha: baseSha }, { sha: headSha }] },
    artifacts: { artifacts: [{ id: 84, name: 'ci-tree-proof', expired: false, workflow_run: { id: 42 } }] },
    run: { id: 42, workflow_id: 10, event: 'pull_request', head_sha: headSha, status: 'completed', conclusion: 'success', repository: { full_name: repository }, head_repository: { full_name: repository }, updated_at: '2026-09-12T11:00:00Z' },
    jobs: { total_count: fullValidationJobs.length, jobs: fullValidationJobs.map(name => ({ name, status: 'completed', conclusion: 'success' })) },
  };
  change(data);
  const paths = { [`git/commits/${checkoutSha}`]: data.tested, 'actions/runs/42/artifacts?name=ci-tree-proof&per_page=10': data.artifacts, [`git/commits/${commit}`]: data.main, [`commits/${commit}/pulls?per_page=30`]: data.associated, 'actions/workflows/ci.yml': data.workflow, 'pulls/500': data.pr, [`git/commits/${headSha}`]: data.head, [`actions/workflows/ci.yml/runs?head_sha=${headSha}&event=pull_request&per_page=10`]: { workflow_runs: [data.run] }, 'actions/runs/42/jobs?filter=latest&per_page=100': data.jobs };
  return { repository, commit, now, readArtifact: async () => data.proof, event: 'push', ref: 'refs/heads/main', get: async path => { const result = paths[path.replace(`repos/${repository}/`, '')]; if (!result) throw new Error('Unexpected lookup'); return result; } };
}
test('identical merged tree with every recent native shard can reuse only browser and boundary validation', async () => {
  assert.deepEqual(await certifyValidation(fixture()), { verified: true, tree, pullRequest: 500, runId: 42, url: 'https://github.com/owner/wave/actions/runs/42' });
});
for (const [name, change] of [
  ['different main tree', d => { d.main.tree.sha = 'd'.repeat(40); }],
  ['missing tree identity', d => { delete d.head.tree; }],
  ['foreign fork', d => { d.pr.head.repo.full_name = 'external/wave'; }],
  ['another merge commit', d => { d.pr.merge_commit_sha = headSha; }],
  ['unmerged PR', d => { d.pr.merged = false; }],
  ['another workflow', d => { d.run.workflow_id = 11; }],
  ['main push masquerading as PR evidence', d => { d.run.event = 'push'; }],
  ['wrong tested revision', d => { d.run.head_sha = commit; }],
  ['overall failed run', d => { d.run.conclusion = 'failure'; }],
  ['expired evidence', d => { d.run.updated_at = '2026-09-01T00:00:00Z'; }],
  ['missing shard', d => { d.jobs.jobs.pop(); d.jobs.total_count--; }],
  ['cancelled mobile shard', d => { d.jobs.jobs.at(-1).conclusion = 'cancelled'; }],
  ['skipped boundary', d => { d.jobs.jobs.find(j => j.name === 'sandbox-boundary').conclusion = 'skipped'; }],
  ['duplicate job name', d => { d.jobs.jobs.push({ ...d.jobs.jobs[0] }); d.jobs.total_count++; }],
  ['incomplete jobs pagination', d => { d.jobs.total_count++; }],
]) test(`full validation is required for ${name}`, async () => assert.equal((await certifyValidation(fixture(change))).verified, false));
test('unknown API evidence and non-main events fall back without claiming success', async () => {
  for (const override of [{ get: async () => { throw new Error('network'); } }, { event: 'pull_request' }, { ref: 'refs/heads/feature' }, { commit: 'invalid' }]) assert.equal((await certifyValidation({ ...fixture(), ...override })).verified, false);
});
