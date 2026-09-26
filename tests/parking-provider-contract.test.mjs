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
function moduleFrom(code, require, fetcher, logger = console) { const mod = { exports: {} }; new Function('module', 'exports', 'require', 'fetch', 'console', code)(mod, mod.exports, require, fetcher, logger); return mod.exports; }
const attempts = moduleFrom(compile('../server/shared/provider-attempt.ts'), name => name.endsWith('provider-failure.js') ? failures : { clean: value => String(value) });
const lot = id => ({ prkplceNo: `P${id}`, prkplceNm: `합성 주차장 ${id}`, rdnmadr: `경상남도 창원시 합성로 ${id}`, latitude: '35.2385', longitude: '128.6915', pwdbsPpkZoneYn: 'Y', referenceDate: '2026-09-01' });
const pageBody = (pageNo, total, items) => ({ response: { header: { resultCode: '00' }, body: { pageNo, numOfRows: 1000, totalCount: total, items } } });
const pageItems = (pageNo, total) => Array.from({ length: Math.min(1000, Math.max(0, total - (pageNo - 1) * 1000)) }, (_, index) => lot((pageNo - 1) * 1000 + index));

function harness(reply, { budgetMs = 17500, key = 'noncredential-fixture' } = {}) {
  const requests = [], events = [], progress = [], requester = createProviderRequester();
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
  }, fetcher, { warn: serialized => events.push(JSON.parse(serialized)), info: serialized => progress.push(JSON.parse(serialized)) });
  return { requests, events, progress, maxActive: () => maxActive, run: (id = '2783785') => adapter.handleParkingAlternatives(new URL(`https://example.test/api/wave?action=parking-alternatives&contentId=${id}`), { TOUR_API_SERVICE_KEY_ENCODED: key }) };
}

test('official page limit and exact accessible filter retrieve later pages before ranking', async () => {
  const h = harness(async ({ page }) => Response.json(pageBody(page, 1001, pageItems(page, 1001).map(item => page === 1 ? { ...item, latitude: '37.5', longitude: '127' } : item))));
  const result = await h.run();
  assert.deepEqual(h.requests.map(({ page, rows, accessible }) => ({ page, rows, accessible })), [{ page: 1, rows: 1000, accessible: 'Y' }, { page: 2, rows: 1000, accessible: 'Y' }]);
  assert.equal(result.status, 200); assert.equal(result.body.status, 'available'); assert.equal(result.body.items[0].id, 'P1000');
  assert.deepEqual(h.events, []);
});

test('completed data is shared across different public places and never refetched on a warm lookup', async () => {
  const h = harness(async ({ page }) => Response.json(pageBody(page, 2, pageItems(page, 2))));
  const [first, second] = await Promise.all([h.run('2783785'), h.run('753302')]);
  assert.equal(first.body.status, 'available'); assert.equal(second.body.status, 'available');
  assert.equal(first.body.contentId, '2783785'); assert.equal(second.body.contentId, '753302');
  assert.equal(first.body.checkedAt, second.body.checkedAt);
  await h.run('1622623'); assert.equal(h.requests.length, 1);
});

// Production 0425317's safe descriptor confirmed root header/body, code 00,
// and no response property. These rows are synthetic; only the envelope is observed.
test('observed flat envelope completes first and later pages before sharing the public cache', async () => {
  const h = harness(async ({ page }) => Response.json(pageBody(page, 1001, pageItems(page, 1001).map(item => page === 1 ? { ...item, latitude: '37.5', longitude: '127' } : item)).response));
  const results = await Promise.all([h.run('2783785'), h.run('753302')]);
  for (const result of results) { assert.equal(result.status, 200); assert.equal(result.body.status, 'available'); assert.equal(result.body.items[0].id, 'P1000'); }
  assert.deepEqual(h.requests.map(({ page }) => page), [1, 2]); assert.deepEqual(h.events, []);
  assert.equal(results[0].body.checkedAt, results[1].body.checkedAt);
  await h.run('1622623'); assert.equal(h.requests.length, 2);
});

