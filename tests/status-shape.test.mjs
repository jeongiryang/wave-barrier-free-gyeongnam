import test from 'node:test';
import assert from 'node:assert/strict';
import { statusShape, statusWord } from '../lib/status-shape.js';

const kinds = ['confirmed', 'unknown', 'negative', 'ok', 'caution', 'error'];

test('여섯 상태가 서로 다른 모양을 돌려준다', () => {
  const shapes = kinds.map(statusShape);
  assert.equal(new Set(shapes).size, kinds.length);
  for (const shape of shapes) assert.ok(['check', 'question', 'slash', 'dot', 'triangle', 'cross'].includes(shape));
});

test('여섯 상태가 서로 다른 한국어 낱말을 돌려준다', () => {
  const words = kinds.map(statusWord);
  assert.equal(new Set(words).size, kinds.length);
  for (const word of words) assert.match(word, /^[가-힣]+$/);
});

test('안내 낱말은 명세가 정한 표현을 쓴다', () => {
  assert.equal(statusWord('ok'), '확인');
  assert.equal(statusWord('caution'), '주의');
  assert.equal(statusWord('error'), '실패');
});

test('알 수 없는 값에는 기본 모양과 낱말을 돌려준다', () => {
  for (const value of ['', 'nope', undefined, null, 0]) {
    assert.equal(statusShape(value), 'dot');
    assert.equal(statusWord(value), '안내');
  }
});
