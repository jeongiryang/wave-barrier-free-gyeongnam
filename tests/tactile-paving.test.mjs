import assert from 'node:assert/strict';
import test from 'node:test';
import { FACILITIES, facilityLabel } from '../lib/facility-selection.js';
import { profileFields } from '../server/tourism/catalog.ts';
import { accessibilityFieldState } from '../lib/accessibility-score.js';
import { TACTILE_PAVING_STATE_TEXT, tactilePavingScopeNote, tactilePavingStateText } from '../lib/tactile-paving-facility.js';
import { derivedFacilityLayers, facilityLayers } from '../features/routing/constants.ts';

// 스펙 14: 점자블록은 이미 `KorWithService2/detailWithTour2`가 주는 필드다.
// 새 제공처를 붙이지 않으므로 `braileblock`이 이미 `FACILITIES`와
// `profileFields`에 있는지, 세 상태 문구가 서로 다르고 미확인이 없음으로
// 바뀌지 않는지, 파생 레이어가 새 서버 action 없이 등록됐는지를 확인한다.

test('braileblock is already wired into FACILITIES and profileFields (no new provider needed)', () => {
  assert.ok(FACILITIES.some((item) => item.key === 'braileblock'));
  assert.equal(facilityLabel('braileblock'), '점자블록');
  assert.ok(Array.isArray(profileFields.visual));
  assert.ok(profileFields.visual.some(([key]) => key === 'braileblock'));
});

test('the three state phrases are distinct and unknown never reads as "없음" (absence)', () => {
  const phrases = Object.values(TACTILE_PAVING_STATE_TEXT).map((entry) => entry.ko);
  assert.equal(new Set(phrases).size, phrases.length);
  assert.equal(tactilePavingStateText('confirmed'), '점자블록 있음');
  assert.equal(tactilePavingStateText('negative'), '점자블록 없음');
  assert.equal(tactilePavingStateText('unknown'), '점자블록 정보 없음');
  // unknown과 negative는 서로 다른 문구여야 하고, unknown 문구에는 "정보"라는
  // 낱말이 들어가 없음과 구분된다.
  assert.notEqual(tactilePavingStateText('unknown'), tactilePavingStateText('negative'));
  assert.match(tactilePavingStateText('unknown'), /정보/);
});

test('an unrecognised state falls back to "unknown", never to a negative reading', () => {
  assert.equal(tactilePavingStateText('missing-state'), TACTILE_PAVING_STATE_TEXT.unknown.ko);
});

test('the scope note always distinguishes attraction-level data from surrounding sidewalks', () => {
  assert.equal(tactilePavingScopeNote(), '관광지에 등록된 정보예요. 주변 보도의 점자블록은 확인되지 않았어요.');
  assert.equal(tactilePavingScopeNote(true), 'This is information registered for the attraction. Tactile paving on nearby sidewalks has not been checked.');
});

test('English copy mirrors the Korean phrasing', () => {
  assert.equal(tactilePavingStateText('confirmed', true), 'Tactile paving present');
  assert.equal(tactilePavingStateText('negative', true), 'Tactile paving not present');
  assert.equal(tactilePavingStateText('unknown', true), 'No tactile paving information');
});

test('the 11번 map panel gets a derived layer that keys off braileblock, with no new server call', () => {
  const layer = derivedFacilityLayers.find((item) => item.id === 'braileblock-confirmed');
  assert.ok(layer, 'a derived layer for confirmed tactile paving must be registered');
  assert.equal(layer.source, 'derived');
  assert.equal(layer.derivedKey, 'braileblock');
  assert.equal(layer.action, undefined, 'derived layers must not carry a server action');
  assert.ok(facilityLayers.includes(layer), 'the derived layer must be part of the combined facilityLayers list');
});

test('accessibilityFieldState rules are reused unmodified for the braileblock field', () => {
  assert.equal(accessibilityFieldState('보유'), 'confirmed');
  assert.equal(accessibilityFieldState('없음'), 'negative');
  assert.equal(accessibilityFieldState(''), 'unknown');
  assert.equal(accessibilityFieldState('정보 없음'), 'unknown');
});
