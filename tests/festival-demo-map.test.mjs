import assert from 'node:assert/strict';
import test from 'node:test';
import { readFestivalAmenities } from '../lib/festival-amenities.js';

const item = { id: 'official-1', name: '등록 화장실', address: '경상남도 창원시 중앙대로 1', openingHours: '09:00–18:00', distanceFromPlaceMeters: 210,
  evidence: { accessibleToilet: 'confirmed' }, sources: [{ type: 'official', provider: '전국공중화장실표준데이터', referenceDate: '2026-09-15' }], destination: { latitude: 35.2385, longitude: 128.6915 } };
const response = { status: 'available', contentId: '3001', radiusKm: 5, checkedAt: '2026-09-15T14:04:23.624Z', source: '전국공중화장실표준데이터', items: [item] };

test('festival map retains only an official same-place response without inventing facility facts or coordinates', () => {
  const result = readFestivalAmenities(response, '3001');
  assert.equal(result.status, 'available');
  assert.deepEqual(result.items[0].destination, item.destination);
  assert.equal(result.items[0].distanceFromPlaceMeters, 210);
  assert.equal(result.items[0].evidence.entranceDoor, 'unknown');
  assert.deepEqual(result.items[0].sources, item.sources);
});

test('genuine zero results differ from provider failure, another place and contradictory responses', () => {
  assert.equal(readFestivalAmenities({ ...response, status: 'empty', items: [] }, '3001').status, 'empty');
  for (const patch of [{ status: 'provider-error', items: [] }, { contentId: '3002' }, { status: 'empty' }, { items: [] }, { radiusKm: 20 }, { checkedAt: '' }, { source: '' }]) {
    assert.equal(readFestivalAmenities({ ...response, ...patch }, '3001').status, 'error');
  }
});

test('missing, unsafe or unverified positions never become map markers or false empty results', () => {
  for (const patch of [{ destination: null }, { destination: { latitude: 0, longitude: 0 } }, { sources: [] }, { evidence: { accessibleToilet: 'unknown' } }, { distanceFromPlaceMeters: -1 }, { distanceFromPlaceMeters: 5001 }, { distanceFromPlaceMeters: '10' }]) {
    const result = readFestivalAmenities({ ...response, items: [{ ...item, ...patch }] }, '3001');
    assert.equal(result.status, 'error'); assert.deepEqual(result.items, []);
  }
  assert.equal(readFestivalAmenities({ ...response, items: [item, item] }, '3001').status, 'error');
  assert.equal(readFestivalAmenities({ ...response, items: Array(4).fill(item) }, '3001').status, 'error');
});
