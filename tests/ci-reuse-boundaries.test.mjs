import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import yaml from 'js-yaml';
import { certifyValidation, fullValidationJobs } from '../scripts/verify-ci-reuse.mjs';

const repository = 'owner/wave';
const commit = 'a'.repeat(40), headSha = 'b'.repeat(40), tree = 'c'.repeat(40);
const checkoutSha = 'd'.repeat(40), baseSha = 'e'.repeat(40), otherSha = 'f'.repeat(40);
const now = Date.parse('2026-09-12T12:00:00Z');

function fixture(change = () => {}) {
  const run = {
    id: 42, workflow_id: 10, event: 'pull_request', head_sha: headSha,
    status: 'completed', conclusion: 'success',
    repository: { full_name: repository }, head_repository: { full_name: repository },
    created_at: '2026-09-12T11:00:00Z', updated_at: '2026-09-12T11:30:00Z',
  };
  const data = {
    main: { sha: commit, tree: { sha: tree }, parents: [{ sha: baseSha }] },
    associated: [{ number: 500 }], workflow: { id: 10 },
    pr: {
      number: 500, merged: true, merge_commit_sha: commit,
      base: { ref: 'main', repo: { full_name: repository } },
      head: { sha: headSha, repo: { full_name: repository } },
    },
    head: { sha: headSha, tree: { sha: tree } },
    runs: [run],
    jobs: {
      total_count: fullValidationJobs.length,
      jobs: fullValidationJobs.map(name => ({ name, status: 'completed', conclusion: 'success' })),
    },
    artifacts: { total_count: 1, artifacts: [{ id: 84, name: 'ci-tree-proof', expired: false, workflow_run: { id: 42 } }] },
    proof: { version: 1, repository, runId: 42, pr: 500, headSha, baseSha, eventSha: checkoutSha, checkoutSha, tree },
    tested: { sha: checkoutSha, tree: { sha: tree }, parents: [{ sha: baseSha }, { sha: headSha }] },
  };
  change(data);
  const calls = [], downloads = [];
  const paths = {
    [`git/commits/${commit}`]: data.main,
    [`commits/${commit}/pulls?per_page=30`]: data.associated,
    'actions/workflows/ci.yml': data.workflow,
    'pulls/500': data.pr,
    [`git/commits/${headSha}`]: data.head,
    [`actions/workflows/ci.yml/runs?head_sha=${headSha}&event=pull_request&per_page=10`]: { workflow_runs: data.runs },
    'actions/runs/42/jobs?filter=latest&per_page=100': data.jobs,
    'actions/runs/42/artifacts?name=ci-tree-proof&per_page=10': data.artifacts,
    [`git/commits/${checkoutSha}`]: data.tested,
  };
  return {
    calls, downloads, data,
    args: {
      repository, commit, now, event: 'push', ref: 'refs/heads/main',
      get: async path => {
        calls.push(path);
        const key = path.replace(`repos/${repository}/`, '');
        if (!Object.hasOwn(paths, key)) throw new Error(`Unexpected synthetic lookup: ${key}`);
        return paths[key];
      },
      readArtifact: async id => { downloads.push(id); return data.proof; },
    },
  };
}

test('reuse independently resolves the proof checkout commit and its actual Git tree', async () => {
  const f = fixture();
  const result = await certifyValidation(f.args);
  assert.equal(result.verified, true);
  assert.equal(result.runId, 42);
  assert.equal(result.tree, tree);
  assert.deepEqual(f.downloads, [84]);
  assert.ok(f.calls.includes(`repos/${repository}/git/commits/${checkoutSha}`));
});

for (const [status, conclusion] of [
  ['completed', 'failure'], ['completed', 'cancelled'], ['in_progress', null], ['queued', null],
]) test(`an older success cannot hide a newer ${status}/${conclusion} validation`, async () => {
  const f = fixture(d => {
    d.runs.push({ ...d.runs[0], id: 43, status, conclusion, created_at: '2026-09-12T11:40:00Z', updated_at: '2026-09-12T11:41:00Z' });
  });
  assert.equal((await certifyValidation(f.args)).verified, false);
  assert.deepEqual(f.downloads, [], 'failed/currently running evidence must not download an older proof');
});

test('an older failure does not replace the latest complete successful run', async () => {
  const f = fixture(d => {
    d.runs.unshift({ ...d.runs[0], id: 41, conclusion: 'failure', created_at: '2026-09-12T10:00:00Z', updated_at: '2026-09-12T10:30:00Z' });
  });
  assert.equal((await certifyValidation(f.args)).verified, true);
});