test('duplicate rows within one page count toward raw completeness and remain deduplicated for display', async () => {
  const h = harness(async () => Response.json(pageBody(1, 3, [lot(0), lot(0), lot(1)]).response));
  const result = await h.run();
  assert.equal(result.status, 200); assert.equal(result.body.status, 'available'); assert.equal(result.body.items.length, 2);
  assert.deepEqual(h.events, []);
  assert.equal(h.progress[0].total, 3); assert.equal(h.progress[0].receivedRows, 3);
  assert.equal(h.progress[1].completedPages, 1); assert.equal(h.progress[1].receivedRows, 3); assert.equal(h.progress[1].outcome, 'complete');
  await h.run('753302'); assert.equal(h.requests.length, 1); assert.equal(h.progress.length, 2, 'a warm complete cache does not start another provider observation');
});

test('same management ID at different locations cannot discard the nearby row before ranking', async () => {
  const h = harness(async () => Response.json(pageBody(1, 2, [{ ...lot(0), latitude: '37.5', longitude: '127' }, { ...lot(1), prkplceNo: 'P0' }]).response));
  const result = await h.run();
  assert.equal(result.status, 200); assert.equal(result.body.items[0].name, lot(1).prkplceNm);
  assert.equal(h.progress.at(-1).receivedRows, 2); assert.equal(h.progress.at(-1).outcome, 'complete');
});

test('a single overlapping row across pages is not mistaken for a repeated entire page', async () => {
  const h = harness(async ({ page }) => Response.json(pageBody(page, 1001, page === 1 ? pageItems(1, 1001) : [lot(0)]).response));
  const result = await h.run();
  assert.equal(result.status, 200); assert.equal(result.body.status, 'available'); assert.deepEqual(h.events, []);
  assert.equal(h.progress.at(-1).completedPages, 2); assert.equal(h.progress.at(-1).receivedRows, 1001);
});

for (const reordered of [false, true]) test(`an entire repeated page is rejected even with reordered rows and keys=${reordered}`, async () => {
  const h = harness(async ({ page }) => {
    let items = pageItems(1, 2000).map(item => ({ ...item, notes: { a: 1, b: { x: 2, y: 3 } } }));
    if (page === 2 && reordered) items = items.reverse().map(item => ({ ...Object.fromEntries(Object.entries(item).reverse()), notes: { b: { y: 3, x: 2 }, a: 1 } }));
    return Response.json(pageBody(page, 2000, items).response);
  });
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.status, 'provider-error'); assert.equal(result.body.failure.kind, 'malformed_response');
  assert.deepEqual(h.events, [{ event: 'parking-response-rejected', reason: 'repeated-page', page: 2, expected: 1, actual: 2 }]);
  assert.equal(h.progress.at(-1).outcome, 'repeated-page'); assert.equal(h.progress.at(-1).receivedRows, 2000);
  await h.run('753302'); assert.equal(h.requests.length, 4, 'a repeated-page failure must not populate the shared completed cache');
});

test('page fingerprints preserve duplicate multiplicity rather than comparing a set of unique rows', async () => {
  const h = harness(async ({ page }) => Response.json(pageBody(page, 2000, Array.from({ length: 1000 }, (_, index) => lot(index < 1000 - page ? 0 : 1))).response));
  const result = await h.run();
  assert.equal(result.status, 200); assert.equal(result.body.items.length, 2); assert.deepEqual(h.events, []);
  assert.equal(h.progress.at(-1).receivedRows, 2000); assert.equal(h.progress.at(-1).outcome, 'complete');
});

test('progress logs contain only fixed events/outcomes and safe integer counts, never records or hashes', async () => {
  const h = harness(async () => Response.json(pageBody(1, 1, [{ ...lot(0), prkplceNo: 'private-sentinel-id', prkplceNm: 'private-sentinel-name', phoneNumber: 'private-sentinel-phone' }]).response), { key: 'private-sentinel-key' });
  assert.equal((await h.run()).status, 200);
  assert.deepEqual(h.progress.map(item => item.event), ['parking-snapshot-started', 'parking-snapshot-finished']);
  assert.deepEqual(Object.keys(h.progress[0]).sort(), ['event', 'total', 'plannedPages', 'pageSize', 'receivedRows', 'elapsedMs', 'remainingMs'].sort());
  assert.deepEqual(Object.keys(h.progress[1]).sort(), ['event', 'completedPages', 'receivedRows', 'elapsedMs', 'outcome'].sort());
  for (const entry of h.progress) for (const [key, value] of Object.entries(entry)) if (!['event', 'outcome'].includes(key)) assert.ok(Number.isSafeInteger(value) && value >= 0);
  assert.equal(h.progress[0].total, 1); assert.equal(h.progress[0].plannedPages, 1); assert.equal(h.progress[0].pageSize, 1000);
  assert.equal(h.progress[1].outcome, 'complete');
  assert.doesNotMatch(JSON.stringify(h.progress), /private-sentinel|serviceKey|https?:|fingerprint|digest|hash|prkplce|phone/);
});

