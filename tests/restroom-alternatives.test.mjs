import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRestroomAlternative, rankRestroomAlternatives } from '../lib/restroom-alternatives.js';

const origin = { latitude: 35.238, longitude: 128.691 };
const record = { id: 'R1', name: '중앙 공중화장실', address: '경상남도 창원시 중앙대로 1', openingHours: '09:00~18:00', phoneNumber: '055-123-4567', evidence: { accessibleToilet: 'confirmed', entranceStep: 'unknown', entranceDoor: 'unknown', grabBars: 'unknown', turningSpace: 'unknown', sinkAccess: 'unknown', elevatorRequired: 'unknown', emergencyBell: 'unknown' }, sources: [{ type: 'official', provider: '행정안전부 전국공중화장실표준데이터', referenceDate: '2026-09-13' }], destination: { latitude: 35.2385, longitude: 128.6915 } };

test('official toilet evidence never promotes absent detailed accessibility fields', () => {
  const item = normalizeRestroomAlternative(record);
  assert.equal(item.evidence.accessibleToilet, 'confirmed');
  for (const key of ['entranceStep', 'entranceDoor', 'grabBars', 'turningSpace', 'sinkAccess', 'elevatorRequired', 'emergencyBell']) assert.equal(item.evidence[key], 'unknown');
});

test('community evidence stays separate and cannot replace required official evidence', () => {
  const mixed = normalizeRestroomAlternative({ ...record, evidence: { ...record.evidence, entranceStep: 'user_reported' }, sources: [...record.sources, { type: 'community', provider: 'W.A.V.E 이용자 제보', reportedAt: '2026-09-14T10:00:00Z' }] });
  assert.equal(mixed.sources[0].type, 'official'); assert.equal(mixed.sources[1].type, 'community'); assert.equal(mixed.evidence.entranceStep, 'user_reported');
  assert.equal(normalizeRestroomAlternative({ ...record, evidence: { ...record.evidence, accessibleToilet: 'user_reported' }, sources: [{ type: 'community', provider: '이용자 제보', reportedAt: '2026-09-14' }] }), null);
});

test('minimum official fields, safe coordinates, hours or phone and reference date are required', () => {
  for (const patch of [{ address: '' }, { address: '부산광역시 중구' }, { destination: null }, { openingHours: '', phoneNumber: '' }, { sources: [{ type: 'official', provider: '행정안전부' }] }, { evidence: { ...record.evidence, accessibleToilet: 'unknown' } }]) assert.equal(normalizeRestroomAlternative({ ...record, ...patch }), null);
  assert.equal(normalizeRestroomAlternative({ ...record, phoneNumber: 'javascript:alert(1)' }).phoneNumber, undefined);
});

test('distance ranking removes duplicate IDs and addresses and returns at most three', () => {
  const values = [
    { ...record, id: 'near', destination: { latitude: 35.2381, longitude: 128.6911 } },
    { ...record, id: 'duplicate-id', address: '경상남도 창원시 다른길 1', destination: { latitude: 35.239, longitude: 128.691 } },
    { ...record, id: 'duplicate-id', address: '경상남도 창원시 또다른길 1', destination: { latitude: 35.240, longitude: 128.691 } },
    { ...record, id: 'duplicate-address', address: '경상남도   창원시 중앙대로 1', destination: { latitude: 35.241, longitude: 128.691 } },
    ...['a', 'b', 'c'].map((id, index) => ({ ...record, id, address: `경상남도 창원시 후보로 ${index}`, destination: { latitude: 35.242 + index / 1000, longitude: 128.691 } })),
  ];
  const ranked = rankRestroomAlternatives(values, origin);
  assert.equal(ranked.length, 3); assert.equal(ranked[0].id, 'near'); assert.equal(new Set(ranked.map(item => item.id)).size, ranked.length);
});
