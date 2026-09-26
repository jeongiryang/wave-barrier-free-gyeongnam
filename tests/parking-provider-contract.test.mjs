import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as coordinates from '../lib/map-coordinates.js';
import * as parking from '../lib/parking-alternatives.js';
import * as budgets from '../lib/request-budget.js';
import * as failures from '../lib/provider-failure.js';
import { createProviderRequester } from '../server/shared/provider-request.js';
import { assertProviderAvailable, ProviderBlocked } from '../scripts/provider-smoke-policy.mjs';

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const code = compile('../server/tourism/parking-alternatives.ts');
function moduleFrom(code, require, fetcher) { const mod = { exports: {} }; new Function('module', 'exports', 'require', 'fetch', code)(mod, mod.exports, require, fetcher); return mod.exports; }
const attempts = moduleFrom(compile('../server/shared/provider-attempt.ts'), name => name.endsWith('provider-failure.js') ? failures : { clean: value => String(value) });
const lot = id => ({ prkplceNo: `P${id}`, prkplceNm: `합성 주차장 ${id}`, rdnmadr: `경상남도 창원시 합성로 ${id}`, latitude: '35.2385', longitude: '128.6915', pwdbsPpkZoneYn: 'Y', referenceDate: '2026-09-01' });
const pageBody = (pageNo, total, items) => ({ response: { header: { resultCode: '00' }, body: { pageNo, numOfRows: 1000, totalCount: total, items } } });
const pageItems = (pageNo, total) => Array.from({ length: Math.min(1000, Math.max(0, total - (pageNo - 1) * 1000)) }, (_, index) => lot((pageNo - 1) * 1000 + index));

function harness(reply, { budgetMs = 17500, key = 'noncredential-fixture' } = {}) {
  const requests = [], requester = createProviderRequester();
  let active = 0, maxActive = 0;
  const fetcher = async (url, options) => {
    const params = new URL(url).searchParams;
    const request = { page: Number(params.get('pageNo')), rows: Number(params.get('numOfRows')), accessible: params.get('pwdbsPpkZoneYn'), signal: options.signal };
    requests.push(request); active++; maxActive = Math.max(maxActive, active);
    try { return await reply(request); } finally { active--; }
  };
  const adapter = moduleFrom(code, name => {
    if (name.endsWith('map-coordinates.js')) return coordinates;
    if (name.endsWith('parking-alternatives.js')) return parking;
    if (name.endsWith('request-budget.js')) return { ...budgets, SERVER_BUDGET_MS: { ...budgets.SERVER_BUDGET_MS, parkingAlternatives: budgetMs } };
    if (name.endsWith('provider-failure.js')) return failures;
    if (name.endsWith('provider-request.js')) return { requestProvider: requester };
    if (name.endsWith('/http')) return { json: (body, status = 200) => ({ status, body }) };
    if (name.endsWith('/provider-data')) return { ...attempts, commonParams: () => ({ numOfRows: '1' }), fetchTourismData: async (_env, _service, _operation, params) => ({ items: [{ contentid: params.contentId, lDongRegnCd: '48', mapx: '128.691', mapy: '35.238' }], total: 1 }) };
    throw Error(name);
  }, fetcher);
  return { requests, maxActive: () => maxActive, run: (id = '2783785') => adapter.handleParkingAlternatives(new URL(`https://example.test/api/wave?action=parking-alternatives&contentId=${id}`), { TOUR_API_SERVICE_KEY_ENCODED: key }) };
}

test('official page limit and exact accessible filter retrieve later pages before ranking', async () => {
  const h = harness(async ({ page }) => Response.json(pageBody(page, 1001, pageItems(page, 1001).map(item => page === 1 ? { ...item, latitude: '37.5', longitude: '127' } : item))));
  const result = await h.run();
  assert.deepEqual(h.requests.map(({ page, rows, accessible }) => ({ page, rows, accessible })), [{ page: 1, rows: 1000, accessible: 'Y' }, { page: 2, rows: 1000, accessible: 'Y' }]);
  assert.equal(result.status, 200); assert.equal(result.body.status, 'available'); assert.equal(result.body.items[0].id, 'P1000');
});

