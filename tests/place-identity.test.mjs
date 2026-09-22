import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalPublicPlace, conflictingFacilities } from '../lib/place-identity.ts';
const official = { id: '1001', name: '거제식물원', address: '경상남도 거제시 거제남서로 3595', mapX: '128.5791', mapY: '34.8572', accessibility: [{ key: 'elevator', state: 'confirmed' }], source: '한국관광공사' };
const external = { ...official, id: 'kakao-55', address: '경남 거제시 거제남서로 3595' };
// Public API shapes observed in the PDF audit; no user coordinates or secrets.
const museum = { id: '1622590', name: '경남도립미술관', address: '경상남도 창원시 의창구 용지로 296 (퇴촌동)', mapX: '128.6908827248', mapY: '35.2395039295' };
const searchedMuseum = { id: '23821302', name: '경남도립미술관', address: '경남 창원시 의창구 용지로 296', mapX: '128.69085550149', mapY: '35.2394650280721' };
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

test('a road address with an optional administrative neighborhood retains the official museum identity', () => {
  assert.equal(canonicalPublicPlace(searchedMuseum, [museum]), museum);
  assert.equal(canonicalPublicPlace(museum, [searchedMuseum]), searchedMuseum);
});

test('neighborhood normalization never discards road numbers, building units, names, distance or candidate ambiguity', () => {
  for (const change of [
    { address: '경남 창원시 의창구 용지로 297' },
    { address: '경남 창원시 의창구 용지로 296-1' },
    { address: '경남 창원시 의창구 용지로 296 (101동)' },
    { address: '경남 창원시 의창구 용지로 296 (1층)' },
    { address: '경남 창원시 의창구 용지로 296 (별관)' },
    { address: '경남 창원시 의창구 용지로 296 (본관동)' },
    { address: '경남 창원시 의창구 용지로 296 (가동)' },
    { address: '경남 창원시 의창구 용지로 296 (아파트101동)' },
    { address: '경남 창원시 의창구 용지로 296 2층' },
    { address: '경남 창원시 의창구 용지로 296 (퇴촌동) 101호' },
    { address: '경남 창원시 의창구 용지로 296 (용호동)' },
    { name: '경남도립미술관 도서자료실' },
    { mapX: '128.7' },
  ]) assert.equal(canonicalPublicPlace({ ...searchedMuseum, ...change }, [museum]), undefined, JSON.stringify(change));
  assert.equal(canonicalPublicPlace(searchedMuseum, [museum, { ...museum, id: '9999' }]), undefined);
});