test('a deadline after a valid first page logs incomplete progress once without caching partial rows', async () => {
  const h = harness(async ({ page, signal }) => {
    if (page === 1) return Response.json(pageBody(1, 1001, pageItems(1, 1001)).response);
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  }, { budgetMs: 100 });
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.status, 'provider-error'); assert.equal(result.body.failure.kind, 'timeout');
  await new Promise(resolve => setTimeout(resolve, 5));
  const finishes = h.progress.filter(item => item.event === 'parking-snapshot-finished');
  assert.equal(finishes.length, 1); assert.equal(finishes[0].completedPages, 1); assert.equal(finishes[0].receivedRows, 1000); assert.equal(finishes[0].outcome, 'timeout');
});

for (const [name, wrapped] of [
  ['null', null], ['array', []], ['string', 'private-sentinel'], ['boolean', false], ['number', 0], ['empty object', {}],
  ['incomplete wrapped body', { header: { resultCode: '00' } }],
  ['invalid wrapped total', { header: { resultCode: '00' }, body: { totalCount: 2, items: [lot(0)] } }],
]) test(`an explicit ${name} response cannot borrow valid flat header and body`, async () => {
  const h = harness(async () => Response.json({ ...pageBody(1, 1, [lot(0)]).response, response: wrapped }));
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.failure.kind, 'malformed_response');
  assert.equal(result.body.failure.operation, 'tn_pubr_prkplce_info_api'); assert.equal(h.requests.length, 1);
});

for (const [name, response] of [['null', null], ['array', []], ['string', 'private-sentinel'], ['empty object', {}]])
for (const codeLocation of ['root-header', 'json-xml-text']) test(`malformed ${name} response cannot become empty through ${codeLocation}`, async () => {
  const h = harness(async () => Response.json({ response, ...(codeLocation === 'root-header' ? { header: { resultCode: '03' } } : { description: '<resultCode>03</resultCode>' }) }));
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.status, 'provider-error');
  assert.equal(result.body.failure.kind, 'malformed_response'); assert.equal(result.body.failure.code, null);
  assert.equal(h.events[0].reason, 'envelope'); assert.equal(h.requests.length, 1);
});

test('an explicit valid wrapped response takes precedence over unrelated flat fields', async () => {
  const h = harness(async () => Response.json({ ...pageBody(1, 1, [lot(0)]).response, response: pageBody(1, 0, []).response }));
  const result = await h.run();
  assert.equal(result.status, 200); assert.equal(result.body.status, 'empty'); assert.deepEqual(h.events, []);
});

for (const code of ['0', '0000']) test(`a flat response still requires the documented 00 code, not ${code}`, async () => {
  const h = harness(async () => Response.json({ ...pageBody(1, 1, [lot(0)]).response, header: { resultCode: code } }));
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.failure.kind, 'malformed_response');
  assert.deepEqual(h.events, [{ event: 'parking-response-rejected', reason: 'normal-code', page: 1 }]);
});

for (const format of ['wrapped', 'flat'])
for (const [name, change, reason] of [
  ['missing last page rows', body => { body.response.body.items = []; }, 'row-count'],
  ['duplicate page number', body => { body.response.body.pageNo = 1; }, 'page-no'],
  ['changed total', body => { body.response.body.totalCount = 1002; }, 'total-changed'],
  ['missing total', body => { delete body.response.body.totalCount; }, 'total'],
  ['unrecognized item envelope', body => { body.response.body.items = { unexpected: [] }; }, 'items-shape'],
  ['provider ignored Y filter', body => { body.response.body.items[0].pwdbsPpkZoneYn = 'N'; }, 'filter-value'],
  ['provider omitted accessible evidence', body => { delete body.response.body.items[0].pwdbsPpkZoneYn; }, 'filter-value'],
]) test(`${format} ${name} cannot become an available or empty complete result`, async () => {
  const h = harness(async ({ page }) => { const body = pageBody(page, 1001, pageItems(page, 1001)); if (page === 2) change(body); return Response.json(format === 'flat' ? body.response : body); });
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.status, 'provider-error');
  assert.equal(result.body.failure?.kind, 'malformed_response');
  assert.equal(result.body.failure.operation, 'tn_pubr_prkplce_info_api');
  assert.equal(h.events.length, 1); assert.equal(h.events[0].reason, reason); assert.equal(h.events[0].page, 2);
});

