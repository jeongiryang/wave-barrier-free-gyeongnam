import test from 'node:test';
import assert from 'node:assert/strict';
import { naruDirectCommand, naruEditClarification } from '../lib/naru-direct-command.js';
import { startNaruGuide, advanceNaruGuide } from '../lib/naru-guided-start.js';
import { validateAssistantAction } from '../lib/assistant-actions.js';
import { sanitizeStopPurposes } from '../lib/trip-comfort.js';
const places = [{ id: '1234', name: '정원' }];
test('explicit undo uses the current command receipt without waiting for a model response', () => {
  for (const text of ['되돌려줘', '되돌려 주세요', '마지막 변경 되돌려줘', '실행 취소해줘']) assert.deepEqual(naruDirectCommand(text), { action: 'undo' });
  for (const text of ['되돌리지 마', '되돌려줘 말고 다음 일정 보여줘', '처음 날짜로 되돌려줘', '되돌리기는 어떻게 해?']) assert.equal(naruDirectCommand(text), null);
  for (const text of ['되돌려줘 그리고 출발 시간도 오전 11시로 바꿔줘', '되돌려줘 그리고 두 번째 장소도 삭제해줘']) { assert.ok(naruEditClarification(text)); assert.equal(naruDirectCommand(text), null); }
});
test('explicit nap and nursing modify rest only; the purpose survives validation/storage', () => {
  for (const [text, purpose] of [['낮잠', 'nap'], ['수유', 'nursing']]) {
    const action = naruDirectCommand(`정원 뒤에 ${text} 60분 넣어줘`, places);
    assert.deepEqual(validateAssistantAction(action, ['1234']), { action: 'break', placeId: '1234', minutes: 60, purpose });
    assert.deepEqual(sanitizeStopPurposes({ '1234': purpose }), { '1234': purpose });
  }
});
test('ambiguous, negative and out-of-range requests never become one guessed edit', () => {
  for (const text of ['정원 체류 30분, 휴식 60분으로 바꿔줘', '정원 뒤에 30분 넣지 마', '정원 뒤에 낮잠 300분 넣어줘', '정원 뒤에서 쉬고 싶어']) assert.equal(naruDirectCommand(text, places), null);
  assert.deepEqual(naruDirectCommand('오후 4시까지 돌아오도록 귀가 마감 시간을 정해줘'), { action: 'deadline', time: '16:00' });
  for (const text of ['출발은 오전 9시로 바꾸고 귀가는 오후 6시로 정해줘', '출발 시간을 오전 10시 30분에서 오전 11시로 바꿔줘']) {
    assert.equal(naruDirectCommand(text, places), null); assert.ok(naruEditClarification(text));
  }
});
test('one question advances only its slot; missing and negated answers do not invent values', () => {
  let state = startNaruGuide({ region: '통영', start: '', end: '', selected: ['restroom'], revision: 'original' });
  assert.equal(advanceNaruGuide(state, '네').step, 'region');
  state = advanceNaruGuide(state, '통영'); assert.equal(state.step, 'dates');
  assert.equal(advanceNaruGuide(state, '2026-10-01 말고 다른 날').step, 'dates');
  assert.equal(advanceNaruGuide(state, '2026-02-30').step, 'dates');
  state = advanceNaruGuide(state, '날짜 없이 찾아보기'); assert.equal(state.start, '');
  assert.deepEqual(advanceNaruGuide(state, '수유실은 필요 없어요').selected, ['restroom']);
  state = advanceNaruGuide(state, '수유실'); assert.equal(state.step, 'review');
  assert.deepEqual(state.selected, ['restroom', 'lactationroom']); assert.equal(state.revision, 'original');
  assert.equal(advanceNaruGuide(state, '취소'), null);
});
