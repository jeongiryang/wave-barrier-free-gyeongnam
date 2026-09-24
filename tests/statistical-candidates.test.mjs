import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  });
  return exports;
}
const http = load('../server/shared/http.ts', { '../../lib/http-cache.js': {}, '../../lib/security/request-boundaries.js': {} });
const { statisticalCandidates } = load('../server/tourism/exploration-model.ts', { '../shared/http': http });
const available = items => ({ ok: true, value: { items, total: items.length } });

// Synthetic records use field names from data.go.kr datasets 15128559 / 15128560.
// These are schema fixtures, not assertions that the current provider returned these places.
test('hub candidates retain monthly scope and never promote statistical IDs, coordinates or facilities to saved Place data', () => {
  const input = [
    { hubTatsCd: 'stat-1', hubTatsNm: '경남 후보', hubRank: '1', baseYm: '202607', areaCd: '48', areaNm: '경상남도', signguNm: '창원시 의창구', mapX: '128.6', mapY: '35.2', contentid: 'unsafe-id', wheelchair: '있음' },
    { hubTatsCd: 'stat-2', hubTatsNm: '다른 지역', areaCd: '26', areaNm: '부산광역시', signguNm: '해운대구' },
    { hubTatsNm: '지역 근거 없음', signguNm: '창원시 의창구' },
    { hubTatsNm: '', areaCd: '48' },
  ];
  const before = structuredClone(input);
  assert.deepEqual(statisticalCandidates(available(input), 'hub', '202606', '경남 전체'), [
    { name: '경남 후보', scope: '창원시 의창구', source: '기초지자체 중심 관광지', baseYm: '202607', relatedTo: '' },
  ]);
  assert.deepEqual(input, before);
});

test('related candidates use the candidate province and city, preserve original attraction, deduplicate per city and retain explicit query fallback', () => {
  const input = [
    { tAtsCd: 'source-1', tAtsNm: '기준 관광지', areaCd: '48', signguNm: '창원시', rlteTatsCd: 'related-1', rlteTatsNm: '연관 후보', rlteRegnCd: '48', rlteSignguNm: '김해시', baseYm: '202605' },
    { tAtsNm: '기준 관광지', areaCd: '48', rlteTatsNm: '부산 후보', rlteRegnCd: '26', rlteRegnNm: '부산광역시', rlteSignguNm: '강서구' },
    { tAtsNm: '기준 관광지', areaCd: '48', rlteTatsNm: '지역 미상 후보' },
    { tAtsNm: '기준 관광지', rlteTatsCd: 'different-stat-id', rlteTatsNm: '연관 후보', rlteRegnCd: '48', rlteSignguNm: '김해시', baseYm: '202605' },
    { tAtsNm: '다른 기준', rlteTatsNm: '연관 후보', rlteRegnNm: '경남', rlteSignguNm: '진주시' },
    { tAtsNm: '기준 관광지', rlteTatsNm: '범위 미제공 후보', rlteRegnNm: '경상남도' },
  ];
  const actual = statisticalCandidates(available(input), 'related', '202604', '경남 전체');
  assert.deepEqual(actual, [
    { name: '연관 후보', scope: '김해시', source: '관광지별 연관 관광지', baseYm: '202605', relatedTo: '기준 관광지' },
    { name: '연관 후보', scope: '진주시', source: '관광지별 연관 관광지', baseYm: '202604', relatedTo: '다른 기준' },
    { name: '범위 미제공 후보', scope: '창원 조회 자료', source: '관광지별 연관 관광지', baseYm: '202604', relatedTo: '기준 관광지' },
  ]);
});

test('statistical failure and empty results remain empty, and candidate output stays bounded without fabricated evidence', () => {
  assert.deepEqual(statisticalCandidates({ ok: false, error: 'timeout' }, 'hub', '202604', '창원'), []);
  assert.deepEqual(statisticalCandidates(available([]), 'related', '202604', '진주'), []);
  const actual = statisticalCandidates(available(Array.from({ length: 10 }, (_, index) => ({ hubTatsNm: `후보 ${index}`, areaCd: '48' }))), 'hub', '202604', '진주');
  assert.equal(actual.length, 6);
  assert.ok(actual.every(item => item.scope === '진주' && item.baseYm === '202604'));
  assert.ok(actual.every(item => !('id' in item) && !('contentId' in item) && !('mapX' in item) && !('accessibility' in item)));
});
