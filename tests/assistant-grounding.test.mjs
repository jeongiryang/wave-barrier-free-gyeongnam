import assert from 'node:assert/strict';
import test from 'node:test';
import { groundAssistantProposal } from '../lib/assistant-grounding.js';
import { validateAssistantAction } from '../lib/assistant-actions.js';

const context = { today: '2026-09-12', days: ['2026-09-20', '2026-09-21'], region: '통영', transport: 'walk' };
const user = content => ({ role: 'user', content });
const proposal = patch => ({ action: 'create-itinerary', region: '통영', ...patch });
const ground = (value, said, ctx = context) => groundAssistantProposal(value, Array.isArray(said) ? said : [user(said)], ctx);

test('fatigue today does not move a saved future period to today', () => {
  const actual = ground({ action: 'adapt-itinerary', reason: 'fatigue', pace: 'relaxed', start: context.today, end: context.today }, '오늘 피곤해. 방문 수를 줄이고 쉬는 시간을 늘려줘');
  assert.equal(actual.start, undefined); assert.equal(actual.end, undefined);
  assert.equal(actual.reason, 'fatigue');
  const second = ground({ action: 'adapt-itinerary', start: context.days[1], end: context.days[1], reason: 'rain' }, '9월 21일에 비가 온대. 실내로 바꿔줘');
  assert.equal(second.date, context.days[1]); assert.equal(second.start, undefined); assert.equal(second.end, undefined);
});

test('the exact whole-trip relaxation follow-up preserves a model adaptation and existing trip state', () => {
  const ctx = {
    ...context, today: '2026-09-27', days: ['2026-09-29'], transport: 'car',
    savedIds: ['1622623', '753302', '229904'],
    places: [{ id: '1622623', name: '통영시립도서관' }, { id: '753302', name: '강구안' }, { id: '229904', name: '청마문학관' }],
    stops: [{ placeId: '1622623', date: '2026-09-29', minutes: 120 }],
    fixedVisits: { '1622623': { kind: 'visit', position: 0, time: '' } },
  };
  const value = { action: 'adapt-itinerary', pace: 'relaxed', reason: 'change', start: '2027-01-01', end: '2027-01-01' };
  const before = JSON.stringify({ value, ctx });
  const text = '담은 장소와 기존 날짜, 고정 방문은 모두 유지하고 더 여유롭게 휴식과 동선을 조정해줘';
  for (const said of [text, [user('2026-09-29 통영 당일 여행을 자동차로 준비해줘'), user(text)]]) {
    const actual = ground(value, said, ctx);
    assert.equal(actual?.action, 'adapt-itinerary');
    assert.equal(actual.pace, 'relaxed');
    assert.equal(actual.reason, 'change');
    assert.equal(actual.start, undefined); assert.equal(actual.end, undefined);
    assert.ok(actual.date === undefined || actual.date === ctx.days[0]);
    assert.ok(validateAssistantAction(actual));
  }
  assert.equal(JSON.stringify({ value, ctx }), before);
});

test('preserved dates do not make an unrelated rest or route change a date edit', () => {
  const value = { action: 'adapt-itinerary', pace: 'relaxed', reason: 'change' };
  for (const text of [
    '기존날짜유지하고 휴식을늘려줘',
    '날짜는 유지하고 휴식을 늘려줘',
    '여행 기간은 그대로 유지하며 휴식을 늘려줘',
    '날짜와 고정 방문은 모두 유지하면서 동선을 조정해줘',
    '날짜와 기간은 보존하고 휴식을 늘려줘',
    '날짜별로 휴식과 동선을 조정해줘',
    '기존 날짜 기준으로 동선을 조정해줘',
  ]) {
    assert.deepEqual(ground(value, text), value, text);
  }
});

