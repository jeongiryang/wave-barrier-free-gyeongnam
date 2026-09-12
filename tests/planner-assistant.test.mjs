import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as actions from '../lib/assistant-actions.js';
import { groundAssistantProposal } from '../lib/assistant-grounding.js';
import { offsetTripDate } from '../lib/trip-dates.js';
import { navigationScroll } from '../lib/header-scroll.js';
import { verifySameOriginMutation } from '../lib/security/request-boundaries.js';
import { cacheControlHeader } from '../lib/http-cache.js';
import { ProviderRequestError } from '../lib/provider-failure.js';

function compile(file, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { assert.ok(dependencies[name], name); return dependencies[name]; }, Response, Request, URL, TextEncoder, AbortController, AbortSignal, setTimeout, clearTimeout, Date, ...globals });
  return exports;
}
const http = compile('../server/shared/http.ts', { '../../lib/http-cache.js': { cacheControlHeader }, '../../lib/security/request-boundaries.js': { verifySameOriginMutation } });
function handler(responder, configured = true) {
  const calls = [];
  let requesters = 0;
  const { handleAssistant } = compile('../server/assistant/handler.ts', {
    '../shared/http': http, '../../lib/assistant-actions.js': actions,
    '../../lib/assistant-grounding.js': { groundAssistantProposal },
    '../../lib/provider-failure.js': { ProviderRequestError },
    '../shared/provider-request.js': {
      createProviderRequester: () => {
        const instance = ++requesters;
        return async (context, url, options) => {
          calls.push({ instance, context, url, options });
          return { ok: true, status: 200, json: async () => responder ? responder(context, options) : { choices: [{ message: { content: JSON.stringify({ reply: '확인할 내용을 골라주세요.', proposal: { action: 'search' } }) } }] } };
        };
      },
    },
  }, { process: { env: configured ? { WAVE_AI_BASE_URL: 'http://127.0.0.1:18765/v1', WAVE_AI_MODEL: 'fixture-local', WAVE_AI_TOKEN: 'fixture-not-a-real-token' } : {} } });
  return { run: handleAssistant, calls };
}
const request = (body = { messages: [{ role: 'user', content: '여행지 찾아줘' }], context: { places: [] } }, origin = 'https://wave.example') => new Request('https://wave.example/api/assistant', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('assistant proposals accept only known actions and real current place identities', () => {
  for (const value of [{ action: 'shell', command: 'anything' }, { action: 'add', placeId: '9999' }, { action: 'settings', profiles: [] }, { action: 'settings', region: '서울' }, { action: 'break', placeId: '1001', minutes: 900 }, { action: 'deadline', time: '29:99' }, { action: 'tool', tool: 'email' }]) assert.equal(actions.validateAssistantAction(value, ['1001']), null);
  assert.deepEqual(actions.validateAssistantAction({ action: 'settings', region: '창원', profiles: ['wheel','wheel'], themes: ['nature'], url: 'https://untrusted.example' }), { action: 'settings', region: '창원', profiles: ['wheel'], themes: ['nature'] });
  assert.deepEqual(actions.validateAssistantAction({ action: 'remove', placeId: '1001', command: 'ignored' }, ['1001']), { action: 'remove', placeId: '1001' });
});

test('header requires sustained upward travel and keeps focused navigation visible', () => {
  let state = { y: 0, direction: 0, distance: 0, hidden: false };
  state = navigationScroll(state, 500); assert.equal(state.hidden, true);
  state = navigationScroll(state, 430); assert.equal(state.hidden, true);
  state = navigationScroll(state, 460); assert.equal(state.hidden, true);
  state = navigationScroll(state, 350); assert.equal(state.hidden, true);
  state = navigationScroll(state, 330); assert.equal(state.hidden, false);
  state = navigationScroll(state, 800, true); assert.equal(state.hidden, false);
  state = navigationScroll(state, 900); assert.equal(state.hidden, true);
  state = navigationScroll(state, -4); assert.equal(state.hidden, false);
});

test('assistant rejects foreign origin, oversized input and malformed messages before inference', async () => {
  const h = handler();
  assert.equal((await h.run(request(undefined, 'https://untrusted.example'))).status, 403);
  assert.equal((await h.run(request({ messages: [{ role: 'user', content: 'a'.repeat(24001) }] }))).status, 413);
  assert.equal((await h.run(request({ messages: [] }))).status, 400);
  assert.equal(h.calls.length, 0);
  assert.equal((await handler(null, false).run(request())).status, 503);
});

test('private inference is not cached or coalesced across visitors; malformed context is bounded', async () => {
  const h = handler();
  const responses = await Promise.all([h.run(request({ messages: [{ role: 'user', content: '첫 요청' }], context: { places: [null, 17, { id: '1001', name: '미술관' }] } })), h.run(request())]);
  assert.ok(responses.every(response => response.status === 200 && response.headers.get('cache-control') === 'no-store'));
  assert.equal(new Set(h.calls.map(call => call.instance)).size, 2);
  const first = JSON.parse(h.calls[0].options.body);
  assert.equal(first.temperature, 0, 'task intent extraction uses minimum sampling variance');
  assert.ok(first.messages.some(message => message.content === '첫 요청'));
  assert.ok(!JSON.parse(h.calls[1].options.body).messages.some(message => message.content === '첫 요청'));
});

test('invented model actions and oversized model output cannot reach application execution', async () => {
  for (const content of [JSON.stringify({ reply: '허위 장소', proposal: { action: 'add', placeId: '9999' } }), 'x'.repeat(6001), 'broken json']) {
    const h = handler(() => ({ choices: [{ message: { content } }] }));
    assert.equal((await h.run(request())).status, 503);
  }
});

test('model dates and times must be strings rather than coercible arrays or objects', () => {
  for (const [action, field, valid] of [['day', 'date', '2026-09-12'], ['start-time', 'time', '09:00'], ['deadline', 'time', '18:00']]) {
    assert.deepEqual(actions.validateAssistantAction({ action, [field]: valid }), { action, [field]: valid });
    for (const value of [[valid], { toString: () => valid }, null, 900, true]) {
      assert.equal(actions.validateAssistantAction({ action, [field]: value }), null);
    }
  }
});

test('a live-model itinerary misclassification is grounded to a mode-only confirmed action', async () => {
  const h = handler(() => ({ choices: [{ message: { content: JSON.stringify({ reply: '장소를 교체할게요.', proposal: { action: 'adapt-itinerary', region: '창원', transport: 'car', profiles: ['baby'], reason: 'change' } }) } }] }));
  const response = await h.run(request({ messages: [{ role: 'user', content: '비 오는 날 휠체어로 갈 수 있는 경남 코스 만들어줘' }, { role: 'assistant', content: '두 곳의 일정안을 반영했어요.' }, { role: 'user', content: '자동차로 이동할게.' }], context: { savedIds: ['1748884'], places: [{ id: '1748884', name: '3·15 아트센터' }], transport: 'transit' } }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.proposal, { action: 'recalculate-route', transport: 'car' });
  assert.match(data.reply, /장소·날짜·순서와 필요한 편의는 유지/);
  assert.doesNotMatch(data.reply, /교체/);
  assert.match(JSON.parse(h.calls[0].options.body).messages[0].content, /이동수단만 정하면 create-itinerary\/adapt-itinerary를 반복하지/);
});

test('ambiguous transport and rest requests return clarification without a mutating proposal or offline error', async () => {
  for (const [content, proposal] of [['자동차로 이동할까?', { action: 'adapt-itinerary', transport: 'car' }], ['3·15 아트센터에서 휴식 30분으로 바꿀까?', { action: 'visit', placeId: '1748884', minutes: 30 }]]) {
    const h = handler(() => ({ choices: [{ message: { content: JSON.stringify({ reply: '변경할게요.', proposal }) } }] }));
    const response = await h.run(request({ messages: [{ role: 'user', content }], context: { places: [{ id: '1748884', name: '3·15 아트센터' }] } }));
    assert.equal(response.status, 200);
    const data = await response.json(); assert.equal(data.proposal, null); assert.match(data.reply, /기존 일정은 그대로/);
  }
});

test('the API corrects rest-only model visit output while preserving the known place boundary', async () => {
  const h = handler(() => ({ choices: [{ message: { content: JSON.stringify({ reply: '휴식을 30분으로 바꿀게요.', proposal: { action: 'visit', placeId: '1748884', minutes: 30 } }) } }] }));
  const response = await h.run(request({ messages: [{ role: 'user', content: '3·15 아트센터에서 쉬는 시간만 30분으로 바꿔줘.' }], context: { places: [{ id: '1748884', name: '3·15 아트센터' }] } }));
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).proposal, { action: 'break', placeId: '1748884', minutes: 30 });
});

