import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as coordinates from '../lib/map-coordinates.js';
import * as parking from '../lib/parking-alternatives.js';
import * as budgets from '../lib/request-budget.js';
import * as failures from '../lib/provider-failure.js';

const code = ts.transpileModule(readFileSync(new URL('../server/tourism/parking-alternatives.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const place = { contentid: '1001', title: '공식 관광지', lDongRegnCd: '48', mapx: '128.691', mapy: '35.238' };
const lot = { prkplceNo: 'P1', prkplceNm: '공영주차장', rdnmadr: '경상남도 창원시 중앙대로', latitude: '35.2385', longitude: '128.6915', pwdbsPpkZoneYn: 'Y', referenceDate: '2026-07-01' };

function harness({ places = [place], lots = [lot], providerStatus = 200, invalidJson = false, partial = false, timeout = false } = {}) {
  const mod = { exports: {} }, calls = [];
  const cached = new Map(), inFlight = new Map();
  new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
    if (name.endsWith('map-coordinates.js')) return coordinates;
    if (name.endsWith('parking-alternatives.js')) return parking;
    if (name.endsWith('provider-failure.js')) return failures;
    if (name.endsWith('request-budget.js')) return timeout ? { ...budgets, SERVER_BUDGET_MS: { ...budgets.SERVER_BUDGET_MS, parkingAlternatives: 5 } } : budgets;
    if (name.endsWith('/bounded-snapshot')) return { createBoundedSnapshotCache: () => ({ get: async (key, _ttl, _remaining, work) => { if (cached.has(key)) return cached.get(key); if (inFlight.has(key)) return inFlight.get(key); const request = Promise.resolve(work()).then(value => value === null ? null : { value, checkedAt: new Date().toISOString(), expires: Infinity }); inFlight.set(key, request); const result = await request; inFlight.delete(key); if (result) cached.set(key, result); return result; }, clear: () => { cached.clear(); inFlight.clear(); } }) };
    if (name.endsWith('/http')) return { json: (body, status = 200) => ({ body, status }) };
    if (name.endsWith('/provider-data')) return { commonParams: () => ({ numOfRows: '1' }), fetchTourismData: async (_env, service, operation, params) => { calls.push({ provider: 'kto', service, operation, params }); if (timeout) throw new Error('timeout'); return { items: places, total: places.length, partial }; }, attemptProvider: async promise => { try { const value = await promise; return { ok: true, value }; } catch { return { ok: false, error: 'provider failed' }; } } };
    if (name.endsWith('provider-request.js')) return { requestProvider: async (_context, url) => { calls.push({ provider: 'parking', url }); return { ok: providerStatus === 200, status: providerStatus, text: async () => invalidJson ? '<html>' : JSON.stringify({ response: { header: { resultCode: '00' }, body: { items: lots, totalCount: lots.length } } }) }; } };
    throw Error(name);
  });
  return { calls, run: query => mod.exports.handleParkingAlternatives(new URL(`https://wave.test/api/wave?${query}`), { TOUR_API_SERVICE_KEY_ENCODED: 'encoded-test-key' }) };
}

test('only action and numeric contentId are accepted; location-shaped and unknown queries are rejected', async () => {
  for (const query of ['action=parking-alternatives', 'action=parking-alternatives&contentId=0', 'action=parking-alternatives&contentId=1001&lat=35', 'action=parking-alternatives&contentId=1001&accuracy=4', 'action=parking-alternatives&contentId=1001&origin=x', 'action=parking-alternatives&action=plan&contentId=1001', 'action=parking-alternatives&contentId=1001&contentId=1002']) {
    const h = harness(), response = await h.run(query); assert.equal(response.status, 400); assert.equal(h.calls.length, 0);
  }
});

test('KTO revalidates exact Gyeongnam public ID before provider request', async () => {
  for (const changed of [{ ...place, contentid: '9999' }, { ...place, lDongRegnCd: '11' }, { ...place, mapx: '999' }]) {
    const h = harness({ places: [changed] }), response = await h.run('action=parking-alternatives&contentId=1001'); assert.equal(response.status, 400); assert.equal(h.calls.length, 1);
  }
  const legacy = harness({ places: [{ ...place, lDongRegnCd: undefined, areacode: '36' }] }); assert.equal((await legacy.run('action=parking-alternatives&contentId=1001')).body.status, 'available');
});

test('provider success, empty, partial, malformed and timeout are distinguished without private inputs', async () => {
  const success = harness(), available = await success.run('action=parking-alternatives&contentId=1001'); assert.equal(available.body.status, 'available'); assert.equal(available.body.items.length, 1); assert.doesNotMatch(JSON.stringify(success.calls), /latitude|accuracy|currentLocation/);
  assert.equal((await harness({ lots: [] }).run('action=parking-alternatives&contentId=1001')).body.status, 'empty');
  assert.equal((await harness({ partial: true }).run('action=parking-alternatives&contentId=1001')).status, 502);
  assert.equal((await harness({ providerStatus: 503 }).run('action=parking-alternatives&contentId=1001')).status, 502);
  assert.equal((await harness({ invalidJson: true }).run('action=parking-alternatives&contentId=1001')).status, 502);
  assert.equal((await harness({ timeout: true }).run('action=parking-alternatives&contentId=1001')).status, 502);
});

test('warm cache deduplicates pending/public requests and stores only public IDs', async () => {
  const h = harness(); await Promise.all([h.run('action=parking-alternatives&contentId=1001'), h.run('action=parking-alternatives&contentId=1001')]);
  assert.equal(h.calls.filter(call => call.provider === 'kto').length, 1); assert.equal(h.calls.filter(call => call.provider === 'parking').length, 1);
});
