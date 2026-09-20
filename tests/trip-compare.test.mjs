import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareTrips } from '../lib/trip-compare.js';

const left = { id: 'a', title: 'A', region: '창원', dayCount: 1, placeCount: 3, facilityKeys: ['route'] };
test('facility rows use canonical Korean labels while source keys remain intact', () => {
  const right = { ...left, facilityKeys: ['restroom', 'route'] };
  const row = compareTrips(left, right).find(item => item.label === '고른 편의');
  assert.equal(row.left, '접근로');
  assert.match(row.right, /장애인 화장실/);
  assert.doesNotMatch(row.right, /restroom|route/);
  assert.deepEqual(right.facilityKeys, ['restroom', 'route']);
});
test('different rows precede same rows and retain explicit same state', () => {
  const rows = compareTrips(left, { ...left, id: 'b', title: 'B', region: '통영', placeCount: 4 });
  assert.deepEqual(rows.slice(0, 2).map(row => row.label), ['지역', '장소 수']);
  assert.ok(rows.slice(0, 2).every(row => !row.same));
  assert.ok(rows.slice(2).every(row => row.same));
});
test('missing values are shown honestly', () => {
  const rows = compareTrips(left, { id: 'b', title: '', region: '', dayCount: 0, placeCount: -1, facilityKeys: [] });
  assert.ok(rows.some(row => row.right === '정보 없음'));
});
test('result has no score, similarity, rank, recommendation, or coordinates', () => {
  assert.doesNotMatch(JSON.stringify(compareTrips(left, { ...left, id: 'b' })), /score|similar|rank|recommend|latitude|longitude/i);
});
test('pure comparison never uses network, storage, analytics, or location', () => {
  const source = readFileSync(new URL('../lib/trip-compare.js', import.meta.url), 'utf8');
  for (const token of ['fetch(', 'localStorage', 'sessionStorage', 'navigator', 'geolocation', 'analytics', 'Date.now', 'Math.random']) assert.ok(!source.includes(token));
});
