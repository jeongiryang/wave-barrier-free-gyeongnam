import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalPublicPlace, conflictingFacilities } from '../lib/place-identity.ts';
const official = { id: '1001', name: '거제식물원', address: '경상남도 거제시 거제남서로 3595', mapX: '128.5791', mapY: '34.8572', accessibility: [{ key: 'elevator', state: 'confirmed' }], source: '한국관광공사' };
const external = { ...official, id: 'kakao-55', address: '경남 거제시 거제남서로 3595' };
test('cross-provider match preserves the exact official record and ID', () => {
  assert.equal(canonicalPublicPlace(external, [official]), official);
});
test('names alone, adjoining shops, different coordinates and ambiguous IDs never merge', () => {
  for (const value of [{ ...external, name: '거제식물원 카페' }, { ...external, address: '' }, { ...external, address: '경남 거제시 다른로 1' }, { ...external, mapX: '128.8' }, { ...external, mapX: '' }]) assert.equal(canonicalPublicPlace(value, [official]), undefined);
  assert.equal(canonicalPublicPlace(external, [official, { ...official, id: '2002' }]), undefined);
});
test('only explicit opposing facility records count as a conflict', () => {
  assert.deepEqual(conflictingFacilities(official, { accessibility: [{ key: 'elevator', state: 'negative' }] }), ['elevator']);
  assert.deepEqual(conflictingFacilities(official, { accessibility: [{ key: 'elevator', state: 'unknown' }] }), []);
});
