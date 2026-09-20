import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSanitarySupply, rankSanitarySupplies } from '../lib/sanitary-supply.js';

const row = (id, distance = 0) => ({ id, name: `비치 장소 ${id}`, address: '경상남도 창원시 중앙대로 1', latitude: 35.22 + distance, longitude: 128.68, availableHours: '09:00~18:00', usageNote: '무료', institutionName: '창원시', referenceDate: '2026-09-01' });

test('normalizes only confirmed public fields and never invents inventory', () => {
  const value = normalizeSanitarySupply({ ...row('a'), stock: 12, userLatitude: 1 });
  assert.equal(value.name, '비치 장소 a');
  assert.equal(value.usageNote, '무료');
  assert.equal('stock' in value, false);
  assert.equal('userLatitude' in value, false);
});

test('drops records without coordinates, reference date, or Gyeongnam address', () => {
  assert.equal(normalizeSanitarySupply({ ...row('a'), latitude: '' }), null);
  assert.equal(normalizeSanitarySupply({ ...row('a'), referenceDate: '' }), null);
  assert.equal(normalizeSanitarySupply({ ...row('a'), address: '부산광역시 중구' }), null);
});

test('deduplicates, sorts by public place distance, and caps at five', () => {
  const input = Array.from({ length: 8 }, (_, index) => row(String(index), (8 - index) / 1000));
  input.push({ ...input[0] });
  const result = rankSanitarySupplies(input, { latitude: 35.22, longitude: 128.68 });
  assert.equal(result.length, 5);
  assert.ok(result.every((item, index) => index === 0 || result[index - 1].distanceMeters <= item.distanceMeters));
  assert.equal(new Set(result.map(item => `${item.name}|${item.address}`)).size, result.length);
});
