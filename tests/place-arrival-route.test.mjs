import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { WHEELCHAIR_ROUTE_DISCLAIMER, WHEELCHAIR_ROUTE_STATE_TEXT, wheelchairRouteStateText } from '../lib/wheelchair-route-info.js';

// 스펙 13의 대체 설계(2단계): 공공데이터포털에서 경남 표본이 있는 무장애 보행로
// OpenAPI를 찾지 못해(docs/ai-logs/spec-13-wheelchair-route-layer.md 참고), 지도에
// 구간을 그리는 대신 이미 있는 `route` 필드를 이동 관점으로 다시 묶어 보여준다.
// 경로가 조회됐다는 사실이 통행 가능을 뜻하지 않으므로(CLAUDE.md), confirmed/
// negative/unknown 세 문구가 서로 다르고, "미확인"이 "없음"으로 읽히지 않으며,
// 통행 가능 여부를 뜻하는 불리언이 없는지 확인한다.

test('the three route-field phrases are distinct and never claim passability', () => {
  const phrases = Object.values(WHEELCHAIR_ROUTE_STATE_TEXT);
  assert.equal(new Set(phrases).size, phrases.length);
  for (const phrase of phrases) assert.doesNotMatch(phrase, /통행\s*가능|이용\s*가능/);
  assert.equal(wheelchairRouteStateText('confirmed'), '출입구까지 접근로가 등록돼 있어요.');
  assert.equal(wheelchairRouteStateText('negative'), '접근로가 없다고 등록돼 있어요.');
  assert.equal(wheelchairRouteStateText('unknown'), '접근로 정보가 등록돼 있지 않아요.');
});

test('an absent or unrecognised value reads as "unknown", never as "negative" (unconfirmed is not absence)', () => {
  assert.equal(wheelchairRouteStateText(undefined), WHEELCHAIR_ROUTE_STATE_TEXT.unknown);
  assert.equal(wheelchairRouteStateText('something-else'), WHEELCHAIR_ROUTE_STATE_TEXT.unknown);
});

test('the disclaimer is always the same fixed sentence and never asserts step-free access', () => {
  assert.equal(WHEELCHAIR_ROUTE_DISCLAIMER, '주차장에서 입구까지의 계단 없는 길은 확인되지 않았어요.');
  assert.doesNotMatch(WHEELCHAIR_ROUTE_DISCLAIMER, /계단\s*없이\s*이동할 수 있어요|통행\s*가능/);
});

test('the module carries no passability boolean field and stays free of network/storage/location access', () => {
  const source = readFileSync(new URL('../lib/wheelchair-route-info.js', import.meta.url), 'utf8');
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator', 'geolocation', 'passable', 'wheelchairAccessible']) {
    assert.ok(!source.includes(forbidden), `lib/wheelchair-route-info.js 가 ${forbidden} 를 참조하면 안 된다`);
  }
});
