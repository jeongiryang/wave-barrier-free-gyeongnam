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

test('an omitted parcel matches only the same full locality within 30 metres, preserving official evidence', () => {
  const officialPark = { ...official, id: '2758443', name: '대산플라워랜드', address: '경상남도 창원시 의창구 대산면 모산리', mapX: '128.7', mapY: '35.3' };
  const searched = { ...officialPark, id: 'kakao-park', name: '대산 플라워랜드', address: '경남 창원시 의창구 대산면 모산리 4-11' };
  const atDistance = metres => ({ ...searched, mapY: String(Number(officialPark.mapY) + metres / 111320) });
  for (const distance of [0, 11, 29.99]) {
    assert.equal(canonicalPublicPlace(atDistance(distance), [officialPark]), officialPark);
    assert.equal(canonicalPublicPlace(officialPark, [atDistance(distance)])?.id, searched.id);
  }
  for (const distance of [30.01, 100, 151]) assert.equal(canonicalPublicPlace(atDistance(distance), [officialPark]), undefined);
  for (const change of [
    { address: '경남 창원시 의창구 동읍 모산리 4-11' },
    { address: '경남 창원시 의창구 대산면 가술리 4-11' },
    { address: '경남 창원시 의창구 대산면 모산리 4-11 2층' },
    { name: '대산플라워랜드 카페' },
  ]) assert.equal(canonicalPublicPlace({ ...searched, ...change }, [officialPark]), undefined);
  assert.equal(canonicalPublicPlace(searched, [officialPark, { ...officialPark, id: '9999' }]), undefined);
  assert.equal(canonicalPublicPlace(searched, [{ ...officialPark, address: `${officialPark.address} 4-12` }]), undefined);
  assert.equal(canonicalPublicPlace({ ...searched, address: '모산리 4-11' }, [{ ...officialPark, address: '모산리' }]), undefined, 'locality-only text lacks the full administrative identity');
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
