import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as actions from '../lib/assistant-actions.js';
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
