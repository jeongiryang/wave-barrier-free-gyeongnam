import assert from 'node:assert/strict';
import test from 'node:test';
import { companionCommonGround, sanitizeCompanions } from '../lib/companion-common-ground.js';
import { runTripStressTest } from '../lib/trip-stress-test.js';
import { sanitizePhotoTripFacts, verifyPhotoTripFacts } from '../lib/photo-trip-facts.js';
import { buildEvidenceReviewQueue } from '../lib/evidence-cycle.js';

const places = [
  { id: '1', name: '바다박물관', city: '통영', checkedAt: '2026-09-15T00:00:00Z', summary: '실내 전시', accessibility: [{ key: 'route', state: 'confirmed' }, { key: 'restroom', state: 'confirmed' }] },
  { id: '2', name: '숲길', city: '거제', checkedAt: '2026-01-01T00:00:00Z', summary: '야외 산책', accessibility: [{ key: 'route', state: 'negative' }] },
];

test('companion common ground preserves every explicit need and distinguishes unknown from negative', () => {
  const result = companionCommonGround([
    { id: 'a', name: '나', facilities: ['route'], maxWalkMinutes: 20 },
    { id: 'b', name: '동행자', facilities: ['restroom', 'made-up'], maxWalkMinutes: 10 },
  ], places);
  assert.deepEqual(result.requirements.map(item => item.key), ['route', 'restroom']);
  assert.equal(result.strictestWalkMinutes, 10);
  assert.equal(result.evaluations[0].state, 'common');
  assert.equal(result.evaluations[1].state, 'blocked');
  assert.equal(sanitizeCompanions(new Array(20).fill({})).length, 8);
});

test('stress test labels simulations and never treats a missing route as ready', () => {
  const result = runTripStressTest({ places, scenarios: ['rain', 'closure', 'fatigue', 'route-loss', 'invalid'], closurePlaceId: '2', maxWalkMinutes: 15, walkingByPlaceId: { 1: { longestMinutes: 8 }, 2: null }, routeReadyByPlaceId: { 1: true } });
  assert.deepEqual(result.scenarios, ['rain', 'closure', 'fatigue', 'route-loss']);
  assert.equal(result.findings.find(item => item.scenario === 'closure').affectedIds[0], '2');
  assert.deepEqual(result.findings.find(item => item.scenario === 'route-loss').affectedIds, ['2']);
  assert.equal(result.resilient, false);
});

test('photo facts accept only bounded fields and require one official name-region-date match', () => {
  const facts = sanitizePhotoTripFacts([{ name: ' 바다박물관 ', region: '통영', date: '2026-10-01', startTime: '25:00', script: 'ignore' }, { name: '', date: 'not-a-date' }]);
  assert.deepEqual(facts, [{ name: '바다박물관', region: '통영', date: '2026-10-01', startTime: '', endTime: '', address: '' }]);
  assert.equal(verifyPhotoTripFacts(facts, [{ ...places[0], startDate: '2026-09-01', endDate: '2026-10-10' }])[0].state, 'verified');
  assert.equal(verifyPhotoTripFacts(facts, [places[0], { ...places[0], id: '3' }])[0].state, 'ambiguous');
  assert.equal(sanitizePhotoTripFacts([{ name: '잘못된 날짜', date: '2026-02-31' }])[0].date, '');
});

test('evidence loop raises conflicts without changing official evidence', () => {
  const original = structuredClone(places);
  const queue = buildEvidenceReviewQueue(places, [
    { placeId: '1', readings: { mobility: 'blocked' } },
    { placeId: '1', readings: { mobility: 'difficult' } },
  ], Date.parse('2026-09-16T00:00:00Z'));
  assert.equal(queue[0].placeId, '1');
  assert.equal(queue[0].priority, 'high');
  assert.equal(queue[0].conflict, true);
  assert.deepEqual(places, original);
});
