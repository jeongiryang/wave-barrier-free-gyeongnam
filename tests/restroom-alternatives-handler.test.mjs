import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as coordinates from '../lib/map-coordinates.js';
import * as restrooms from '../lib/restroom-alternatives.js';
import * as budgets from '../lib/request-budget.js';

const code = ts.transpileModule(readFileSync(new URL('../server/tourism/restroom-alternatives.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText;
const place = { contentid: '1001', title: '공식 관광지', lDongRegnCd: '48', mapx: '128.691', mapy: '35.238' };
const toilet = { id: 'R1', name: '공중화장실', address: '경상남도 창원시 중앙대로 1', openingHours: '상시', evidence: { accessibleToilet: 'confirmed', entranceStep: 'unknown', entranceDoor: 'unknown', grabBars: 'unknown', turningSpace: 'unknown', sinkAccess: 'unknown', elevatorRequired: 'unknown', emergencyBell: 'unknown' }, sources: [{ type: 'official', provider: '행정안전부', referenceDate: '2026-09-13' }], destination: { latitude: 35.2385, longitude: 128.6915 } };

function harness({ places = [place], artifact = [toilet], enabled = true, partial = false, timeout = false } = {}) {
  const mod = { exports: {} }, calls = [], cached = new Map(), inFlight = new Map();
  new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
    if (name.endsWith('map-coordinates.js')) return coordinates;
    if (name.endsWith('restroom-alternatives.js')) return restrooms;
    if (name.endsWith('request-budget.js')) return timeout ? { ...budgets, SERVER_BUDGET_MS: { ...budgets.SERVER_BUDGET_MS, restroomAlternatives: 5 } } : budgets;
    if (name.endsWith('/bounded-snapshot')) return { createBoundedSnapshotCache: () => ({ get: async (key, _ttl, _remaining, work) => { if (cached.has(key)) return cached.get(key); if (inFlight.has(key)) return inFlight.get(key); const request = Promise.resolve(work()).then(value => value === null ? null : { value, checkedAt: new Date().toISOString(), expires: Infinity }); inFlight.set(key, request); const result = await request; inFlight.delete(key); if (result) cached.set(key, result); return result; }, clear: () => { cached.clear(); inFlight.clear(); } }) };
    if (name.endsWith('gyeongnam-restrooms.json')) return artifact;
    if (name.endsWith('gyeongnam-restrooms.manifest.json')) return { enabled, generatedAt: '2026-09-15T00:00:00Z', audit: { geocodedRows: enabled ? 30 : 0, requiredRows: 30, geocodedCities: enabled ? ['창원시', '진주시', '통영시', '사천시', '김해시'] : [], requiredCities: 5 } };
    if (name.endsWith('/http')) return { json: (body, status = 200) => ({ body, status }) };
    if (name.endsWith('/provider-data')) return { commonParams: () => ({ numOfRows: '1' }), fetchTourismData: async (_env, service, operation, params) => { calls.push({ provider: 'kto', service, operation, params }); if (timeout) throw new Error('timeout'); return { items: places, total: places.length, partial }; }, attemptProvider: async promise => { try { return { ok: true, value: await promise }; } catch { return { ok: false, error: 'failed' }; } } };
    throw Error(name);
  });
  return { calls, run: query => mod.exports.handleRestroomAlternatives(new URL(`https://wave.test/api/wave?${query}`), { TOUR_API_SERVICE_KEY_ENCODED: 'fixture' }) };
}

test('only one action and numeric public contentId are accepted; every location-shaped query is rejected', async () => {
  for (const query of ['action=restroom-alternatives', 'action=restroom-alternatives&contentId=0', 'action=restroom-alternatives&contentId=1001&lat=35', 'action=restroom-alternatives&contentId=1001&lng=128', 'action=restroom-alternatives&contentId=1001&accuracy=4', 'action=restroom-alternatives&contentId=1001&origin=x', 'action=restroom-alternatives&contentId=1001&currentLocation=x', 'action=restroom-alternatives&contentId=1001&contentId=1002']) {
    const h = harness(), response = await h.run(query); assert.equal(response.status, 400); assert.equal(h.calls.length, 0);
  }
});

test('disabled data gate fails closed before KTO or artifact lookup', async () => {
  const h = harness({ enabled: false }), response = await h.run('action=restroom-alternatives&contentId=1001'); assert.equal(response.status, 503); assert.equal(response.body.status, 'data-gate-blocked'); assert.equal(h.calls.length, 0);
});

test('KTO revalidates exact Gyeongnam public ID and point before reading ranked artifact', async () => {
  for (const changed of [{ ...place, contentid: '9999' }, { ...place, lDongRegnCd: '11' }, { ...place, mapx: '999' }]) { const h = harness({ places: [changed] }), response = await h.run('action=restroom-alternatives&contentId=1001'); assert.equal(response.status, 400); assert.equal(h.calls.length, 1); }
});

test('available, empty, partial and timeout stay distinct and never use private coordinates', async () => {
  const success = harness(), available = await success.run('action=restroom-alternatives&contentId=1001'); assert.equal(available.body.status, 'available'); assert.equal(available.body.items.length, 1); assert.doesNotMatch(JSON.stringify(success.calls), /latitude|longitude|accuracy|currentLocation/);
  assert.equal((await harness({ artifact: [] }).run('action=restroom-alternatives&contentId=1001')).body.status, 'empty');
  assert.equal((await harness({ partial: true }).run('action=restroom-alternatives&contentId=1001')).status, 502);
  assert.equal((await harness({ timeout: true }).run('action=restroom-alternatives&contentId=1001')).status, 502);
});

test('warm cache deduplicates pending KTO and public artifact ranking by contentId', async () => {
  const h = harness(); await Promise.all([h.run('action=restroom-alternatives&contentId=1001'), h.run('action=restroom-alternatives&contentId=1001')]); assert.equal(h.calls.filter(call => call.provider === 'kto').length, 1);
});

test('only supported public radii are accepted and no device-location query reaches the provider', async () => {
  const query = 'action=restroom-alternatives&contentId=1001';
  for (const radius of [1, 3, 5, 10, 20]) {
    const h = harness(), response = await h.run(`${query}&radiusKm=${radius}`);
    assert.equal(response.status, 200); assert.equal(response.body.radiusKm, radius);
    assert.deepEqual(h.calls[0].params, { numOfRows: '1', contentId: '1001' });
  }
  for (const suffix of ['radiusKm=0', 'radiusKm=2', 'radiusKm=21', 'radiusKm=-1', 'radiusKm=Infinity', 'radiusKm=NaN', 'radiusKm=5&radiusKm=20', 'radiusKm=5&latitude=35', 'radiusKm=5&longitude=128', 'radiusKm=5&lat=35', 'radiusKm=5&lng=128', 'radiusKm=5&accuracy=1', 'radiusKm=5&origin=35,128', 'radiusKm=5&currentLocation=35,128']) {
    const h = harness(), response = await h.run(`${query}&${suffix}`);
    assert.equal(response.status, 400, suffix); assert.equal(h.calls.length, 0, suffix);
  }
});

test('radius changes get distinct cached results while reusing only the verified public anchor', async () => {
  const distant = { ...toilet, destination: { latitude: Number(place.mapy) + 12500 / 6371000 * 180 / Math.PI, longitude: Number(place.mapx) } };
  const h = harness({ artifact: [distant] }), query = 'action=restroom-alternatives&contentId=1001';
  const small = await h.run(query);
  assert.equal(small.body.radiusKm, 5); assert.equal(small.body.status, 'empty'); assert.deepEqual(small.body.items, []);
  const expanded = await h.run(`${query}&radiusKm=20`);
  assert.equal(expanded.body.status, 'available'); assert.equal(expanded.body.items[0].id, distant.id);
  assert.equal((await h.run(`${query}&radiusKm=5`)).body.status, 'empty');
  assert.equal(h.calls.length, 1, 'radius changes must not requery the public anchor or upload a private location');
});
