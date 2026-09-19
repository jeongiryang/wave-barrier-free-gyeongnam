import assert from 'node:assert/strict';
import test from 'node:test';
import { buildParkingContactQuestion, createParkingTelHref, isKakaoRelayOpen, normalizeParkingPhone } from '../lib/parking-contact.js';

test('parking phone normalization accepts only safe domestic and international numbers', () => {
  assert.equal(normalizeParkingPhone(' 055-123-4567 '), '0551234567');
  assert.equal(normalizeParkingPhone('(055) 123 4567'), '0551234567');
  assert.equal(normalizeParkingPhone('+82 (0)55 123-4567'), '+820551234567');
  for (const invalid of [undefined, null, 551234567, '', '1234567', '1234567890123456', '055+1234567', '055ABC4567', 'tel:0551234567', '055;1234567', '055,1234567', '055\n1234567']) {
    assert.equal(normalizeParkingPhone(invalid), null);
    assert.equal(createParkingTelHref(invalid), null);
  }
  assert.equal(createParkingTelHref('055-123-4567'), 'tel:0551234567');
});

test('contact question matches the complete Korean contract and safe fallback', () => {
  const expected = `검증 공영주차장\n전화번호: 0551234567\n\n문의:\n검증 공영주차장의 장애인전용주차구역을 이용하려고 합니다.\n현재 확인 가능한 범위에서 지금 주차할 수 있는 자리가 있나요?\n이 번호에서 현장 상황을 확인할 수 없다면 주차관리실 연락처를 알려주실 수 있나요?\n휠체어 승하차 공간을 사용할 수 있는지와 주차장에서 검증용 관광지 입구까지 계단 없는 길이 있는지도 확인 부탁드립니다.`;
  assert.equal(buildParkingContactQuestion({ parkingName: '검증 공영주차장', phoneNumber: '055-123-4567', placeName: '검증용 관광지' }), expected);
  const fallback = buildParkingContactQuestion({ parkingName: '검증 공영주차장', phoneNumber: '055-123-4567' });
  assert.match(fallback, /주차장에서 관광지 입구까지 계단 없는 길/);
  assert.doesNotMatch(fallback, /undefined|null|\(\)/);
  assert.equal(buildParkingContactQuestion({ parkingName: '검증 공영주차장', phoneNumber: 'bad' }), null);
  assert.doesNotMatch(expected, /latitude|longitude|accuracy|currentLocation|userId|trip/);
});

test('Kakao relay hours are based on Seoul time regardless of runtime timezone', () => {
  assert.equal(isKakaoRelayOpen('2026-09-15T22:59:00Z'), false);
  assert.equal(isKakaoRelayOpen(new Date('2026-09-15T23:00:00Z')), true);
  assert.equal(isKakaoRelayOpen(Date.parse('2026-09-16T14:59:00Z')), true);
  assert.equal(isKakaoRelayOpen('2026-09-16T15:00:00Z'), false);
});
