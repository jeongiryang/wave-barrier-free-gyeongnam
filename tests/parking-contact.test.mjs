import assert from 'node:assert/strict';
import test from 'node:test';
import { buildParkingContactContent, isKakaoRelayOpen, normalizeParkingPhone } from '../lib/parking-contact.js';

test('parking phone normalization permits only a leading plus and 8 to 15 digits', () => {
  assert.equal(normalizeParkingPhone('055-123-4567'), '0551234567');
  assert.equal(normalizeParkingPhone('+82 (0)55 123 4567'), '+820551234567');
  for (const invalid of ['', '123', 'javascript:alert(1)', '055-123-4567 ext 123456']) assert.equal(normalizeParkingPhone(invalid), '');
});

test('contact content is natural Korean and excludes missing or unsafe fields', () => {
  const complete = buildParkingContactContent({ parkingName: '검증 공영주차장', phoneNumber: '055-123-4567', placeName: '검증용 관광지' });
  assert.equal(complete.phoneNumber, '0551234567');
  assert.match(complete.inquiryText, /^검증 공영주차장\n전화번호: 0551234567\n\n문의:/);
  assert.match(complete.inquiryText, /주차장에서 검증용 관광지 입구까지 계단 없는 길/);

  const fallback = buildParkingContactContent({ parkingName: '', phoneNumber: 'bad', placeName: '' });
  assert.equal(fallback.phoneNumber, undefined);
  assert.match(fallback.inquiryText, /주차장에서 관광지 입구까지 계단 없는 길/);
  assert.doesNotMatch(fallback.inquiryText, /undefined|null|전화번호:/);
  assert.deepEqual(Object.keys(fallback).sort(), ['inquiryText', 'parkingName', 'phoneNumber'].sort());
  assert.doesNotMatch(JSON.stringify(fallback), /latitude|longitude|accuracy|user/i);
});

test('Kakao relay hours use Seoul time with exact boundaries', () => {
  assert.equal(isKakaoRelayOpen(new Date('2026-09-15T22:59:00Z')), false); // 07:59 KST
  assert.equal(isKakaoRelayOpen(new Date('2026-09-15T23:00:00Z')), true);  // 08:00 KST
  assert.equal(isKakaoRelayOpen(new Date('2026-09-16T14:59:00Z')), true);  // 23:59 KST
  assert.equal(isKakaoRelayOpen(new Date('2026-09-16T15:00:00Z')), false); // 00:00 KST
});
