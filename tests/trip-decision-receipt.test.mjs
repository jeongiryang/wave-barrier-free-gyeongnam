import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTripDecisionReceipt, tripDecisionReceiptText } from '../lib/trip-decision-receipt.js';
import { localAssistantAction, validateAssistantAction } from '../lib/assistant-actions.js';

const places = [{
  id: '1001', name: '경남도립미술관', source: '한국관광공사 무장애 여행정보', checkedAt: '2026-09-14T09:00:00Z',
  accessibility: [
    { key: 'route', label: '접근로', state: 'confirmed', detail: '주출입구까지 평탄한 접근로' },
    { key: 'restroom', label: '장애인 화장실', state: 'negative', detail: '제공 자료에 장애인 화장실 없음으로 표시' },
    { key: 'parking', label: '장애인 주차구역', state: 'invented', detail: '신뢰할 수 없는 상태' },
  ],
}];

test('decision receipt preserves explicit facility states and never fills missing evidence', () => {
  const receipt = buildTripDecisionReceipt({ region: '창원', theme: '문화', travelStart: '2026-09-20', travelEnd: '2026-09-20', travelMode: '자동차', requiredKeys: ['route', 'restroom', 'elevator', 'route', 'invalid'], places, routes: [{ day: '2026-09-20', from: '창원역', to: '경남도립미술관', state: 'confirmed', provider: 'Kakao Mobility', minutes: 18 }] });
  assert.deepEqual(receipt.criteria.facilities.map(item => item.key), ['route', 'restroom', 'elevator']);
  assert.deepEqual(receipt.places[0].evidence.map(item => item.state), ['confirmed', 'negative', 'unknown']);
  assert.deepEqual(receipt.totals, { places: 1, requirements: 3, confirmed: 1, negative: 1, unknown: 1, routes: 1, confirmedRoutes: 1 });
});

test('downloaded receipt contains traceable sources, unknowns and the route limitation', () => {
  const receipt = buildTripDecisionReceipt({ region: '창원', requiredKeys: ['route', 'restroom'], places, routes: [{ day: '2026-09-20', from: '기기 안 출발지', to: '경남도립미술관', state: 'private' }] });
  const text = tripDecisionReceiptText(receipt, '2026-09-14T10:00:00Z');
  assert.match(text, /관광 콘텐츠 ID 1001/); assert.match(text, /한국관광공사 무장애 여행정보/);
  assert.match(text, /장애인 화장실: 없음으로 확인/); assert.match(text, /기기 안 출발지 · 외부 조회 안 함/);
  assert.match(text, /휠체어 통행, 경사, 엘리베이터 운영을 보장하지 않습니다/);
  assert.doesNotMatch(text, /안심 점수|100점|안전 보장/);
});

test('Naru opens the same receipt for requests about itinerary reasoning', () => {
  assert.deepEqual(localAssistantAction('왜 이 일정이 추천됐는지 근거를 알려줘'), { action: 'tool', tool: 'receipt' });
  assert.deepEqual(validateAssistantAction({ action: 'tool', tool: 'receipt', url: 'https://untrusted.example' }), { action: 'tool', tool: 'receipt' });
});
