import assert from 'node:assert/strict';
import test from 'node:test';
import { assessEvidenceCoverage } from '../lib/evidence-coverage.js';

const place = (fields = []) => ({ accessibility: fields });
const field = (key, state) => ({ key, state });

test('동선 정보 확인도는 확인됨과 불일치를 알려진 공식 기록으로 세고 미확인을 분리한다', () => {
  assert.deepEqual(assessEvidenceCoverage([
    place([field('route', 'confirmed'), field('restroom', 'unknown')]),
    place([field('route', 'negative'), field('restroom', 'confirmed')]),
  ], ['route', 'restroom']), {
    places: 2, facilities: 2, total: 4, checked: 3, percent: 75, grade: 'B', confirmed: 2, negative: 1, unknown: 1,
  });
});

test('중복 조건과 잘못된 상태를 정규화하고 입력이 없으면 점수를 만들지 않는다', () => {
  assert.deepEqual(assessEvidenceCoverage([place([field('route', 'made-up')])], ['route', 'route']), {
    places: 1, facilities: 1, total: 1, checked: 0, percent: 0, grade: 'C', confirmed: 0, negative: 0, unknown: 1,
  });
  assert.equal(assessEvidenceCoverage([], ['route']).percent, null);
  assert.equal(assessEvidenceCoverage([place()], []).percent, null);
});