test('over-cap totals stop after page one without a fabricated empty or complete snapshot', async () => {
  const h = harness(async ({ page }) => Response.json(pageBody(page, 20001, pageItems(page, 20001))));
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.status, 'provider-error');
  assert.equal(result.body.partial, true); assert.equal(result.body.unclassifiedFailure, true); assert.equal(h.requests.length, 1);
  assert.deepEqual(h.events, [{ event: 'parking-response-rejected', reason: 'page-cap', page: 1, expected: 20000, actual: 20001 }]);
  assert.equal(h.progress[0].plannedPages, 21); assert.equal(h.progress.at(-1).outcome, 'page-cap');
});

test('page concurrency is at most two and a completed set can confirm zero nearby matches', async () => {
  const h = harness(async ({ page }) => { await new Promise(resolve => setTimeout(resolve, 5)); return Response.json(pageBody(page, 4001, pageItems(page, 4001).map(item => ({ ...item, latitude: '37.5', longitude: '127' })))); });
  const result = await h.run(); assert.equal(result.status, 200); assert.equal(result.body.status, 'empty');
  assert.equal(h.requests.length, 5); assert.equal(h.maxActive(), 2);
});

for (const format of ['wrapped', 'flat'])
for (const [code, kind] of [['20', 'auth_error'], ['22', 'quota_exhausted'], ['10', 'upstream_error']]) test(`${format} provider ${code} survives the public boundary without secrets or retries`, async () => {
  const h = harness(async ({ page }) => { const body = page === 1 ? pageBody(1, 4000, pageItems(1, 4000)) : { response: { header: { resultCode: code, resultMsg: 'private-sentinel' } } }; return Response.json(format === 'flat' ? body.response : body); });
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.failure.kind, kind); assert.equal(result.body.failure.code, code);
  assert.ok(h.requests.length <= 3); assert.doesNotMatch(JSON.stringify(result), /private-sentinel|noncredential-fixture|serviceKey/);
  assert.equal(h.progress.at(-1).outcome, 'partial'); assert.equal(h.progress.at(-1).completedPages, 1);
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

for (const format of ['wrapped', 'flat']) test(`${format} documented no-data is empty only on the initial list page`, async () => {
  const noData = { response: { header: { resultCode: '03' } } };
  const empty = format === 'flat' ? noData.response : noData;
  const first = harness(async () => Response.json(empty));
  assert.equal((await first.run()).body.status, 'empty');
  const later = harness(async ({ page }) => { const full = pageBody(1, 1001, pageItems(1, 1001)); return Response.json(page === 1 ? format === 'flat' ? full.response : full : empty); });
  assert.equal((await later.run()).status, 502);
  assert.deepEqual(first.events, []);
  assert.deepEqual(later.events, [{ event: 'parking-response-rejected', reason: 'later-no-data', page: 2, expected: 1001, actual: 0 }]);
});

for (const [name, change, expected] of [
  ['missing envelope', body => { delete body.response.header; }, { reason: 'envelope' }],
  ['missing normal code', body => { delete body.response.header.resultCode; }, { reason: 'normal-code' }],
  ['unexpected row metadata', body => { body.response.body.numOfRows = 1; }, { reason: 'rows-meta', expected: 1000, actual: 1 }],
  ['nonnumeric page metadata', body => { body.response.body.pageNo = 'private-sentinel'; }, { reason: 'page-no', expected: 1 }],
  ['nonnumeric row metadata', body => { body.response.body.numOfRows = 'private-sentinel'; }, { reason: 'rows-meta', expected: 1000 }],
  ['null row', body => { body.response.body.items = [null]; }, { reason: 'row-object', actual: 1 }],
  ['nonstring row ID', body => { body.response.body.items[0].prkplceNo = { private: 'private-sentinel' }; }, { reason: 'row-id', actual: 1 }],
  ['unexpected filter value', body => { body.response.body.items[0].pwdbsPpkZoneYn = 'private-sentinel'; }, { reason: 'filter-value', actual: 1 }],
]) test(`${name} logs only the fixed reason and safe numeric counts`, async () => {
  const h = harness(async () => {
    const body = pageBody(1, 1, [{ ...lot(0), prkplceNo: 'private-sentinel-id', prkplceNm: 'private-sentinel-name', rdnmadr: 'private-sentinel-address' }]);
    body.response.header.resultMsg = 'private-sentinel-message https://private-sentinel.test/?serviceKey=private-sentinel-key';
    change(body);
    return Response.json(body);
  }, { key: 'private-sentinel-key' });
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.failure.kind, 'malformed_response');
  assert.equal(result.body.failure.operation, 'tn_pubr_prkplce_info_api');
  assert.deepEqual(h.events.map(({ shape, ...event }) => { if (expected.reason === 'envelope') assert.ok(shape); else assert.equal(shape, undefined); return event; }), [{ event: 'parking-response-rejected', page: 1, ...expected }]);
  assert.doesNotMatch(JSON.stringify({ events: h.events, response: result }), /private-sentinel|serviceKey|https?:|"prkplce|resultMsg/);
  assert.equal(result.body.reason, undefined, 'server diagnostics must not expand the public response');
});

test('invalid JSON logs a fixed parsing reason without retaining the raw body', async () => {
  const h = harness(async () => new Response('private-sentinel https://private-sentinel.test/?serviceKey=private-sentinel-key'), { key: 'private-sentinel-key' });
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.failure.kind, 'malformed_response');
  assert.equal(result.body.failure.operation, 'tn_pubr_prkplce_info_api');
  assert.deepEqual(h.events, [{ event: 'parking-response-rejected', reason: 'json', page: 1 }]);
  assert.deepEqual(h.progress.map(({ outcome, completedPages, receivedRows }) => ({ outcome, completedPages, receivedRows })), [{ outcome: 'error', completedPages: 0, receivedRows: 0 }]);
  assert.doesNotMatch(JSON.stringify({ events: h.events, response: result }), /private-sentinel|serviceKey|https?:/);
});

