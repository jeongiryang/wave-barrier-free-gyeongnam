import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePostInput, COMMUNITY_CATEGORIES } from '../lib/community/validation.js';

const input = { category: 'travel-talk', title: '통영 여행 질문입니다', content: '대중교통으로 이동한 경험을 공개적으로 묻습니다.', region: '' };
test('travel talk follows the existing public post validation', () => {
  assert.ok(COMMUNITY_CATEGORIES.includes('travel-talk'));
  const result = validatePostInput(input);
  assert.equal(result.value.category, 'travel-talk');
  assert.equal(result.value.placeId, null); assert.equal(result.value.visitDate, null);
  assert.equal(validatePostInput({ ...input, title: '짧음' }).error, '제목은 5자 이상 입력해 주세요.');
});
test('existing categories continue to validate', () => {
  for (const category of ['general', 'place', 'review']) assert.equal(validatePostInput({ ...input, category }).value.category, category);
});
test('validated travel talk has no private chat, demographic, presence, or coordinate fields', () => {
  const serialized = JSON.stringify(validatePostInput(input).value);
  assert.doesNotMatch(serialized, /disability|age|gender|online|presence|latitude|longitude|recipient|private/i);
});
