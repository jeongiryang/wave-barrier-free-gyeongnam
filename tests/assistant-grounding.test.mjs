import assert from 'node:assert/strict';
import test from 'node:test';
import { groundAssistantProposal } from '../lib/assistant-grounding.js';
import { validateAssistantAction } from '../lib/assistant-actions.js';

const context = { today: '2026-09-12', days: ['2026-09-20', '2026-09-21'], region: '통영', transport: 'walk' };
const user = content => ({ role: 'user', content });
const proposal = patch => ({ action: 'create-itinerary', region: '통영', ...patch });
const ground = (value, said, ctx = context) => groundAssistantProposal(value, Array.isArray(said) ? said : [user(said)], ctx);

test('an unspecified journey cannot inherit model defaults for festival, departure, mode or dates', () => {
  const value = proposal({ festival: 'any', originRegion: '창원', transport: 'car', start: '2027-01-01', end: '2027-01-02', date: '2026-09-20', profiles: ['wheel'] });
  const before = JSON.stringify({ value, context });
  const actual = ground(value, '통영의 휠체어 편의가 있는 관광지로 여행을 만들어줘');
  for (const field of ['festival', 'originRegion', 'transport', 'start', 'end', 'date']) assert.equal(Object.hasOwn(actual, field), false, `${field} was never requested`);
  assert.deepEqual(actual.profiles, ['wheel']);
  assert.equal(JSON.stringify({ value, context }), before);
  assert.ok(validateAssistantAction(actual));
});

test('assistant-authored dates and transport suggestions do not count as visitor instructions', () => {
  const actual = ground(proposal({ festival: 'any', originRegion: '창원', transport: 'car', start: '2026-09-22', end: '2026-09-22' }), [
    { role: 'assistant', content: '9월 22일 창원에서 자동차로 출발하고 축제를 넣어볼까요?' }, user('필요한 편의를 유지하면서 장소를 골라줘'),
  ]);
  assert.deepEqual(actual, proposal({}));
});

test('explicit visitor details from the current conversation remain available to a follow-up', () => {
  const value = proposal({ festival: 'any', originRegion: '사천', transport: 'car', start: '2026-09-20', end: '2026-09-21' });
  const actual = ground(value, [user('9월 20일부터 21일까지 사천에서 출발해 통영에 자동차로 갈 거야. 축제도 넣어줘.'), { role: 'assistant', content: '조건을 살펴볼게요.' }, user('그 조건으로 휴식도 넉넉하게 해줘')]);
  for (const field of ['festival', 'originRegion', 'transport']) assert.equal(actual[field], value[field]);
  assert.equal(actual.start || context.days[0], value.start);
  assert.equal(actual.end || context.days.at(-1), value.end);
});

test('an explicitly requested ISO period is retained without changing its actual dates', () => {
  const value = proposal({ start: '2026-09-20', end: '2026-09-21' });
  assert.deepEqual(ground(value, '2026-09-20부터 2026-09-21까지 여행할 거야'), value);
});

test('an explicit calendar date does not authorize a different model-supplied date', () => {
  for (const said of ['2026-09-20 하루만 여행할 거야', '9월 20일 하루만 여행할 거야']) {
    const actual = ground(proposal({ start: '2027-01-01', end: '2027-01-01' }), said);
    assert.notEqual(actual.start, '2027-01-01', said);
    assert.notEqual(actual.end, '2027-01-01', said);
  }
});

test('an earlier explicit period cannot authorize unrelated dates in a follow-up proposal', () => {
  const actual = ground(proposal({ start: '2027-01-01', end: '2027-01-02' }), [user('2026-09-20부터 2026-09-21까지 여행할래'), user('그 조건으로 휴식을 넉넉하게 해줘')]);
  assert.equal(actual.start || context.days[0], context.days[0]);
  assert.equal(actual.end || context.days.at(-1), context.days.at(-1));
});

test('Korean calendar dates remain grounded while unspecified context is not mutated', () => {
  const value = proposal({ start: '2026-09-20', end: '2026-09-21' });
  assert.deepEqual(ground(value, '9월 20일에 출발해서 9월 21일까지 여행해'), value);
  assert.deepEqual(context.days, ['2026-09-20', '2026-09-21']);
});

test('an unspecified day trip keeps the existing first day instead of the model invented date', () => {
  const value = proposal({ start: '2027-01-01', end: '2027-01-01' });
  for (const said of ['당일치기 여행으로 만들어줘', '이번 여행은 당일치기로 줄여줘']) {
    const actual = ground(value, said);
    assert.equal(actual.start, context.days[0], said);
    assert.equal(actual.end, context.days[0], said);
  }
});

