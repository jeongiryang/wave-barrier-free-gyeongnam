import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as coordinates from '../lib/map-coordinates.js';
import * as smoking from '../lib/smoking-area.js';
import * as budgets from '../lib/request-budget.js';

const code = ts.transpileModule(readFileSync(new URL('../server/tourism/smoking-area.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const place = { contentid: '1001', title: '공식 관광지', addr1: '경상남도 창원시 의창구 중앙대로', lDongRegnCd: '48', mapx: '128.691', mapy: '35.238' };
const area = { prhsmkNm: '공원 외부 금연구역', prhsmkScopeDesc: '지정 경계', ctprvnNm: '경상남도', signguNm: '창원시', rdnmadr: '경상남도 창원시 중앙대로 1', institutionNm: '창원시청', latitude: '35.2385', longitude: '128.6915', referenceDate: '2026-06-19' };

function harness({ places = [place], areas = [area], providerStatus = 200, invalidJson = false, partial = false, missingKey = false } = {}) {
  const mod = { exports: {} }, calls = [], cached = new Map(), pending = new Map();
  new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
    if (name.endsWith('map-coordinates.js')) return coordinates;
    if (name.endsWith('smoking-area.js')) return smoking;
    if (name.endsWith('request-budget.js')) return budgets;
    if (name.endsWith('/bounded-snapshot')) return { createBoundedSnapshotCache: () => ({ get: async (key, _ttl, _remaining, work) => { if (cached.has(key)) return cached.get(key); if (pending.has(key)) return pending.get(key); const request = Promise.resolve(work()).then(value => value === null ? null : { value, checkedAt: '2026-09-20T00:00:00.000Z', expires: Infinity }); pending.set(key, request); const result = await request; pending.delete(key); if (result) cached.set(key, result); return result; }, clear: () => { cached.clear(); pending.clear(); } }) };
    if (name.endsWith('/http')) return { clean: value => String(value ?? '').trim(), json: (body, status = 200) => ({ body, status }) };
    if (name.endsWith('/provider-data')) return { commonParams: () => ({ numOfRows: '1' }), fetchTourismData: async () => { calls.push({ provider: 'kto' }); return { items: places, total: places.length, partial }; }, attemptProvider: async promise => { try { return { ok: true, value: await promise }; } catch { return { ok: false, error: 'provider failed' }; } } };
    if (name.endsWith('provider-request.js')) return { requestProvider: async (_context, url) => { calls.push({ provider: 'no-smoking', url }); return { ok: providerStatus === 200, status: providerStatus, text: async () => invalidJson ? '<html>' : JSON.stringify({ response: { header: { resultCode: '00' }, body: { items: areas, totalCount: areas.length } } }) }; } };
    throw Error(name);
  });
  return { calls, run: query => mod.exports.handleSmokingArea(new URL(`https://wave.test/api/wave?${query}`), { TOUR_API_SERVICE_KEY_ENCODED: missingKey ? '' : 'encoded-test-key' }) };
}

test('request accepts only action and public numeric contentId', async () => {
  for (const query of ['action=smoking-area', 'action=smoking-area&contentId=0', 'action=smoking-area&contentId=1001&lat=35', 'action=smoking-area&contentId=1001&origin=x', 'action=smoking-area&action=x&contentId=1001']) {
    const h = harness(), result = await h.run(query);
    assert.equal(result.status, 400);
    assert.equal(result.body.status, 'invalid-request');
    assert.equal(h.calls.length, 0);
  }
});

test('exact Gyeongnam tourism record and public coordinates are revalidated first', async () => {
  for (const changed of [{ ...place, contentid: '9999' }, { ...place, lDongRegnCd: '11' }, { ...place, mapx: '999' }]) {
    const h = harness({ places: [changed] }), result = await h.run('action=smoking-area&contentId=1001');
    assert.equal(result.body.status, 'location-unconfirmed');
    assert.equal(h.calls.filter(call => call.provider === 'no-smoking').length, 0);
  }
});

test('available, honest empty and provider error remain distinct with a fixed no-smoking kind', async () => {
  const success = harness(), available = await success.run('action=smoking-area&contentId=1001');
  assert.equal(available.body.status, 'available');
  assert.equal(available.body.kind, 'no-smoking');
  assert.equal(available.body.items.length, 1);
  assert.doesNotMatch(JSON.stringify(available.body), /userLatitude|userLongitude|accuracy|currentLocation/);
  assert.match(success.calls.find(call => call.provider === 'no-smoking').url, /ctprvnNm=%EA%B2%BD%EC%83%81%EB%82%A8%EB%8F%84/);
  assert.match(success.calls.find(call => call.provider === 'no-smoking').url, /signguNm=%EC%B0%BD%EC%9B%90%EC%8B%9C/);
  assert.equal((await harness({ areas: [] }).run('action=smoking-area&contentId=1001')).body.status, 'empty');
  assert.equal((await harness({ providerStatus: 503 }).run('action=smoking-area&contentId=1001')).body.status, 'provider-error');
  assert.equal((await harness({ invalidJson: true }).run('action=smoking-area&contentId=1001')).body.status, 'provider-error');
  assert.equal((await harness({ missingKey: true }).run('action=smoking-area&contentId=1001')).body.status, 'provider-error');
});

test('successful public snapshots coalesce concurrent requests', async () => {
  const h = harness();
  await Promise.all([h.run('action=smoking-area&contentId=1001'), h.run('action=smoking-area&contentId=1001')]);
  assert.equal(h.calls.filter(call => call.provider === 'kto').length, 1);
  assert.equal(h.calls.filter(call => call.provider === 'no-smoking').length, 1);
});
