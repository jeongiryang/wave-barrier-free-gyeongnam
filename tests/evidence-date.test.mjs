import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceDate } from '../lib/evidence-date.js';

test('조회 날짜는 UTC가 아닌 한국 날짜로 표시한다', () => {
  assert.equal(evidenceDate('2026-09-27T21:34:00Z'), '2026-09-28');
  assert.equal(evidenceDate('2026-09-28T06:34:00+09:00'), '2026-09-28');
  assert.equal(evidenceDate('2026-09-28'), '2026-09-28');
  assert.equal(evidenceDate('2026-12-31T15:00:00Z'), '2027-01-01');
});

test('확인 시각이 없거나 잘못되면 오늘 날짜로 꾸미지 않는다', () => {
  for (const value of [undefined, null, '', 'invalid']) assert.equal(evidenceDate(value), '확인일 미확인');
});
