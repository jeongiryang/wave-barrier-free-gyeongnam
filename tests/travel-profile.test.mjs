import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTravelProfile } from '../lib/travel-profile.js';
import { createTravelProfile, sanitizeTravelProfile } from '../features/planner/profile/travel-profile.js';

const allowed = ['route', 'parking', 'elevator', 'restroom', 'audioguide'];

test('existing explicit facility profile storage remains unchanged', () => {
  assert.deepEqual(createTravelProfile(['parking', 'unknown', 'parking', 'audioguide'], allowed, 1000), { version: 1, selectedIds: ['parking', 'audioguide'], updatedAt: 1000 });
  assert.equal(sanitizeTravelProfile(null, allowed), null);
  assert.equal(sanitizeTravelProfile({ version: 2, selectedIds: ['parking'], updatedAt: 1000 }, allowed), null);
  assert.equal(sanitizeTravelProfile({ version: 1, selectedIds: ['unknown'], updatedAt: 1000 }, allowed), null);
  assert.deepEqual(sanitizeTravelProfile({ version: 1, selectedIds: ['senior', 'diagnosis'], updatedAt: 2000 }, allowed), { version: 1, selectedIds: ['route', 'elevator', 'restroom'], updatedAt: 2000 });
});

const trip = (id, region = '창원', dayCount = 1, facilityKeys = ['route'], placeTypeIds = ['12']) => ({ id, region, dayCount, facilityKeys, placeTypeIds });

test('requires at least two valid user-created trips', () => {
  assert.equal(buildTravelProfile({ trips: [] }), null);
  assert.equal(buildTravelProfile({ trips: [trip('1')] }), null);
  assert.equal(buildTravelProfile({ trips: [trip('1'), { broken: true }] }), null);
});

test('counts facts, caps top lists, and returns deterministic ties', () => {
  const input = { trips: [trip('1', '통영', 1, ['route', 'restroom'], ['12']), trip('2', '창원', 2, ['restroom'], ['39']), trip('3', '거제', 3, ['elevator'], ['32']), trip('4', '김해', 4, ['parking'], ['14'])] };
  const first = buildTravelProfile(input), second = buildTravelProfile(structuredClone(input));
  assert.deepEqual(first, second);
  assert.equal(first.regions.length, 3);
  assert.deepEqual(first.facilities[0], { label: '장애인 화장실', count: 2 });
  assert.deepEqual(first.lengths, [{ label: '그 이상', count: 2 }, { label: '1박 2일', count: 1 }, { label: '하루', count: 1 }]);
});

test('result contains counts and suggestions, never score, type, or coordinates', () => {
  const value = buildTravelProfile({ trips: [trip('1'), trip('2')] });
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /score|personality|latitude|longitude|coordinate/i);
  assert.deepEqual(value.suggestion, { region: '창원', facilityKeys: ['route'] });
});

test('pure module never uses network, storage, analytics, or location APIs', () => {
  const source = readFileSync(new URL('../lib/travel-profile.js', import.meta.url), 'utf8');
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'navigator', 'geolocation', 'analytics', 'Date.now', 'Math.random']) assert.ok(!source.includes(forbidden), forbidden);
});
