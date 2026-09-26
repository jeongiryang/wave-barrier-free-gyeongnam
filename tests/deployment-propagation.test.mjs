import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { load } from 'js-yaml';
import { PRODUCTION_HOST, waitForDeploymentHealth } from '../scripts/check-deployment-health.mjs';
import { captureProductionDeployment, productionDeploymentId } from '../scripts/capture-production-deployment.mjs';

const sha = 'a'.repeat(40);
const healthy = { ok: true, scope: 'configuration', commit: sha, checkedAt: new Date().toISOString() };
function clock() {
  let time = 0;
  return { now: () => time, pause: async ms => { time += ms; }, log: () => {}, timeoutMs: 30, intervalMs: 10 };
}
const response = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });

test('promotion waits through healthy old revision and transient errors for exact expected revision', async () => {
  const replies = [response({ ...healthy, commit: 'b'.repeat(40) }), response(null, 503), response(healthy)];
  const result = await waitForDeploymentHealth(sha, {
    ...clock(), fetchHealth: async (url, options) => {
      assert.equal(url, `https://${PRODUCTION_HOST}/api/health`);
      assert.equal(options.redirect, 'error');
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal instanceof AbortSignal);
      return replies.shift();
    },
  });
  assert.equal(result.commit, sha);
  assert.equal(replies.length, 0);
});

test('promotion fails within a finite window on wrong revision, unhealthy body or network failure', async () => {
  for (const reply of [response({ ...healthy, commit: 'b'.repeat(40) }), response({ ...healthy, ok: false }), null]) {
    let calls = 0;
    await assert.rejects(waitForDeploymentHealth(sha, {
      ...clock(), fetchHealth: async () => {
        calls += 1;
        if (!reply) throw new Error('network credential must not reach the log');
        return reply;
      },
    }), /verification window/);
    assert.equal(calls, 3);
  }
});

test('missing expected revision fails before making requests', async () => {
  await assert.rejects(waitForDeploymentHealth('', { fetchHealth: () => assert.fail('unexpected request') }), /valid deployment SHA/);
});

const alias = { alias: PRODUCTION_HOST, projectId: 'prj_wave', deploymentId: 'dpl_Previous123', deployment: { id: 'dpl_Previous123' } };
test('rollback target is the exact canonical alias in the expected project', () => {
  assert.equal(productionDeploymentId(alias, 'prj_wave'), 'dpl_Previous123');
  for (const value of [null, {}, { ...alias, alias: 'another.vercel.app' }, { ...alias, projectId: 'prj_other' },
    { ...alias, deploymentId: '' }, { ...alias, deploymentId: 'dpl_bad\ninjected=1' },
    { ...alias, deletedAt: 123 }, { ...alias, redirect: 'https://elsewhere.example' },
    { ...alias, deployment: { id: 'dpl_Candidate' } }]) {
    assert.throws(() => productionDeploymentId(value, 'prj_wave'), /previous deployment/);
  }
});

test('alias lookup is scoped and fails closed on API errors without leaking response bodies', async () => {
  const env = { VERCEL_TOKEN: 'test-only-token', VERCEL_ORG_ID: 'team_wave', VERCEL_PROJECT_ID: 'prj_wave' };
  assert.equal(await captureProductionDeployment(env, async (url, options) => {
    assert.equal(url.origin, 'https://api.vercel.com');
    assert.equal(url.pathname, `/v4/aliases/${PRODUCTION_HOST}`);
    assert.equal(url.searchParams.get('teamId'), env.VERCEL_ORG_ID);
    assert.equal(url.searchParams.get('projectId'), env.VERCEL_PROJECT_ID);
    assert.equal(options.headers.Authorization, `Bearer ${env.VERCEL_TOKEN}`);
    assert.equal(options.redirect, 'error');
    return response(alias);
  }), alias.deploymentId);
  await assert.rejects(captureProductionDeployment(env, async () => response('private provider detail', 403)), /HTTP 403/);
  await assert.rejects(captureProductionDeployment({}, () => assert.fail('unexpected request')), /configuration/);
});

test('CD captures rollback before creating candidate and checks the propagated SHA after promotion', () => {
  const cd = load(readFileSync(new URL('../.github/workflows/cd.yml', import.meta.url), 'utf8'));
  const steps = cd.jobs.deploy.steps;
  const previous = steps.findIndex(step => step.id === 'previous_production');
  const candidate = steps.findIndex(step => step.id === 'candidate');
  const final = steps.at(-1);
  assert.ok(previous > 0 && previous < candidate);
  assert.match(steps[previous].run, /capture-production-deployment/);
  assert.equal(final.env.PREVIOUS_DEPLOYMENT_ID, '${{ steps.previous_production.outputs.deployment_id }}');
  assert.match(final.run, /check-deployment-health.mjs --wait/);
  assert.match(final.run, /rollback "\$PREVIOUS_DEPLOYMENT_ID" --yes/);
  assert.match(final.run, /exit 1/);
});
