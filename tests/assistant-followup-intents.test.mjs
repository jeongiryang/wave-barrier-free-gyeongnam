import assert from 'node:assert/strict';
import test from 'node:test';
import { groundAssistantProposal } from '../lib/assistant-grounding.js';
import { validateAssistantAction } from '../lib/assistant-actions.js';

const context = { savedIds: ['1748884', '1904774'], days: ['2026-09-20', '2026-09-21'], transport: 'transit',
  places: [{ id: '1748884', name: '3·15 아트센터' }, { id: '1904774', name: '창원과학체험관' }] };
const history = [{ role: 'user', content: '비 오는 날 휠체어로 갈 수 있는 경남 여행 코스 만들어줘.' },
  { role: 'assistant', content: '실제 장소 두 곳을 일정에 반영했어요.' }];
const ground = (proposal, content) => groundAssistantProposal(proposal, [...history, { role: 'user', content }], context);

for (const [content, transport] of [
  ['자동차로 이동할게.', 'car'], ['차로 갈게요.', 'car'], ['이동수단을 자동차로 바꿔줘.', 'car'],
  ['대중교통으로 이동할 거야.', 'transit'], ['이제 교통수단은 버스로 변경해 주세요.', 'transit'],
  ['도보로 이동할게.', 'walk'], ['걸어서 갈게요.', 'walk'], ['자전거로 갈게.', 'bicycle'],
  ['Switch to car.', 'car'], ['I will travel by bicycle.', 'bicycle'],
]) test(`transport-only follow-up preserves the trip instead of repeating creation: ${content}`, () => {
  for (const action of ['create-itinerary', 'adapt-itinerary', 'recalculate-route']) {
    const result = ground({ action, region: '진주', transport: 'walk', profiles: ['baby'], start: '2027-01-01', reason: 'change' }, content);
    assert.deepEqual(result, { action: 'recalculate-route', transport });
    assert.deepEqual(validateAssistantAction(result), result);
  }
});

for (const content of ['자동차로 경남 코스 만들어줘.', '자동차로 기존 일정을 다시 계획해줘.', '자동차로 갈 만한 곳 추천해줘.']) {
  test(`an actual planning request still prepares an itinerary: ${content}`, () => {
    assert.equal(ground({ action: 'create-itinerary', transport: 'car' }, content).action, 'create-itinerary');
  });
}

for (const content of ['자동차', '자동차로 이동할까?', '자동차로 이동해도 돼?', '자동차는 빼줘.', '자동차로 이동하지 않을게.', '자동차나 대중교통으로 갈게.', '자동차로 바꾸지 말아줘.', 'Can I use a car?']) {
  test(`a transport question, exclusion or ambiguity cannot mutate the itinerary: ${content}`, () => {
    assert.equal(ground({ action: 'adapt-itinerary', transport: 'car', reason: 'change' }, content), null);
    assert.equal(ground({ action: 'recalculate-route', transport: 'car' }, content), null);
  });
}

test('only the current turn can authorize a mode-only change; a plain recheck uses the current mode', () => {
  assert.deepEqual(ground({ action: 'recalculate-route', transport: 'car' }, '현재 이동 경로를 다시 확인해줘'), { action: 'recalculate-route' });
  assert.deepEqual(ground({ action: 'day', date: '2026-09-21' }, '둘째 날 보여줘'), { action: 'day', date: '2026-09-21' });
});

test('optional recalculate transport remains an enum and cannot smuggle other trip edits', () => {
  for (const transport of ['car', 'transit', 'walk', 'bicycle']) assert.deepEqual(validateAssistantAction({ action: 'recalculate-route', transport, profiles: ['baby'], placeId: '9999', start: '2027-01-01' }), { action: 'recalculate-route', transport });
  for (const transport of ['taxi', '', null, ['car'], {}, true, 1]) assert.equal(validateAssistantAction({ action: 'recalculate-route', transport }), null);
  assert.deepEqual(validateAssistantAction({ action: 'recalculate-route' }), { action: 'recalculate-route' });
});

test('an explicitly named rest-only duration cannot turn into a stay-time edit', () => {
  for (const content of ['3·15 아트센터에서 쉬는 시간만 30분으로 바꿔줘.', '3·15아트센터의 휴식시간을 30분으로 설정해 주세요.']) {
    const result = ground({ action: 'visit', placeId: '1748884', minutes: 90 }, content);
    assert.deepEqual(result, { action: 'break', placeId: '1748884', minutes: 30 });
    assert.deepEqual(validateAssistantAction(result, context.savedIds), result);
  }
});

for (const content of ['3·15 아트센터에서 쉬는 시간만 30분으로 바꿀까?', '3·15 아트센터에서 휴식시간을 30분으로 바꾸지 마.', '3·15 아트센터에서 체류 60분, 휴식 30분으로 바꿔줘.', '거기에서 쉬는 시간만 30분으로 바꿔줘.']) {
  test(`mixed, negative or ambiguous rest requests do not guess an edit: ${content}`, () => {
    assert.equal(ground({ action: 'visit', placeId: '1748884', minutes: 30 }, content), null);
    assert.equal(ground({ action: 'break', placeId: '1748884', minutes: 30 }, content), null);
  });
}

