import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeParkingRecord, parkingDistanceMeters, rankParkingAlternatives } from '../lib/parking-alternatives.js';

const point = { latitude: 35.238, longitude: 128.691 };
const record = { prkplceNo: 'P1', prkplceNm: '도청 주차장', rdnmadr: '경상남도 창원시 의창구 중앙대로', operDay: '평일', weekdayOperOpenHhmm: '09:00', weekdayOperColseHhmm: '18:00', parkingchrgeInfo: '유료', institutionNm: '창원시', phoneNumber: '055-123-4567', latitude: '35.2385', longitude: '128.6915', pwdbsPpkZoneYn: 'Y', referenceDate: '2026-07-01' };

test('only a complete Gyeongnam Y record within 2km becomes confirmed', () => {
  const item = normalizeParkingRecord(record, point);
  assert.equal(item.accessibleZone, 'confirmed');
  assert.equal(item.destination.latitude, 35.2385);
  for (const patch of [{ pwdbsPpkZoneYn: 'N' }, { pwdbsPpkZoneYn: '' }, { latitude: '' }, { longitude: '' }, { referenceDate: '' }, { rdnmadr: '부산광역시 중구' }]) assert.equal(normalizeParkingRecord({ ...record, ...patch }, point), null);
});

test('2km boundary is inclusive and farther records are excluded', () => {
  const exactly = { ...record, latitude: String(point.latitude + (2000 / 111195)), longitude: String(point.longitude) };
  assert.ok(parkingDistanceMeters(point, { latitude: Number(exactly.latitude), longitude: point.longitude }) <= 2000);
  assert.ok(normalizeParkingRecord(exactly, point));
  assert.equal(normalizeParkingRecord({ ...exactly, latitude: String(point.latitude + (2010 / 111195)) }, point), null);
});

test('ranking removes duplicate IDs and normalized addresses then uses evidence tie breakers', () => {
  const records = [
    { ...record, prkplceNo: 'near', latitude: '35.2381', referenceDate: '2025-01-01', phoneNumber: '' },
    { ...record, prkplceNo: 'duplicate-id', latitude: '35.2382' },
    { ...record, prkplceNo: 'duplicate-id', latitude: '35.2383' },
    { ...record, prkplceNo: 'duplicate-address', rdnmadr: '경상남도   창원시 의창구 중앙대로', latitude: '35.2384' },
    { ...record, prkplceNo: 'far', rdnmadr: '경상남도 창원시 다른길', latitude: '35.239' },
  ];
  const items = rankParkingAlternatives(records, point, 3);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'near');
});

test('unsafe phone text and HTML-like provider text are not exposed as actions or markup', () => {
  const item = normalizeParkingRecord({ ...record, prkplceNm: '<b>주차장</b>', phoneNumber: 'javascript:alert(1)' }, point);
  assert.equal(item.name, 'b주차장/b');
  assert.equal(item.phoneNumber, undefined);
});
