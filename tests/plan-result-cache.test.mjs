import assert from 'node:assert/strict';
import test from 'node:test';
import { readPlanResultCache, writePlanResultCache } from '../lib/plan-result-cache.js';

const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
test('plan cache stores only useful provider results and keeps criteria isolated', () => {
  const store = storage();
  assert.equal(writePlanResultCache(store, 'a', { generatedAt: '2026-09-14T00:00:00Z', mode: 'partial', places: [], statuses: [{ state: 'error' }] }), false);
  assert.equal(writePlanResultCache(store, 'a', { generatedAt: '2026-09-14T00:00:00Z', mode: 'partial', places: [{ id: '1' }], statuses: [{ state: 'live' }] }), true);
  assert.equal(readPlanResultCache(store, 'b'), null);
  assert.equal(readPlanResultCache(store, 'a').plan.places[0].id, '1');
});