test('rest correction preserves real identity and duration validation', () => {
  assert.equal(ground({ action: 'visit', placeId: '9999', minutes: 30 }, '3·15 아트센터에서 쉬는 시간만 30분으로 바꿔줘.'), null);
  assert.equal(validateAssistantAction(ground({ action: 'visit', placeId: '1748884', minutes: 30 }, '3·15 아트센터에서 쉬는 시간만 999분으로 바꿔줘.'), context.savedIds), null);
  assert.deepEqual(ground({ action: 'visit', placeId: '1748884', minutes: 90 }, '3·15 아트센터 체류시간을 90분으로 바꿔줘.'), { action: 'visit', placeId: '1748884', minutes: 90 });
});

test('an explicit child festival request repairs omitted baby facilities without inventing fatigue', () => {
  const value = { action: 'create-itinerary', region: '경남 전체', festival: 'any', reason: 'fatigue' };
  const actual = ground(value, '아이와 갈 만한 경남 축제랑 주변 장소로 당일 코스를 만들어줘.');
  assert.deepEqual(actual, { action: 'create-itinerary', region: '경남 전체', festival: 'any', profiles: ['baby'], start: context.days[0], end: context.days[0] });
  assert.equal(value.reason, 'fatigue', 'grounding cannot mutate model input');
  assert.ok(validateAssistantAction(actual));
});

test('explicit child companions and stroller use add only the requested baby facility profile', () => {
  for (const text of ['아기랑 갈 만한 여행 코스 만들어줘.', '아이를 데리고 경남 여행을 가고 싶어.', '유아 동행 여행을 만들어줘.', '유모차를 끌고 다닐 만한 코스를 만들어줘.', '유모차로 이동할 수 있는 축제 코스를 만들어줘.']) {
    const actual = ground({ action: 'create-itinerary', profiles: ['wheel'], reason: 'fatigue' }, text);
    assert.deepEqual(actual.profiles, ['wheel', 'baby'], text);
    assert.equal(Object.hasOwn(actual, 'reason'), false, text);
    assert.equal(Object.hasOwn(actual, 'transport'), false, 'a stroller does not mean driving a car');
  }
});

test('a same-trip follow-up retains explicitly requested child facilities, but assistant suggestions do not authorize them', () => {
  const initial = [{ role: 'user', content: '아이와 갈 만한 여행 코스를 만들어줘.' }, { role: 'assistant', content: '피곤할 테니 짧은 일정을 제안해요.' }];
  const actual = groundAssistantProposal({ action: 'adapt-itinerary', reason: 'fatigue' }, [...initial, { role: 'user', content: '그 조건으로 축제도 넣어서 바꿔줘.' }], context);
  assert.deepEqual(actual.profiles, ['baby']); assert.equal(Object.hasOwn(actual, 'reason'), false);
  const unrequested = groundAssistantProposal({ action: 'create-itinerary', profiles: ['baby'] }, [{ role: 'assistant', content: '아이와 함께 여행해 보세요.' }, { role: 'user', content: '진주 여행 코스 만들어줘.' }], context);
  assert.equal(Object.hasOwn(unrequested, 'profiles'), false);
});

test('direct baby facilities and English companion requests remain valid without inferring a disability', () => {
  for (const text of ['유아 편의시설이 있는 코스를 만들어줘.', '수유실 있는 코스를 만들어줘.', '기저귀 교환대가 있는 곳으로 코스를 만들어줘.', '아이와 첫 여행을 준비해줘.', 'Plan a trip with my baby.', 'Plan a stroller-friendly trip.']) {
    for (const profiles of [undefined, ['baby']]) {
      const actual = ground({ action: 'create-itinerary', ...(profiles ? { profiles } : {}) }, text);
      assert.deepEqual(actual.profiles, ['baby'], text);
    }
  }
});

test('new trips, different parties and explicit child exclusions cannot resurrect earlier baby facilities', () => {
  for (const text of ['새 여행을 진주로 만들어줘.', '이번에는 혼자 갈 만한 코스를 만들어줘.', '아이 없이 갈 거야. 다른 코스로 만들어줘.', '유모차는 안 가져갈게. 다른 코스로 바꿔줘.', '이번에는 성인끼리 여행할 거야.', '아이와 가지 않을 거야. 다른 코스를 만들어줘.']) {
    const ctx = { ...context, profiles: 'wheel' };
    const actual = groundAssistantProposal({ action: 'create-itinerary', profiles: ['wheel', 'baby'] }, [{ role: 'user', content: '아이와 갈 만한 유모차 여행 코스 만들어줘.' }, { role: 'user', content: text }], ctx);
    assert.deepEqual(actual.profiles, ['wheel'], text); assert.equal(ctx.profiles, 'wheel');
  }
});