test('preservation wording does not bypass negative, questioning or actual mixed date edits', () => {
  for (const text of [
    '기존 날짜는 유지하고 휴식을 늘리지 마',
    '기존 날짜는 유지하고 휴식을 늘려도 될까?',
    '여행 날짜를 내일로 바꾸지 마',
    '여행 날짜를 내일로 바꿀까?',
    '날짜를 바꾸고 장소는 유지하고 휴식을 늘려줘',
    '날짜를 내일로 바꿔주고 장소도 바꿔줘',
    '날짜를 내일로 바꿔줘. 장소도 바꿔줘',
    '날짜는 유지하고 여행 기간은 3일로 늘리고 장소도 바꿔줘',
    '날짜는 유지하고 휴식을 늘려줘. 날짜는 내일로 바꿔줘',
    '날짜를 유지하고 싶지 않아. 내일로 바꿔줘',
    '여행 날짜를 정해줘',
    '여행날짜를정해줘',
    '날짜를 정해주고 장소도 바꿔줘',
    '장소를 바꾸고 날짜를내일로정해줘',
  ]) {
    for (const action of ['adapt-itinerary', 'create-itinerary', 'set-dates']) {
      assert.equal(ground({ action, pace: 'relaxed', start: '2027-01-01', end: '2027-01-01' }, text), null, `${action}: ${text}`);
    }
  }
});

test('explicit date assignments still use only the requested date, including compact Korean', () => {
  for (const text of ['여행 날짜를 내일로 정해줘', '날짜를내일로정해줘', '내일로날짜를정해줘']) {
    assert.deepEqual(ground({ action: 'adapt-itinerary', pace: 'relaxed' }, text), {
      action: 'set-dates', start: '2026-09-13', end: '2026-09-13',
    }, text);
  }
});

test('a general relaxation request cannot invent a named break or an absent model action', () => {
  const text = '담은 장소와 기존 날짜, 고정 방문은 모두 유지하고 더 여유롭게 휴식과 동선을 조정해줘';
  const ctx = { ...context, savedIds: ['1622623'], places: [{ id: '1622623', name: '통영시립도서관' }] };
  for (const action of ['visit', 'break']) {
    assert.equal(ground({ action, placeId: '1622623', minutes: 30 }, text, ctx), null, action);
  }
  assert.equal(ground(null, text, ctx), null);
});

test('date preservation cannot authorize a model date change or a replacement itinerary', () => {
  for (const text of [
    '담은 장소와 기존 날짜, 고정 방문은 모두 유지하고 더 여유롭게 휴식과 동선을 조정해줘',
    '날짜는 유지하고 휴식을 늘려줘',
    '기존날짜유지하고 휴식을늘려줘',
    '날짜는 유지하고 날짜만 내일로 바꿔줘',
  ]) {
    for (const action of ['set-dates', 'create-itinerary']) {
      assert.equal(ground({ action, start: '2027-01-01', end: '2027-01-02' }, text), null, `${action}: ${text}`);
    }
  }
  assert.equal(ground({ action: 'adapt-itinerary' }, '날짜는 유지하고 날짜만 내일로 바꿔줘'), null);
});

test('a preserved whole-trip adaptation cannot restore historical dates after direct editing', () => {
  const ctx = { ...context, days: ['2026-09-29'], savedIds: ['1622623'] };
  const value = { action: 'adapt-itinerary', pace: 'relaxed', reason: 'change', start: '2027-01-01', end: '2027-01-01', date: '2027-01-01' };
  const before = JSON.stringify({ value, ctx });
  for (const text of ['날짜는 유지하고 휴식을 늘려줘', '기존날짜유지하고 휴식을늘려줘']) {
    const actual = ground(value, [user('2026-09-20부터 2026-09-21까지 통영 여행을 만들어줘'), user(text)], ctx);
    assert.deepEqual(actual, { action: 'adapt-itinerary', pace: 'relaxed', reason: 'change' }, text);
  }
  assert.equal(JSON.stringify({ value, ctx }), before);
});

