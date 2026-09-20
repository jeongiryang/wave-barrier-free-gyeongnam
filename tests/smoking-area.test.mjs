import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { normalizeNoSmokingAreas, smokingAreaDistanceMeters } from '../lib/smoking-area.js';

const origin = { latitude: 35.238, longitude: 128.691 };
const record = (index, overrides = {}) => ({
  prhsmkNm: `금연구역 ${index}`,
  prhsmkScopeDesc: '시설 외부 지정 범위',
  ctprvnNm: '경상남도',
  signguNm: '창원시',
  rdnmadr: `경상남도 창원시 중앙대로 ${index}`,
  institutionNm: '창원시청',
  latitude: String(origin.latitude + index * 0.0001),
  longitude: String(origin.longitude),
  referenceDate: '2026-06-19',
  ...overrides,
});

test('only documented no-smoking fields are normalized and no user location field is emitted', () => {
  const [item] = normalizeNoSmokingAreas([record(1, { unknownProviderField: 'ignore' })], origin);
  assert.equal(item.name, '금연구역 1');
  assert.equal(item.institutionName, '창원시청');
  assert.equal(item.note, '시설 외부 지정 범위');
  assert.deepEqual(Object.keys(item).sort(), ['address', 'destination', 'distanceMeters', 'id', 'institutionName', 'name', 'note', 'referenceDate']);
  assert.doesNotMatch(JSON.stringify(item), /user|current|accuracy|origin/i);
});

test('missing coordinates or required evidence is excluded instead of fabricated', () => {
  const missing = [
    record(1, { latitude: '' }), record(2, { longitude: '' }), record(3, { prhsmkNm: '' }),
    record(4, { rdnmadr: '', lnmadr: '' }), record(5, { referenceDate: '' }),
    record(6, { ctprvnNm: '부산광역시' }),
  ];
  assert.deepEqual(normalizeNoSmokingAreas(missing, origin), []);
});

test('records are deduplicated, sorted by public-destination distance and capped at ten', () => {
  const records = Array.from({ length: 14 }, (_, index) => record(14 - index));
  records.push({ ...records[0] });
  const items = normalizeNoSmokingAreas(records, origin);
  assert.equal(items.length, 10);
  for (let index = 1; index < items.length; index++) assert.ok(items[index - 1].distanceMeters <= items[index].distanceMeters);
  assert.ok(smokingAreaDistanceMeters(origin, items[0].destination) <= smokingAreaDistanceMeters(origin, items.at(-1).destination));
});

test('normalizer is pure and cannot read browser position or storage', () => {
  const source = readFileSync(new URL('../lib/smoking-area.js', import.meta.url), 'utf8');
  for (const forbidden of ['fetch(', 'navigator', 'geolocation', 'localStorage', 'sessionStorage', 'window', 'document']) {
    assert.ok(!source.includes(forbidden), `${forbidden} must not be referenced`);
  }
});