test('mentions without child companionship cannot invent baby facilities', () => {
  for (const text of ['아이콘이 보기 쉬운 여행 코스 만들어줘.', '아이돌 공연 주변 장소로 여행을 만들어줘.', '어린이박물관 주변 여행 코스 만들어줘.', '아이와 갈까?']) {
    const actual = ground({ action: 'create-itinerary', profiles: ['baby'] }, text);
    assert.equal(Object.hasOwn(actual, 'profiles'), false, text);
  }
});

test('fatigue adaptation requires a current positive fatigue or rest request', () => {
  for (const text of ['좀 피곤해. 현재 일정에서 덜 걷고 더 쉬도록 바꿔줘.', '쉬고 싶어. 일정을 줄여줘.', '걷기 힘들어서 쉬는 일정으로 바꿔줘.', 'I am tired. Adapt my itinerary so I can rest.']) {
    assert.equal(ground({ action: 'adapt-itinerary', reason: 'fatigue' }, text).reason, 'fatigue', text);
  }
  for (const text of ['창원 축제로 바꿔줘.', '피곤하지 않아. 축제를 추가해줘.', '안 피곤해. 장소만 바꿔줘.', '피곤하면 어떻게 해야 하나요?', '휴식은 필요 없어. 장소를 바꿔줘.', 'I am not tired. Add a festival to my itinerary.']) {
    const actual = groundAssistantProposal({ action: 'adapt-itinerary', reason: 'fatigue' }, [{ role: 'user', content: '많이 피곤해. 쉬고 싶어.' }, { role: 'user', content: text }], context);
    assert.equal(Object.hasOwn(actual, 'reason'), false, text);
  }
});

test('a date-only follow-up cannot repeat creation or carry model-invented trip edits', () => {
  const ctx = { ...context, today: '2026-09-12', profiles: 'wheel,senior', region: '창원' };
  const before = JSON.stringify(ctx);
  for (const [content, start, end] of [
    ['여행 날짜만 내일로 바꿔줘.', '2026-09-13', '2026-09-13'],
    ['날짜를 모레로 변경해 주세요.', '2026-09-14', '2026-09-14'],
    ['2026-09-22로 여행 날짜만 바꿔줘.', '2026-09-22', '2026-09-22'],
    ['여행 기간을 9월 20일부터 22일까지로 바꿔줘.', '2026-09-20', '2026-09-22'],
    ['여행 기간만 2026-09-20 ~ 2026-09-22로 바꿔줘.', '2026-09-20', '2026-09-22'],
    ['기간을 당일로 줄여줘.', '2026-09-20', '2026-09-20'],
    ['여행 기간을 2박 3일로 늘려줘.', '2026-09-20', '2026-09-22'],
    ['Change only the travel dates to tomorrow.', '2026-09-13', '2026-09-13'],
  ]) {
    for (const action of ['create-itinerary', 'adapt-itinerary', 'set-dates']) {
      const result = groundAssistantProposal({ action, region: '진주', profiles: ['baby'], reason: 'change', date: '2027-01-01', start: '2027-01-01', end: '2027-01-02', transport: 'car' }, [...history, { role: 'user', content }], ctx);
      assert.deepEqual(result, { action: 'set-dates', start, end }, content);
      assert.deepEqual(validateAssistantAction(result), result, content);
    }
  }
  assert.equal(JSON.stringify(ctx), before);
});

test('negative, questioning, mixed, ambiguous or invalid date edits cannot create a new itinerary', () => {
  for (const content of ['여행 날짜만 내일로 바꿀까?', '여행 날짜를 내일로 바꾸지 마.', '여행 날짜를 내일로 바꿔주고 장소도 바꿔줘.', '여행 날짜를 내일로 바꿔줘. 장소도 바꿔줘.', '여행 날짜를 나중으로 바꿔줘.', '기간을 다음 달로 바꿔줘.', '여행 기간을 8일로 늘려줘.', '여행 기간을 2박 2일로 바꿔줘.', '날짜를 2026-02-30로 바꿔줘.', '여행 기간을 9월 22일부터 20일까지로 바꿔줘.', '여행 기간을 2026-09-20부터 2026-10-20까지로 바꿔줘.', 'Can I change my travel dates to tomorrow?']) {
    for (const action of ['adapt-itinerary', 'set-dates']) {
      const actual = groundAssistantProposal({ action, start: '2027-01-01', end: '2027-01-01' }, [...history, { role: 'user', content }], { ...context, today: '2026-09-12' });
      assert.equal(actual, null, content);
    }
  }
});

test('a genuine new trip with a date remains creation, and a day-view request remains navigation', () => {
  const ctx = { ...context, today: '2026-09-12' };
  const actual = groundAssistantProposal({ action: 'create-itinerary', start: '2027-01-01', end: '2027-01-01' }, [{ role: 'user', content: '내일 창원 여행 코스 만들어줘.' }], ctx);
  assert.deepEqual(actual, { action: 'create-itinerary', start: '2026-09-13', end: '2026-09-13' });
  assert.deepEqual(ground({ action: 'day', date: context.days[1] }, '둘째 날 보여줘.'), { action: 'day', date: context.days[1] });
  assert.deepEqual(ground({ action: 'tool', tool: 'dates' }, '여행 날짜 보여줘.'), { action: 'tool', tool: 'dates' });
});
