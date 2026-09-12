import assert from 'node:assert/strict';
import test from 'node:test';
import { groundAssistantProposal } from '../lib/assistant-grounding.js';
import { validateAssistantAction } from '../lib/assistant-actions.js';

const day = '2026-09-20';
const context = { today: '2026-09-13', days: [day], region: '', savedIds: [], places: [], profiles: 'wheel', transport: 'transit' };
const request = '부모님이 오래 걷기 힘들어. 창원에서 출발해서 당일치기로 여행하고 싶어.';
const ground = (proposal, text = request, ctx = context) => groundAssistantProposal(proposal, typeof text === 'string' ? [{ role: 'user', content: text }] : text, ctx);

test('the real low-burden day-trip request searches its explicit origin instead of a model-default distant city', () => {
  const before = JSON.stringify(context);
  for (const region of [undefined, '경남 전체', '양산']) {
    const action = { action: 'create-itinerary', ...(region ? { region } : {}), originRegion: '창원', transport: 'car' };
    const result = ground(action);
    assert.equal(result.region, '창원'); assert.equal(result.originRegion, '창원');
    assert.deepEqual(result.profiles, ['senior']);
    assert.equal(Object.hasOwn(result, 'transport'), false, 'the user never requested a car');
    assert.equal(result.start || context.days[0], day); assert.equal(result.end || context.days.at(-1), day);
    assert.ok(validateAssistantAction(result));
    assert.equal(action.region, region, 'do not mutate the model object');
  }
  assert.equal(JSON.stringify(context), before, 'existing facilities and transport remain unchanged');
});

test('a directly stated origin remains available even if the model omitted it', () => {
  const actual = ground({ action: 'create-itinerary', region: '양산' }, '창원에서 출발해 당일 여행을 여유롭게 만들어줘.');
  assert.equal(actual.region, '창원'); assert.equal(actual.originRegion, '창원');
  assert.equal(Object.hasOwn(actual, 'profiles'), false, 'a relaxed preference does not imply a disability');
});

test('an explicit different destination is preserved, including a destination from the same conversation', () => {
  for (const text of [
    '부모님이 오래 걷기 힘들어. 창원에서 출발해서 진주로 당일치기 여행하고 싶어.',
    '부모님이 오래 걷기 힘들어. 창원에서 출발해서 진주성을 당일치기로 둘러보고 싶어.',
    [{ role: 'user', content: '진주로 여행할 거야.' }, { role: 'user', content: request }],
  ]) {
    const result = ground({ action: 'create-itinerary', region: '진주', originRegion: '창원' }, text);
    assert.equal(result.region, '진주'); assert.equal(result.originRegion, '창원');
  }
});

test('an explicit unsupported destination cannot silently become Changwon or a Gyeongnam-wide search', () => {
  const text = '부모님이 오래 걷기 힘들어. 창원에서 출발해서 부산으로 당일치기 여행하고 싶어.';
  for (const region of [undefined, '경남 전체', '부산']) {
    assert.equal(ground({ action: 'create-itinerary', originRegion: '창원', ...(region ? { region } : {}) }, text), null);
  }
});

test('unknown named destinations and origin-name substrings do not authorize the local default', () => {
  const text = '부모님이 오래 걷기 힘들어. 창원에서 출발해서 오월드로 당일 여행하고 싶어.';
  assert.equal(ground({ action: 'create-itinerary', region: '경남 전체', originRegion: '창원' }, text).region, '경남 전체');
  assert.equal(ground({ action: 'create-itinerary', region: '양산' }, '부모님이 오래 걷기 힘들어. 효창원에서 출발해서 당일치기 여행하고 싶어.').region, '양산');
  assert.equal(ground({ action: 'create-itinerary', region: '양산' }, `${request} 경기장도 둘러보고 싶어.`).region, '창원', '경기장 is not a destination in 경기도');
});

test('selected destinations and existing or adapted itineraries do not receive a new origin-region default', () => {
  for (const ctx of [{ ...context, region: '진주' }, { ...context, savedIds: ['1001'] }, { ...context, stops: [{ id: '1001', date: day }] }]) {
    const result = ground({ action: 'create-itinerary', originRegion: '창원' }, request, ctx);
    assert.equal(Object.hasOwn(result, 'region'), false);
  }
  assert.equal(ground({ action: 'adapt-itinerary', region: '진주', originRegion: '창원' }).region, '진주');
});

test('a multi-day period or explicit multi-day intent is not constrained to the departure city', () => {
  for (const [text, ctx] of [
    ['부모님이 오래 걷기 힘들어. 창원에서 출발해서 2박 3일 여행하고 싶어.', context],
    ['부모님이 오래 걷기 힘들어. 창원에서 출발해서 여유롭게 여행하고 싶어.', { ...context, days: [day, '2026-09-21'] }],
    ['부모님이 오래 걷기 힘들어. 창원에서 출발해서 9월 20일부터 22일까지 여행하고 싶어.', context],
  ]) assert.equal(ground({ action: 'create-itinerary', region: '양산', originRegion: '창원' }, text, ctx).region, '양산');
});

test('only a current positive low-burden request and one explicit departure authorize the default', () => {
  for (const text of [
    '부모님과 창원에서 출발해서 당일치기 여행하고 싶어.',
    '부모님이 오래 걷기 힘들지 않아. 창원에서 출발해서 당일치기로 여행하고 싶어.',
    '부모님이 오래 걷기 힘들어. 창원에서 출발하지 않고 당일치기로 여행하고 싶어.',
    '부모님이 오래 걷기 힘들어. 창원에서 출발 안 할 거야. 당일치기로 여행하고 싶어.',
    '부모님이 오래 걷기 힘들어. 창원에서 출발할까?',
    [{ role: 'user', content: request }, { role: 'user', content: '당일 여행 코스 만들어줘.' }],
    [{ role: 'assistant', content: request }, { role: 'user', content: '당일 여행 코스 만들어줘.' }],
  ]) assert.equal(ground({ action: 'create-itinerary', region: '양산', originRegion: '창원', pace: 'relaxed' }, text)?.region, '양산');
});

test('the safer search default preserves explicitly requested transport and does not add route guarantees', () => {
  const result = ground({ action: 'create-itinerary', originRegion: '창원', profiles: ['wheel'], transport: 'car' }, `${request} 대중교통으로 이동할 거야.`);
  assert.equal(result.region, '창원'); assert.equal(result.transport, 'transit');
  assert.deepEqual(result.profiles, ['wheel', 'senior']);
  assert.ok(Object.keys(result).every(key => ['action', 'region', 'originRegion', 'profiles', 'transport'].includes(key)));
});