test('completed data is shared across different public places and never refetched on a warm lookup', async () => {
  const h = harness(async ({ page }) => Response.json(pageBody(page, 2, pageItems(page, 2))));
  const [first, second] = await Promise.all([h.run('2783785'), h.run('753302')]);
  assert.equal(first.body.status, 'available'); assert.equal(second.body.status, 'available');
  assert.equal(first.body.contentId, '2783785'); assert.equal(second.body.contentId, '753302');
  assert.equal(first.body.checkedAt, second.body.checkedAt);
  await h.run('1622623'); assert.equal(h.requests.length, 1);
});

for (const [name, change] of [
  ['missing last page rows', body => { body.response.body.items = []; }],
  ['duplicate page number', body => { body.response.body.pageNo = 1; }],
  ['overlapping records', body => { body.response.body.items = [lot(0)]; }],
  ['changed total', body => { body.response.body.totalCount = 1002; }],
  ['missing total', body => { delete body.response.body.totalCount; }],
  ['unrecognized item envelope', body => { body.response.body.items = { unexpected: [] }; }],
  ['provider ignored Y filter', body => { body.response.body.items[0].pwdbsPpkZoneYn = 'N'; }],
  ['provider omitted accessible evidence', body => { delete body.response.body.items[0].pwdbsPpkZoneYn; }],
]) test(`${name} cannot become an available or empty complete result`, async () => {
  const h = harness(async ({ page }) => { const body = pageBody(page, 1001, pageItems(page, 1001)); if (page === 2) change(body); return Response.json(body); });
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.status, 'provider-error');
  assert.equal(result.body.failure?.kind, 'malformed_response');
});

test('over-cap totals stop after page one without a fabricated empty or complete snapshot', async () => {
  const h = harness(async ({ page }) => Response.json(pageBody(page, 20001, pageItems(page, 20001))));
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.status, 'provider-error');
  assert.equal(result.body.partial, true); assert.equal(result.body.unclassifiedFailure, true); assert.equal(h.requests.length, 1);
});

test('page concurrency is at most two and a completed set can confirm zero nearby matches', async () => {
  const h = harness(async ({ page }) => { await new Promise(resolve => setTimeout(resolve, 5)); return Response.json(pageBody(page, 4001, pageItems(page, 4001).map(item => ({ ...item, latitude: '37.5', longitude: '127' })))); });
  const result = await h.run(); assert.equal(result.status, 200); assert.equal(result.body.status, 'empty');
  assert.equal(h.requests.length, 5); assert.equal(h.maxActive(), 2);
});

for (const [code, kind] of [['20', 'auth_error'], ['22', 'quota_exhausted'], ['10', 'upstream_error']]) test(`provider ${code} survives the public boundary without secrets or retries`, async () => {
  const h = harness(async ({ page }) => page === 1 ? Response.json(pageBody(1, 4000, pageItems(1, 4000))) : Response.json({ response: { header: { resultCode: code, resultMsg: 'private-sentinel' } } }));
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.failure.kind, kind); assert.equal(result.body.failure.code, code);
  assert.ok(h.requests.length <= 3); assert.doesNotMatch(JSON.stringify(result), /private-sentinel|noncredential-fixture|serviceKey/);
  if (code === '10') assert.doesNotThrow(() => assertProviderAvailable(result.body), 'invalid parameters cannot be labeled a provider quota hold');
  else assert.throws(() => assertProviderAvailable(result.body), error => error instanceof ProviderBlocked && error.engineeringRequired === false);
});

test('the shared deadline aborts an unfinished list and exposes timeout, not empty', async () => {
  const h = harness(({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })), { budgetMs: 25 });
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.failure.kind, 'timeout');
  assert.equal(h.requests.length, 1);
});

