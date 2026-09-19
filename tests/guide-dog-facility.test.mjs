import assert from 'node:assert/strict';
import test from 'node:test';
import { FACILITIES, facilityLabel } from '../lib/facility-selection.js';
import { profileFields } from '../server/tourism/catalog.ts';
import { accessibilityFieldState } from '../lib/accessibility-score.js';
import { GUIDE_DOG_LEGAL_NOTE, GUIDE_DOG_STATE_TEXT, guideDogLegalNote, guideDogStateText } from '../lib/guide-dog-facility.js';
import { derivedFacilityLayers, facilityLayers } from '../features/routing/constants.ts';

// 스펙 20: 안내견 동반은 법으로 보장되는 권리이므로 "동반 불가"라고 단정하지
// 않는다. 세 상태 문구가 서로 다르고 "불가"라는 낱말을 쓰지 않는지, negative와
// unknown 아래에 법 안내 한 줄이 붙는지 확인한다. 새 제공처를 붙이지 않으므로
// `helpdog`가 이미 `FACILITIES`와 `profileFields`에 있는지도 함께 확인한다.

test('helpdog is already wired into FACILITIES and profileFields (no new provider needed)', () => {
  assert.ok(FACILITIES.some((item) => item.key === 'helpdog'));
  assert.equal(facilityLabel('helpdog'), '안내견 동반');
  assert.ok(Array.isArray(profileFields.helpdog));
  assert.deepEqual(profileFields.helpdog, [['helpdog', '안내견 동반']]);
});

test('the three state phrases are distinct and never claim "불가"', () => {
  const phrases = Object.values(GUIDE_DOG_STATE_TEXT).map((entry) => entry.ko);
  assert.equal(new Set(phrases).size, phrases.length);
  for (const phrase of phrases) assert.doesNotMatch(phrase, /불가/);
  assert.equal(guideDogStateText('confirmed'), '안내견 동반이 등록돼 있어요.');
  assert.equal(guideDogStateText('negative'), '안내견 동반이 없다고 등록돼 있어요. 등록 내용과 실제 응대가 다를 수 있어요.');
  assert.equal(guideDogStateText('unknown'), '안내견 동반 정보가 등록돼 있지 않아요.');
});

test('an unrecognised state falls back to "unknown", never to a negative reading', () => {
  assert.equal(guideDogStateText('missing-state'), GUIDE_DOG_STATE_TEXT.unknown.ko);
});

test('the legal notice never cites a statute number or penalty, and is the same for negative and unknown', () => {
  assert.equal(guideDogLegalNote(), '장애인 보조견 동반은 법으로 보장돼 있어요. 방문 전에 확인하면 더 편해요.');
  assert.doesNotMatch(GUIDE_DOG_LEGAL_NOTE.ko, /제\s*\d+\s*조|\d+\s*항|벌금|과태료|징역/);
});

test('English copy mirrors the Korean phrasing without claiming availability negatively', () => {
  assert.equal(guideDogStateText('confirmed', true), 'Guide dog access is registered.');
  assert.equal(guideDogStateText('negative', true), 'It is registered as not offering guide dog access. The actual response on site may differ from this record.');
  assert.equal(guideDogStateText('unknown', true), 'No guide dog access information is registered.');
});

test('the 11번 map panel gets a derived layer that keys off helpdog, with no new server call', () => {
  const layer = derivedFacilityLayers.find((item) => item.id === 'helpdog-confirmed');
  assert.ok(layer, 'a derived layer for confirmed guide-dog access must be registered');
  assert.equal(layer.source, 'derived');
  assert.equal(layer.derivedKey, 'helpdog');
  assert.equal(layer.action, undefined, 'derived layers must not carry a server action');
  assert.ok(facilityLayers.includes(layer), 'the derived layer must be part of the combined facilityLayers list');
});

test('accessibilityFieldState rules are reused unmodified for the helpdog field', () => {
  assert.equal(accessibilityFieldState('보유'), 'confirmed');
  assert.equal(accessibilityFieldState('없음'), 'negative');
  assert.equal(accessibilityFieldState(''), 'unknown');
  assert.equal(accessibilityFieldState('정보 없음'), 'unknown');
});