test('a model festival proposal keeps explicit child facilities and drops invented fatigue at the API boundary', async () => {
  const h = handler(() => ({ choices: [{ message: { content: JSON.stringify({ reply: '피로를 줄이는 축제 코스를 만들게요.', proposal: { action: 'create-itinerary', region: '경남 전체', festival: 'any', reason: 'fatigue' } }) } }] }));
  const response = await h.run(request({ messages: [{ role: 'user', content: '아이와 갈 만한 경남 축제랑 주변 장소로 당일 코스를 만들어줘.' }], context: { profiles: 'wheel', places: [], days: ['2026-09-20'] } }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.proposal, { action: 'create-itinerary', region: '경남 전체', profiles: ['baby'], festival: 'any' });
  assert.doesNotMatch(data.reply, /피로|피곤/);
  assert.match(JSON.parse(h.calls[0].options.body).messages[0].content, /reason:fatigue는 최신 발화/);
});

test('the API grounds a tomorrow-only change to dates without a new itinerary or unrelated fields', async () => {
  const h = handler(() => ({ choices: [{ message: { content: JSON.stringify({ reply: '새 장소로 일정을 다시 만들게요.', proposal: { action: 'adapt-itinerary', start: '2027-01-01', end: '2027-01-01', date: '2027-01-01', profiles: ['baby'], region: '진주' } }) } }] }));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const response = await h.run(request({ messages: [{ role: 'user', content: '비 오는 날 휠체어 경남 코스를 만들어줘.' }, { role: 'assistant', content: '두 장소를 반영했어요.' }, { role: 'user', content: '여행 날짜만 내일로 바꿔줘.' }], context: { days: ['2026-09-20', '2026-09-21'], profiles: 'wheel', region: '창원', places: [] } }));
  assert.equal(response.status, 200);
  const data = await response.json(), tomorrow = offsetTripDate(today, 1);
  assert.deepEqual(data.proposal, { action: 'set-dates', start: tomorrow, end: tomorrow });
  assert.match(data.reply, /날짜만 확인/); assert.doesNotMatch(data.reply, /새 장소|다시 만들/);
  assert.match(JSON.parse(h.calls[0].options.body).messages[0].content, /날짜만 내일로 바꿔줘/);
});

test('a low-burden same-day origin request searches nearby without assuming a car or promising accessible routes', async () => {
  const h = handler(() => ({ choices: [{ message: { content: JSON.stringify({ reply: '접근 가능한 짧은 자동차 경로를 보장해요.', proposal: { action: 'create-itinerary', region: '양산', originRegion: '창원', transport: 'car', profiles: ['senior'] } }) } }] }));
  const response = await h.run(request({ messages: [{ role: 'user', content: '부모님이 오래 걷기 힘들어. 창원에서 출발해서 당일치기로 여행하고 싶어.' }], context: { days: ['2026-09-20'], region: '', profiles: 'wheel', transport: 'transit', places: [] } }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.proposal, { action: 'create-itinerary', region: '창원', originRegion: '창원', profiles: ['senior'] });
  assert.doesNotMatch(data.reply, /접근 가능|보장|자동차/);
});