test('missing configuration never calls parking and remains distinguishable', async () => {
  const h = harness(() => assert.fail('no provider request allowed'), { key: '' });
  const result = await h.run(); assert.equal(result.status, 502); assert.equal(result.body.failure.kind, 'missing_config'); assert.equal(h.requests.length, 0);
});

test('documented no-data is empty only on the initial list page', async () => {
  const empty = { response: { header: { resultCode: '03' } } };
  const first = harness(async () => Response.json(empty));
  assert.equal((await first.run()).body.status, 'empty');
  const later = harness(async ({ page }) => Response.json(page === 1 ? pageBody(1, 1001, pageItems(1, 1001)) : empty));
  assert.equal((await later.run()).status, 502);
});

test('a quota stops sibling work without misreporting cancellation as an independent timeout', async () => {
  let aborted = false;
  const h = harness(async ({ page, signal }) => {
    if (page === 1) return Response.json(pageBody(1, 4000, pageItems(1, 4000)));
    if (page === 2) return Response.json({ response: { header: { resultCode: '22' } } });
    return new Promise((_, reject) => signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true }));
  });
  const result = await h.run();
  assert.equal(aborted, true); assert.equal(h.requests.length, 3);
  assert.deepEqual(result.body.failures.map(failure => failure.kind), ['quota_exhausted']);
  assert.equal(result.body.unclassifiedFailure, undefined);
});

test('simultaneous malformed and quota replies preserve both failure causes', async () => {
  const h = harness(async ({ page }) => page === 1 ? Response.json(pageBody(1, 4000, pageItems(1, 4000)))
    : page === 2 ? Response.json({ response: { header: { resultCode: '22' } } }) : Response.json({ unexpected: 'private-sentinel' }));
  const result = await h.run();
  assert.equal(result.status, 502);
  assert.deepEqual(result.body.failures.map(failure => failure.kind).sort(), ['malformed_response', 'quota_exhausted']);
  assert.throws(() => assertProviderAvailable(result.body), error => error instanceof ProviderBlocked && error.engineeringRequired === true);
});

for (const timeout of ['code05', 'http504']) test(`a simultaneous explicit ${timeout} survives sibling cancellation metadata`, async () => {
  const h = harness(async ({ page }) => page === 1 ? Response.json(pageBody(1, 4000, pageItems(1, 4000)))
    : page === 2 ? Response.json({ response: { header: { resultCode: '22' } } })
      : timeout === 'code05' ? Response.json({ response: { header: { resultCode: '05' } } }) : new Response('', { status: 504 }));
  const result = await h.run();
  assert.equal(result.status, 502);
  assert.deepEqual(result.body.failures.map(failure => failure.kind).sort(), ['quota_exhausted', 'timeout']);
  const failure = result.body.failures.find(failure => failure.kind === 'timeout');
  assert.equal(failure.httpStatus, timeout === 'code05' ? 200 : 504);
  assert.equal(failure.code, timeout === 'code05' ? '05' : null);
  assert.throws(() => assertProviderAvailable(result.body), error => error instanceof ProviderBlocked && error.engineeringRequired === true);
});

test('an incomplete or failed list is never cached as a completed snapshot', async () => {
  let calls = 0;
  const h = harness(async ({ page }) => ++calls === 1 ? new Response('unavailable', { status: 503 }) : Response.json(pageBody(page, 1, pageItems(page, 1))));
  assert.equal((await h.run()).status, 502);
  assert.equal((await h.run()).body.status, 'available');
  assert.equal(h.requests.length, 2);
});

test('concurrent callers share classified failure metadata rather than losing the cause', async () => {
  const h = harness(async () => Response.json({ response: { header: { resultCode: '20' } } }));
  const results = await Promise.all([h.run('753302'), h.run('753302'), h.run('2783785')]);
  assert.equal(h.requests.length, 1);
  for (const result of results) { assert.equal(result.status, 502); assert.equal(result.body.failure.kind, 'auth_error'); }
});