for (const [name, body, scopes, codes] of [
  ['wrapped missing body', { response: { header: { resultCode: '00' } } }, ['object', 'object', 'missing', 'missing', 'object', 'missing'], ['missing', 'missing', 'missing', '00']],
  ['flat missing body', { header: { resultCode: '00' } }, ['object', 'missing', 'object', 'missing', 'missing', 'missing'], ['missing', 'missing', '00', 'missing']],
  ['root string', 'private-sentinel https://private-sentinel.test/?serviceKey=private-sentinel-key', ['string', 'missing', 'missing', 'missing', 'missing', 'missing'], ['missing', 'missing', 'missing', 'missing']],
  ['root array', [{ private: 'private-sentinel' }], ['array', 'missing', 'missing', 'missing', 'missing', 'missing'], ['missing', 'missing', 'missing', 'missing']],
  ['root null', null, ['null', 'missing', 'missing', 'missing', 'missing', 'missing'], ['missing', 'missing', 'missing', 'missing']],
  ['root number', 17, ['number', 'missing', 'missing', 'missing', 'missing', 'missing'], ['missing', 'missing', 'missing', 'missing']],
  ['root boolean', false, ['boolean', 'missing', 'missing', 'missing', 'missing', 'missing'], ['missing', 'missing', 'missing', 'missing']],
  ['gateway explanation', { message: 'private-sentinel', privateField: 'private-sentinel' }, ['object', 'missing', 'missing', 'missing', 'missing', 'missing'], ['missing', 'missing', 'missing', 'missing']],
  ['array header and string body', { response: { header: [{ resultCode: 'private-sentinel' }], body: 'private-sentinel' } }, ['object', 'object', 'missing', 'missing', 'array', 'string'], ['missing', 'missing', 'missing', 'missing']],
  ['known numeric zero', { resultCode: 0 }, ['object', 'missing', 'missing', 'missing', 'missing', 'missing'], ['0', 'missing', 'missing', 'missing']],
  ['known padded zero', { response: { resultCode: '0000' } }, ['object', 'object', 'missing', 'missing', 'missing', 'missing'], ['missing', '0000', 'missing', 'missing']],
  ['unselected arbitrary code', { resultCode: 'private-sentinel', response: { header: { resultCode: '00' } } }, ['object', 'object', 'missing', 'missing', 'object', 'missing'], ['other', 'missing', 'missing', '00']],
]) test(`envelope diagnostic distinguishes ${name} without exposing its values`, async () => {
  const h = harness(async () => Response.json(body), { key: 'private-sentinel-key' });
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.failure.kind, 'malformed_response');
  assert.equal(result.body.failure.operation, 'tn_pubr_prkplce_info_api');
  assert.equal(h.events.length, 1); assert.equal(h.events[0].reason, 'envelope');
  const { shape } = h.events[0];
  assert.deepEqual(Object.keys(shape), ['root', 'response', 'header', 'body', 'responseHeader', 'responseBody', 'serviceResponse', 'serviceMessageHeader']);
  assert.deepEqual(Object.values(shape).slice(0, 6).map(node => node.type), scopes);
  assert.deepEqual(shape.serviceResponse, { type: 'missing' }); assert.deepEqual(shape.serviceMessageHeader, { type: 'missing', code: 'missing' });
  assert.deepEqual([shape.root.code, shape.response.code, shape.header.code, shape.responseHeader.code], codes);
  const visit = node => {
    for (const [key, value] of Object.entries(node)) {
      assert.ok(['type', 'code', 'data', 'items', 'results', 'records', 'error', 'errors', 'length', 'totalCount'].includes(key));
      if (key === 'type') assert.ok(['object', 'array', 'null', 'string', 'number', 'boolean', 'missing'].includes(value));
      else if (key === 'code') assert.ok(['0', '00', '0000', 'other', 'missing'].includes(value));
      else if (typeof value === 'number') assert.ok(Number.isSafeInteger(value) && value >= 0);
      else visit(value);
    }
  };
  Object.values(shape).forEach(visit);
  assert.equal(result.body.shape, undefined);
  assert.doesNotMatch(JSON.stringify({ events: h.events, response: result }), /private-sentinel|privateField|message|serviceKey|https?:/);
});

