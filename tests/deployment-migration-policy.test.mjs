import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { migrationPolicy, resolveMigrationPolicy } from '../scripts/check-deployment-migration-policy.mjs';

const before = 'a'.repeat(40), after = 'b'.repeat(40);
const comparison = files => ({ status: 'ahead', total_commits: 1, ahead_by: 1, behind_by: 0,
  base_commit: { sha: before }, merge_base_commit: { sha: before }, commits: [{ sha: after }],
  files: files.map(filename => ({ filename, status: 'modified' })) });
const env = { DEPLOYMENT_SHA: after, PREVIOUS_DEPLOYMENT_ID: 'dpl_previous', VERCEL_TOKEN: 'fixture-secret',
  VERCEL_ORG_ID: 'team_fixture', VERCEL_PROJECT_ID: 'prj_fixture' };
const health = { ok: true, scope: 'configuration', commit: before, checkedAt: '2026-10-02T10:00:00Z' };
const alias = { alias: 'wave-barrier-free-gyeongnam.vercel.app', projectId: 'prj_fixture', deploymentId: 'dpl_previous' };
const response = body => ({ ok: true, json: async () => body });

test('server-only releases inspect without replaying old data migrations across multiple commits', () => {
  const data = comparison(['server/assistant/handler.ts', 'package-lock.json', '.github/workflows/cd.yml']);
  data.total_commits = data.ahead_by = 2; data.commits.unshift({ sha: 'c'.repeat(40) });
  assert.deepEqual(migrationPolicy(before, after, data), {
    previousCommit: before, currentCommit: after, mode: 'inspect', changedMigrationFiles: [],
  });
});
test('explicit SQL and migration execution changes retain the existing apply path', () => {
  for (const filename of ['migrations/008_review_date_integrity.sql', 'server/deployment/migration-handler.ts', 'lib/deployment/migrations.js']) {
    assert.equal(migrationPolicy(before, after, comparison([filename])).mode, 'apply');
  }
  const data = comparison(['archive/008.sql']);
  data.files[0] = { filename: 'archive/008.sql', previous_filename: 'migrations/008.sql', status: 'renamed' };
  assert.equal(migrationPolicy(before, after, data).mode, 'apply');
});
test('missing, truncated, unrelated and mismatched comparisons never authorise deployment', () => {
  for (const overrides of [
    { files: Array.from({ length: 300 }, (_, i) => ({ filename: `tests/${i}.mjs`, status: 'modified' })) },
    { total_commits: 251 }, { commits: [] }, { base_commit: { sha: after } },
    { merge_base_commit: { sha: after } }, { commits: [{ sha: before }] },
    { status: 'diverged' }, { behind_by: 1 }, { ahead_by: 2 }, { total_commits: -1 }, { files: null },
    { files: [{ filename: 'archive/file', status: 'renamed' }] }, { files: [{ filename: '', status: 'modified' }] },
  ]) assert.throws(() => migrationPolicy(before, after, { ...comparison([]), ...overrides }));
  assert.throws(() => migrationPolicy(before, after, null));
  assert.throws(() => migrationPolicy('main', after, comparison([])));
});
test('an identical verified deployment remains read-only', () => {
  assert.equal(migrationPolicy(before, before, { ...comparison([]), status: 'identical', total_commits: 0,
    ahead_by: 0, commits: [] }).mode, 'inspect');
});
test('live policy reads health and alias binding before requesting the exact comparison', async () => {
  const reads = [], comparisons = [];
  const policy = await resolveMigrationPolicy(env, {
    fetchRead: async (url, options) => {
      reads.push(String(url));
      assert.equal(options.redirect, 'error');
      if (String(url).includes('/api/health')) { assert.equal(options.cache, 'no-store'); return response(health); }
      assert.equal(options.headers.Authorization, 'Bearer fixture-secret');
      return response(alias);
    },
    compare: async (...args) => { comparisons.push(args); return comparison(['server/assistant/handler.ts']); },
  });
  assert.equal(reads.length, 2); assert.deepEqual(comparisons, [[before, after]]);
  assert.equal(policy.mode, 'inspect'); assert.doesNotMatch(JSON.stringify(policy), /fixture-secret|https|Bearer/);
});
test('unhealthy revision, a moved alias and provider failure stop before comparison', async () => {
  for (const replies of [
    [response({ ...health, ok: false }), response(alias)],
    [response({ ...health, commit: null }), response(alias)],
    [response(health), response({ ...alias, deploymentId: 'dpl_changed' })],
    [response(health), response({ ...alias, projectId: 'prj_other' })],
  ]) {
    let compared = false;
    await assert.rejects(resolveMigrationPolicy(env, { fetchRead: async () => replies.shift(),
      compare: async () => { compared = true; return comparison([]); } }));
    assert.equal(compared, false);
  }
  await assert.rejects(resolveMigrationPolicy(env, { fetchRead: async () => { throw new Error('offline'); } }));
});
test('CD gates only apply while retaining read-only preflight, exact CI and explicit rollback', async () => {
  const workflow = load(await readFile(new URL('../.github/workflows/cd.yml', import.meta.url), 'utf8'));
  const steps = workflow.jobs.deploy.steps;
  const saved = steps.findIndex(step => step.id === 'previous_production');
  const policy = steps.findIndex(step => step.id === 'migration_policy');
  const candidate = steps.findIndex(step => step.id === 'candidate');
  const inspect = steps.findIndex(step => step.run?.includes('X-Wave-Migration-Mode: inspect'));
  const apply = steps.findIndex(step => step.name === '후보 환경 검증과 커뮤니티 migration');
  const promote = steps.findIndex(step => step.name === '프로덕션 승격');
  assert.ok(saved < policy && policy < candidate && candidate < inspect && inspect < apply && apply < promote);
  assert.equal(steps[policy].if, '${{ !inputs.preflight_only }}');
  assert.equal(steps[policy].env.PREVIOUS_DEPLOYMENT_ID, '${{ steps.previous_production.outputs.deployment_id }}');
  assert.equal(steps[apply].if, "${{ !inputs.preflight_only && steps.migration_policy.outputs.mode == 'apply' }}");
  assert.match(steps[inspect].run, /check-database-preflight.mjs/);
  assert.match(steps[0].name, /소스/);
  assert.equal(steps.filter(step => step.run?.includes('node scripts/verify-deployment-ci.mjs')).length, 2);
  assert.match(steps.find(step => step.name === '프로덕션 health와 실패 시 rollback').run, /rollback "\$PREVIOUS_DEPLOYMENT_ID"/);
});