test('a new day-trip instruction supersedes the earlier multi-day period without moving its first day', () => {
  const actual = ground(proposal({ start: context.days[0], end: context.days[1] }), [user('9월 20일부터 21일까지 여행할래'), user('그 여행을 당일치기로 줄여줘')]);
  assert.equal(actual.start, context.days[0]);
  assert.equal(actual.end, context.days[0]);
});

test('a duration or conversational this-time wording is not an explicit calendar date', () => {
  for (const said of ['1박 2일 여행을 만들어줘', '2일 동안 쉬엄쉬엄 돌아보고 싶어', '이번에는 실내 여행으로 바꿔줘']) {
    const actual = ground(proposal({ start: '2027-01-01', end: '2027-01-02' }), said);
    assert.equal(actual.start || context.days[0], context.days[0], said);
    assert.equal(actual.end || context.days.at(-1), context.days.at(-1), said);
  }
});

test('an unrequested adaptation date cannot silently restrict a whole-trip fatigue adjustment', () => {
  const actual = ground({ action: 'adapt-itinerary', reason: 'fatigue', date: context.days[0] }, '많이 피곤해서 전체 일정을 여유롭게 줄여줘');
  assert.equal(Object.hasOwn(actual, 'date'), false);
});

test('an explicit second-day adjustment preserves the corresponding existing date', () => {
  const value = { action: 'adapt-itinerary', reason: 'fatigue', date: context.days[1] };
  assert.deepEqual(ground(value, '둘째 날은 피곤할 것 같으니 쉬엄쉬엄 바꿔줘'), value);
});

test('the requested destination cannot become the departure just because both names were mentioned', () => {
  const said = '사천에서 출발해서 통영으로 여행 갈 거야';
  assert.equal(ground(proposal({ originRegion: '사천' }), said).originRegion, '사천');
  assert.notEqual(ground(proposal({ originRegion: '통영' }), said).originRegion, '통영');
});

test('mentioning a different transport mode does not ground an invented car journey', () => {
  const actual = ground(proposal({ transport: 'car' }), '대중교통으로 이동할 거야');
  assert.notEqual(actual.transport, 'car');
  assert.equal(ground(proposal({ transport: 'transit' }), '대중교통으로 이동할 거야').transport, 'transit');
});

test('a later explicit mode correction supersedes the earlier visitor preference', () => {
  const said = [user('자동차로 여행할게'), { role: 'assistant', content: '자동차 경로를 살펴볼게요.' }, user('아니, 자동차는 빼고 대중교통으로 갈게')];
  assert.notEqual(ground(proposal({ transport: 'car' }), said).transport, 'car');
});

test('a later exclusion cannot resurrect the earlier transport mode when no replacement was named', () => {
  const actual = ground(proposal({ transport: 'car' }), [user('자동차로 여행할게'), user('자동차는 빼줘')]);
  assert.notEqual(actual.transport, 'car');
});

test('a general festival request permits any but cannot invent a specific named event', () => {
  assert.equal(ground(proposal({ festival: 'any' }), '열리는 축제도 하나 넣어줘').festival, 'any');
  const actual = ground(proposal({ festival: '합성 가을미술축제' }), '열리는 축제도 하나 넣어줘');
  assert.ok(!actual.festival || actual.festival === 'any');
});

test('a specifically named event does not require the literal generic festival word', () => {
  assert.equal(ground(proposal({ festival: '진해군항제' }), '진해군항제를 중심으로 여행을 만들어줘').festival, '진해군항제');
});

test('an explicit exclusion does not turn into a required festival search', () => {
  assert.equal(Object.hasOwn(ground(proposal({ festival: 'any' }), '축제는 빼고 조용한 관광지만 가고 싶어'), 'festival'), false);
});

test('ordinary tool proposals are copied without being reinterpreted as journey preparation', () => {
  const value = { action: 'day', date: context.days[1] };
  const actual = ground(value, '둘째 날 보여줘');
  assert.deepEqual(actual, value); assert.notEqual(actual, value);
});

test('weekday and next-weekend requests use a Monday-based Korean calendar, including Sunday', () => {
  const sunday = { ...context, today: '2026-09-13' };
  for (const [content, start, end] of [
    ['다음 주 월요일부터 수요일까지 여행', '2026-09-14', '2026-09-16'],
    ['다음 주말 여행', '2026-09-19', '2026-09-20'],
    ['이번 주말 당일 여행', '2026-09-13', '2026-09-13'],
    ['다다음 주 금요일 여행', '2026-09-25', '2026-09-25'],
  ]) {
    const result = groundAssistantProposal({ action: 'create-itinerary' }, [user(content)], sunday);
    assert.equal(result.start, start, content); assert.equal(result.end, end, content);
  }
});
