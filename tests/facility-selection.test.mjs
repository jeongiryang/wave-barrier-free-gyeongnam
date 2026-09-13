import assert from 'node:assert/strict';
import test from 'node:test';
import { FACILITIES, resolveFacilityKeys, classifyFacilities } from '../lib/facility-selection.js';

const keys = [
  'parking', 'route', 'wheelchair', 'elevator', 'restroom', 'stroller',
  'lactationroom', 'babysparechair', 'braileblock', 'helpdog', 'guidehuman',
  'audioguide', 'bigprint', 'signguide', 'videoguide', 'hearingroom',
];
const sorted = values => [...values].sort();
const field = (key, state) => ({ key, state });
const place = (...accessibility) => ({ id: '126833', accessibility });
const legacy = {
  wheel: { label: '휠체어 편의시설', keys: ['parking', 'route', 'wheelchair', 'elevator', 'restroom'] },
  senior: { label: '접근로와 승강기', keys: ['route', 'elevator', 'restroom'] },
  baby: { label: '유아 편의시설', keys: ['stroller', 'lactationroom', 'babysparechair'] },
  pregnant: { label: '화장실과 실내 이동', keys: ['elevator', 'restroom', 'route'] },
  visual: { label: '시각 정보 지원', keys: ['braileblock', 'helpdog', 'guidehuman', 'audioguide', 'bigprint'] },
  hearing: { label: '청각 정보 지원', keys: ['signguide', 'videoguide', 'hearingroom'] },
};

test('the public facility catalog contains every allowed official key once and labels both languages', () => {
  assert.deepEqual(sorted(FACILITIES.map(item => item.key)), sorted(keys));
  for (const facility of FACILITIES) {
    assert.equal(typeof facility.label, 'string');
    assert.ok(facility.label.trim());
    assert.equal(typeof facility.en, 'string');
    assert.ok(facility.en.trim());
  }
});

for (const [profile, value] of Object.entries(legacy)) {
  test(`legacy ${profile} and its existing Korean label retain exactly their requested facilities`, () => {
    for (const input of [[profile], profile, [value.label], value.label]) {
      assert.deepEqual(sorted(resolveFacilityKeys({ profiles: input })), sorted(value.keys));
    }
  });
}

test('explicit individual keys override legacy bundles instead of adding unrequested facilities', () => {
  for (const facilityKeys of [['restroom'], 'restroom']) {
    assert.deepEqual(resolveFacilityKeys({ facilityKeys, profiles: ['wheel', 'baby'] }), ['restroom']);
  }
});

test('an explicit empty selection wins over a stored legacy profile', () => {
  for (const facilityKeys of [[], '']) {
    assert.deepEqual(resolveFacilityKeys({ facilityKeys, profiles: ['wheel'] }), []);
  }
});

test('explicit invalid keys cannot resurrect a legacy bundle or become facilities themselves', () => {
  assert.deepEqual(resolveFacilityKeys({ facilityKeys: ['wheel', 'unknown', '__proto__', 'constructor'], profiles: ['wheel'] }), []);
});

test('array and comma-separated key input deduplicate allowed keys and ignore unknown values', () => {
  for (const facilityKeys of [
    ['restroom', 'route', 'restroom', '', 'unknown', '__proto__', 'constructor'],
    'restroom,route,restroom,,unknown,__proto__,constructor',
  ]) {
    assert.deepEqual(sorted(resolveFacilityKeys({ facilityKeys })), ['restroom', 'route']);
  }
});

test('overlapping legacy profiles and mixed Korean labels form a union without duplicate requirements', () => {
  const expected = ['parking', 'route', 'wheelchair', 'elevator', 'restroom', 'stroller', 'lactationroom', 'babysparechair'];
  for (const profiles of [
    ['wheel', 'senior', '접근로와 승강기', 'baby', '유아 편의시설', 'unknown'],
    'wheel,senior,접근로와 승강기,baby,유아 편의시설,unknown',
  ]) assert.deepEqual(sorted(resolveFacilityKeys({ profiles })), sorted(expected));
});

test('missing or unknown selections do not infer any required facility', () => {
  for (const input of [{}, { profiles: [] }, { profiles: '' }, { profiles: ['unknown', '__proto__', 'constructor'] }]) {
    assert.deepEqual(resolveFacilityKeys(input), []);
  }
});

test('no required facilities is a match without claiming any field was confirmed', () => {
  for (const value of [{}, place(), place(field('restroom', 'negative'))]) {
    assert.equal(classifyFacilities(value, []), 'match');
  }
});

test('a match requires every selected facility to have confirmed evidence', () => {
  const value = place(field('parking', 'confirmed'), field('route', 'confirmed'), field('restroom', 'confirmed'));
  assert.equal(classifyFacilities(value, ['parking', 'route', 'restroom']), 'match');
  assert.equal(classifyFacilities(value, ['route', 'route']), 'match');
});

test('a high score and another confirmed field cannot promote missing or unknown required evidence', () => {
  const metadata = { score: 100, confidence: 100, knownFields: 16, unknownFields: 0, negativeFields: 0 };
  assert.equal(classifyFacilities({ ...metadata, ...place(field('parking', 'confirmed')) }, ['parking', 'restroom']), 'unknown');
  assert.equal(classifyFacilities({ ...metadata, ...place(field('parking', 'confirmed'), field('restroom', 'unknown')) }, ['parking', 'restroom']), 'unknown');
  assert.equal(classifyFacilities(metadata, ['restroom']), 'unknown');
});

test('one explicitly absent required facility takes precedence over confirmed and missing fields', () => {
  const value = { score: 100, negativeFields: 0, ...place(field('parking', 'confirmed'), field('restroom', 'negative')) };
  assert.equal(classifyFacilities(value, ['parking', 'restroom']), 'absent');
  assert.equal(classifyFacilities(value, ['route', 'restroom']), 'absent');
});

test('unrequested negative or unknown facilities do not reject an otherwise matching place', () => {
  const value = place(field('route', 'confirmed'), field('wheelchair', 'negative'), field('restroom', 'unknown'));
  assert.equal(classifyFacilities(value, ['route']), 'match');
});

test('only the exact evidence state confirms a facility; text and numeric summaries are insufficient', () => {
  for (const state of [undefined, null, '', true, 'available', 'CONFIRMED']) {
    assert.equal(classifyFacilities(place({ key: 'restroom', state, detail: '있음', label: '확인됨' }), ['restroom']), 'unknown');
  }
  assert.equal(classifyFacilities({ score: 0, negativeFields: 9, ...place(field('route', 'confirmed')) }, ['route']), 'match');
});

test('duplicate evidence cannot hide an explicit negative behind an earlier confirmed field', () => {
  for (const states of [['confirmed', 'negative'], ['negative', 'confirmed']]) {
    assert.equal(classifyFacilities(place(...states.map(state => field('restroom', state))), ['restroom']), 'absent');
  }
});

test('classification does not rewrite official evidence or the caller selection', () => {
  const required = Object.freeze(['route', 'restroom']);
  const accessibility = Object.freeze([Object.freeze(field('route', 'confirmed')), Object.freeze(field('restroom', 'unknown'))]);
  const value = Object.freeze({ id: '126833', score: 100, accessibility });
  assert.equal(classifyFacilities(value, required), 'unknown');
  assert.deepEqual(required, ['route', 'restroom']);
  assert.equal(value.accessibility[1].state, 'unknown');
});