test('an unspecified journey cannot inherit model defaults for festival, departure, mode or dates', () => {
  const value = proposal({ festival: 'any', originRegion: '창원', transport: 'car', start: '2027-01-01', end: '2027-01-02', date: '2026-09-20', profiles: ['wheel'] });
  const before = JSON.stringify({ value, context });
  const actual = ground(value, '통영의 접근로가 있는 관광지로 여행을 만들어줘');
  for (const field of ['festival', 'originRegion', 'transport', 'start', 'end', 'date']) assert.equal(Object.hasOwn(actual, field), false, `${field} was never requested`);
  assert.deepEqual(actual.profiles, ['route']);
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
  assert.notEqual(ground(proposal({ transport: 'car' }), said)?.transport, 'car');
});

test('a later exclusion cannot resurrect the earlier transport mode when no replacement was named', () => {
  const actual = ground(proposal({ transport: 'car' }), [user('자동차로 여행할게'), user('자동차는 빼줘')]);
  assert.equal(actual, null, 'an exclusion alone does not authorize any itinerary mutation');
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


test('real local-model search omissions are repaired from explicit current criteria only', () => {
  assert.deepEqual(ground({ action: 'search' }, '진주 지역으로 찾아줘.'), { action: 'settings', region: '진주' });
  assert.deepEqual(ground({ action: 'search' }, '장애인 화장실이 있는 여행지를 찾아줘.', { ...context, profiles: ['route'] }), { action: 'settings', profiles: ['route', 'restroom'] });
  assert.deepEqual(ground({ action: 'search' }, '사천에서 출발해서 진주의 박물관을 찾아줘.'), { action: 'settings', region: '진주', themes: ['history'] });
  for (const text of ['아이와 같이 갈 장소를 찾아줘.', '부모님과 갈 곳을 찾아줘.', '장애인 화장실은 필요 없는 여행지를 찾아줘.', '진주로 바꾸지 마.']) {
    assert.deepEqual(ground({ action: 'search' }, text), { action: 'search' }, text);
  }
  assert.deepEqual(ground({ action: 'search' }, [{ role: 'assistant', content: '진주에 장애인 화장실이 있는 곳을 찾아볼까요?' }, user('현재 조건으로 찾아줘')]), { action: 'search' });
});

test('Korean one through twelve and numeric search quantities survive grounding with destination exclusions', () => {
  const words = ['한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두'];
  words.forEach((word, index) => {
    for (const quantity of [word, String(index + 1)]) {
      const actual = ground({ action: 'search', count: 12 }, `통영에서 ${quantity} 곳을 추천해줘. 창원과 거제는 제외해줘.`);
      assert.deepEqual(actual, { action: 'settings', region: '통영', count: index + 1 });
      assert.ok(validateAssistantAction(actual));
    }
  });
  for (const quantity of ['0', '13', '113', '열세']) {
    const actual = ground({ action: 'search' }, `통영에서 ${quantity} 곳을 찾아줘`);
    assert.equal(actual.count, undefined, quantity);
  }
  assert.deepEqual(ground({ action: 'search' }, [{ role: 'assistant', content: '세 곳을 추천할까요?' }, user('통영을 찾아줘')]), { action: 'settings', region: '통영' });
});

test('explicit car journey preparation is accepted without authorising transport questions or negated changes', () => {
  for (const text of ['통영에서 자동차로 여행 준비해줘', '부모님과 2026년 9월 26일 통영 당일 여행을 자동차로 준비해줘']) {
    const actual = ground(proposal({ transport: 'car' }), text);
    assert.equal(actual.action, 'create-itinerary', text);
    assert.equal(actual.transport, 'car', text);
    assert.equal(actual.region, '통영', text);
  }
  for (const text of ['자동차로 여행 준비하지 마', '자동차로 여행 준비해도 돼?', '자동차로 갈 수 있어?']) {
    assert.equal(ground(proposal({ transport: 'car' }), text), null, text);
  }
  const actual = ground(proposal({ transport: 'car' }), [user('통영 여행을 만들어줘'), user('자동차로 바꿔줘')]);
  assert.deepEqual(actual, { action: 'recalculate-route', transport: 'car' });
});