test('envelope diagnostics count only known collection arrays and safe totals at fixed locations', async () => {
  const h = harness(async () => Response.json({
    data: [{ secret: 'private-sentinel' }, null], items: 'private-sentinel', results: false, records: null, totalCount: '12',
    error: 'private-sentinel', errors: [{ secret: 'private-sentinel' }],
    response: { data: { privateField: 'private-sentinel' }, items: ['private-sentinel'], results: [], records: 13, error: { secret: 'private-sentinel' }, errors: [], totalCount: '9007199254740992' },
  }));
  const result = await h.run();
  assert.equal(result.status, 502);
  const { root, response } = h.events[0].shape;
  assert.deepEqual(root.data, { type: 'array', length: 2 }); assert.deepEqual(root.items, { type: 'string' });
  assert.deepEqual(root.results, { type: 'boolean' }); assert.deepEqual(root.records, { type: 'null' }); assert.equal(root.totalCount, 12);
  assert.deepEqual(response.data, { type: 'object' }); assert.deepEqual(response.items, { type: 'array', length: 1 });
  assert.deepEqual(response.results, { type: 'array', length: 0 }); assert.deepEqual(response.records, { type: 'number' }); assert.equal(response.totalCount, undefined);
  assert.deepEqual(root.error, { type: 'string' }); assert.deepEqual(root.errors, { type: 'array', length: 1 });
  assert.deepEqual(response.error, { type: 'object' }); assert.deepEqual(response.errors, { type: 'array', length: 0 });
  assert.doesNotMatch(JSON.stringify(h.events), /private-sentinel|privateField|secret|9007199254740992/);
});

for (const [code, expected] of [['20', '20'], [22, '22'], ['05', '05'], ['private-sentinel', 'other'], [{ privateField: 'private-sentinel' }, 'other']]) test(`known JSON gateway records a bounded ${expected} code without accepting the envelope`, async () => {
  const h = harness(async () => Response.json({ OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: code, returnAuthMsg: 'private-sentinel', errMsg: 'private-sentinel https://private-sentinel.test/?serviceKey=private-sentinel-key' } } }));
  const result = await h.run();
  assert.equal(result.status, 502); assert.equal(result.body.failure.kind, 'malformed_response');
  assert.equal(result.body.failure.operation, 'tn_pubr_prkplce_info_api'); assert.equal(result.body.failure.code, null);
  assert.equal(h.events[0].reason, 'envelope');
  assert.deepEqual(h.events[0].shape.serviceResponse, { type: 'object' });
  assert.deepEqual(h.events[0].shape.serviceMessageHeader, { type: 'object', code: expected });
  assert.equal(result.body.shape, undefined);
  assert.doesNotMatch(JSON.stringify({ events: h.events, response: result }), /private-sentinel|privateField|returnAuthMsg|errMsg|serviceKey|https?:/);
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
