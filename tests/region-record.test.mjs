import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { regionRecords } from '../lib/region-record.js';
import { landingRegions } from '../features/landing/content.ts';

test('only an explicit completed record marks a region visited', () => {
  const regions = ['창원', '통영'];
  assert.deepEqual(regionRecords([{ region: '창원', completedAt: null }], regions), [{ region: '창원', visited: false, firstRecordedOn: null }, { region: '통영', visited: false, firstRecordedOn: null }]);
  assert.deepEqual(regionRecords([{ region: '창원', completedAt: '2026-09-20' }, { region: '창원', completedAt: '2026-09-18' }], regions)[0], { region: '창원', visited: true, firstRecordedOn: '2026-09-18' });
});
test('all 18 landing region names are preserved exactly', () => {
  const names = landingRegions.map(region => region.name), result = regionRecords([], names);
  assert.equal(result.length, 18); assert.deepEqual(result.map(item => item.region), names);
});
test('records never contain rewards, ranks, companion, or coordinates', () => {
  assert.doesNotMatch(JSON.stringify(regionRecords([], ['창원'])), /point|mileage|reward|rank|companion|disability|latitude|longitude/i);
});
test('pure module has no network, storage, analytics, or location access', () => {
  const source = readFileSync(new URL('../lib/region-record.js', import.meta.url), 'utf8');
  for (const token of ['fetch(', 'localStorage', 'sessionStorage', 'navigator', 'geolocation', 'analytics', 'Math.random']) assert.ok(!source.includes(token));
});
