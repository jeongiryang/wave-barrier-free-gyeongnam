import assert from 'node:assert/strict';
import test from 'node:test';
import { alternativeCandidates } from '../lib/trip-alternatives.js';
import { indoorEvidence } from '../lib/indoor-evidence.js';
import { crowdCalendar } from '../lib/tourism/crowd-calendar.js';
import { periodForDate, canMoveVisitDate } from '../lib/trip-date-move.js';

const place = (id, x, extra = {}) => ({ id, name: id, contentTypeId: '12', mapX: String(x), mapY: '35.23', accessibility: [{ key: 'restroom', state: 'confirmed', detail: '장애인 화장실 있음' }], ...extra });
const before = place('origin', 128.68), original = place('1001', 129), after = place('1002', 128.72);
const near = place('1003', 128.70), far = place('1004', 129.2);
const options = { places: [near, far], original, before, after, requiredKeys: ['restroom'], savedIds: [original.id, after.id] };

test('targeted alternatives preserve confirmed needs, uniqueness and a known movement comparison', () => {
  const result = alternativeCandidates({ ...options, reason: 'distance' });
  assert.deepEqual(result.map(item => item.place.id), ['1003']);
  assert.ok(result[0].travelDelta < 0);
  assert.deepEqual(alternativeCandidates({ ...options, before: {}, reason: 'distance' }), []);
  const unknown = alternativeCandidates({ ...options, before: {}, reason: 'visited' });
  assert.equal(unknown[0].travelDelta, null);
  const denied = ['unknown', 'negative'].map((state, i) => place(String(i + 1005), 128.71, { accessibility: [{ key: 'restroom', state }] }));
  assert.deepEqual(alternativeCandidates({ ...options, places: [...denied, { ...near, accessibility: [] }], reason: 'visited' }), []);
  const explicitUnknown = alternativeCandidates({ ...options, places: [...denied, near], includeUnknown: true, reason: 'visited' });
  assert.deepEqual(explicitUnknown.map(item=>item.place.id), [near.id, '1005']);
  assert.deepEqual(explicitUnknown[1].unknownKeys, ['restroom']);
  assert.equal(alternativeCandidates({ ...options, places: [near, near, original, after], reason: 'visited' }).length, 1);
});

test('the selected reason changes the candidate set instead of a cosmetic badge', () => {
  assert.deepEqual(alternativeCandidates({ ...options, reason: 'visited', visitedIds: ['1003'] }).map(item => item.place.id), ['1004']);
  assert.deepEqual(alternativeCandidates({ ...options, reason: 'rest', originalVisitMinutes: 60 }), []);
  assert.equal(alternativeCandidates({ ...options, reason: 'rest', originalVisitMinutes: 150 })[0].visitDelta, -60);
  assert.deepEqual(alternativeCandidates({ ...options, reason: 'indoor' }), []);
  const evidence = { state: 'indoor-space', detail: '실내 전시 공간이 있습니다.' };
  assert.deepEqual(alternativeCandidates({ ...options, reason: 'indoor', indoorById: { '1003': evidence } }).map(item => item.place.id), ['1003']);
});

test('indoor suitability requires explicit positive provider text, never a category or an unverified promise', () => {
  assert.equal(indoorEvidence('<p>실내 전시 공간에서 작품을 관람합니다.</p>').state, 'indoor-space');
  for (const value of [null, 14, '박물관', '실내 전시 공간은 없습니다.', '실내 체험은 불가능합니다.', '실내 시설은 폐쇄되었습니다.', '실내 공간을 만들 예정입니다.', '우천 시 실내 체험을 운영합니다.', '실내 전시와 야외 체험을 운영합니다.']) {
    assert.equal(indoorEvidence(value).state, 'unknown', String(value));
  }
  assert.ok(indoorEvidence(`실내 전시 공간이 ${'가'.repeat(6000)}`).detail.length <= 400);
});

test('date forecasts keep reported zero, exact names and actual dates, and omit conflicting duplicates', () => {
  const item = (date, rate, name = '경남 미술관') => ({ baseYmd: date, cnctrRate: rate, tAtsNm: name });
  const result = crowdCalendar([
    item('20260911', 80), item('20260912', 0), item('20260913', 20), item('20260913', 30), item('20260914', ' '),
    item('20260915', -1), item('20260916', 101), item('20260917', 22, '다른 미술관'), item('20260931', 20),
    item('20260910', 20), item('20261012', 20), item('20260918', '35.5', '경남미술관'),
    item('20260919', false), item('20260920', true), item('20260921', []), item('20260922', [0]), item('20260923', '0x10'), item('20260924', '0'),
  ], '경남 미술관', '2026-09-11');
  assert.deepEqual(result, [{ date: '2026-09-11', rate: 80 }, { date: '2026-09-12', rate: 0 }, { date: '2026-09-18', rate: 35.5 }, { date: '2026-09-24', rate: 0 }]);
  assert.deepEqual(crowdCalendar([], '경남 미술관', 'invalid'), []);
});

test('moving a single visit expands at most seven days and cannot shift a later fixed slot', () => {
  assert.deepEqual(periodForDate('2026-09-12', '2026-09-14', '2026-09-11'), { start: '2026-09-11', end: '2026-09-14' });
  assert.equal(periodForDate('2026-09-12', '2026-09-14', '2026-09-19'), null);
  const input = { id: 'a', date: '2026-09-13', order: ['a', 'b'], assignments: { a: '2026-09-12', b: '2026-09-12' }, fixed: {}, start: '2026-09-12', end: '2026-09-12' };
  assert.equal(canMoveVisitDate(input), true);
  assert.equal(canMoveVisitDate({ ...input, fixed: { a: { kind: 'must-visit', position: 0 } } }), false);
  assert.equal(canMoveVisitDate({ ...input, fixed: { b: { kind: 'must-visit', position: 1 } } }), false);
  assert.equal(canMoveVisitDate({ ...input, id: 'b', fixed: { a: { kind: 'must-visit', position: 0 } } }), true);
  assert.equal(canMoveVisitDate({ ...input, id: 'missing' }), false);
});
