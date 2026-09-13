import assert from 'node:assert/strict';
import test from 'node:test';
import { canRunConversationAction, resolveConversationReference, acceptsPendingChange } from '../lib/assistant-conversation.js';

const places = [{ id: '1002', name: '용지호수공원' }, { id: '1001', name: '경남도립미술관' }];
const add = { action: 'add', placeId: '1001' };
test('explicit prohibitions never authorize an automatic place change', () => {
  for (const text of ['경남도립미술관을 추가하지 마.', '경남도립미술관을 추가하면 안 돼.', '경남도립미술관은 넣으면 안 됩니다.']) {
    assert.equal(canRunConversationAction(text, add, '1001', places), false, text);
  }
});
test('asking about a possible edit does not authorize the edit itself', () => {
  for (const [text, action] of [['경남도립미술관을 담으면 어때?', add],
    ['경남도립미술관의 휴식을 30분으로 바꿔도 될까?', { action: 'break', placeId: '1001', minutes: 30 }],
    ['경남도립미술관을 추가해도 되나요?', add]]) {
    assert.equal(canRunConversationAction(text, action, '1001', places), false, text);
  }
});
test('specific positive edits and displayed references remain usable without broad affirmative guessing', () => {
  assert.equal(canRunConversationAction('경남도립미술관을 일정에 담아줘.', add, '1001', places), true);
  assert.equal(canRunConversationAction('경남도립미술관의 휴식을 30분으로 바꿔줘.', { action: 'break', placeId: '1001', minutes: 30 }, '1001', places), true);
  assert.deepEqual(resolveConversationReference('첫 번째를 담아줘', places), { text: '용지호수공원를 담아줘', placeId: '1002' });
  assert.deepEqual(resolveConversationReference('거기를 담아줘', places, '1001'), { text: '경남도립미술관를 담아줘', placeId: '1001' });
  assert.equal(resolveConversationReference('세 번째를 담아줘', places).unresolved, true);
  assert.equal(resolveConversationReference('거기를 담아줘', places).unresolved, true);
  assert.equal(acceptsPendingChange('좋아!'), true);
  for (const text of ['좋아 보이지만 적용하지 마', '좋아요?', '네, 그런데 아직 바꾸지 마', '이전 것은 취소해줘']) assert.equal(acceptsPendingChange(text), false, text);
});


test('explicit search criteria execute without another generic confirmation button', () => {
  assert.equal(canRunConversationAction('장애인 화장실이 있는 곳을 찾아줘', { action: 'settings', profiles: ['route', 'restroom'] }), true);
  assert.equal(canRunConversationAction('진주 지역으로 찾아줘', { action: 'settings', region: '진주' }), true);
  assert.equal(canRunConversationAction('부모님과 여행할 거야', { action: 'settings', profiles: ['elevator'] }), false);
  assert.equal(canRunConversationAction('장애인 화장실 조건으로 바꿔도 될까?', { action: 'settings', profiles: ['restroom'] }), false);
});