for (const [name, change] of [
  ['missing proof document', d => { d.proof = null; }],
  ['unsupported proof version', d => { d.proof.version = 2; }],
  ['another repository', d => { d.proof.repository = 'external/wave'; }],
  ['another run', d => { d.proof.runId = 41; }],
  ['another PR', d => { d.proof.pr = 501; }],
  ['another PR head', d => { d.proof.headSha = otherSha; }],
  ['a claimed tree different from main', d => { d.proof.tree = otherSha; }],
  ['checkout different from the workflow event SHA', d => { d.proof.eventSha = otherSha; }],
  ['a malformed checkout SHA', d => { d.proof.checkoutSha = d.proof.eventSha = 'main'; }],
  ['a missing base SHA', d => { delete d.proof.baseSha; }],
  ['the real checkout tree differs despite a matching claimed tree', d => { d.tested.tree.sha = otherSha; }],
  ['the resolved commit has a different SHA', d => { d.tested.sha = otherSha; }],
  ['the synthetic merge has another base parent', d => { d.tested.parents[0].sha = otherSha; }],
  ['the synthetic merge has another head parent', d => { d.tested.parents[1].sha = otherSha; }],
  ['a non-merge checkout', d => { d.tested.parents.pop(); }],
]) test(`full validation is required for ${name}`, async () => {
  assert.equal((await certifyValidation(fixture(change).args)).verified, false);
});

for (const [name, change] of [
  ['absent artifact', d => { d.artifacts = { total_count: 0, artifacts: [] }; }],
  ['expired artifact', d => { d.artifacts.artifacts[0].expired = true; }],
  ['artifact belonging to another run', d => { d.artifacts.artifacts[0].workflow_run.id = 41; }],
  ['artifact without run provenance', d => { delete d.artifacts.artifacts[0].workflow_run; }],
  ['two matching active artifacts', d => { d.artifacts.artifacts.push({ ...d.artifacts.artifacts[0], id: 85 }); d.artifacts.total_count = 2; }],
]) test(`no proof is consumed from ${name}`, async () => {
  const f = fixture(change);
  assert.equal((await certifyValidation(f.args)).verified, false);
  assert.deepEqual(f.downloads, []);
});

test('expired/deleted downloads, malformed JSON and Git lookup errors all fall back', async () => {
  for (const error of [new Error('HTTP 410'), new Error('HTTP 403'), new SyntaxError('Invalid JSON')]) {
    const f = fixture();
    assert.equal((await certifyValidation({ ...f.args, readArtifact: async () => { throw error; } })).verified, false);
  }
  const f = fixture(), get = f.args.get;
  assert.equal((await certifyValidation({ ...f.args, get: async path => {
    if (path.endsWith(`/git/commits/${checkoutSha}`)) throw new Error('HTTP 503');
    return get(path);
  } })).verified, false);
});

const workflow = yaml.load(readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'));
test('the exact checkout described by the proof is shared by every validation job', () => {
  for (const name of ['quality', 'browser', 'sandbox-boundary']) {
    const checkouts = workflow.jobs[name].steps.filter(step => step.uses?.startsWith('actions/checkout@'));
    assert.equal(checkouts.length, 1, name);
    assert.equal(checkouts[0].with.ref, '${{ github.sha }}', name);
  }
  assert.equal(workflow.jobs.quality.if, undefined, 'main quality must remain unconditional');
  assert.equal(workflow.jobs.quality.needs, undefined, 'a failed certificate must not skip quality');
});

test('partial skips, cancelled certification and unhealthy quality never pass the aggregate reuse gate', () => {
  const script = /^node -e '(.+)'$/.exec(workflow.jobs.validate.steps[0].run)?.[1];
  assert.ok(script);
  const certified = {
    QUALITY_RESULT: 'success', BROWSER_RESULT: 'skipped', BOUNDARY_RESULT: 'skipped',
    CERTIFY_RESULT: 'success', REUSE_VERIFIED: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main',
  };
  const rejected = [
    { QUALITY_RESULT: 'cancelled' }, { QUALITY_RESULT: 'skipped' }, { QUALITY_RESULT: '' },
    { CERTIFY_RESULT: 'cancelled' }, { CERTIFY_RESULT: 'skipped' }, { CERTIFY_RESULT: '' },
    { REUSE_VERIFIED: 'TRUE' }, { REUSE_VERIFIED: '' },
    { BROWSER_RESULT: 'success' }, { BOUNDARY_RESULT: 'success' },
    { BROWSER_RESULT: 'cancelled' }, { BOUNDARY_RESULT: 'failure' },
    { GITHUB_EVENT_NAME: 'workflow_dispatch' }, { GITHUB_REF: 'refs/pull/500/merge' },
  ];
  const exit = Symbol('process.exit');
  for (const override of rejected) {
    let code;
    try {
      vm.runInNewContext(script, { process: { env: { ...certified, ...override }, exit(value) { code = value; throw exit; } } }, { timeout: 100 });
    } catch (error) { if (error !== exit) throw error; }
    assert.equal(code, 1, JSON.stringify(override));
  }
});
