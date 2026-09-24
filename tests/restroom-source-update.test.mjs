import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeRestroomAlternative } from '../lib/restroom-alternatives.js';
import { normalizeOfficialRestroom, parseCsv } from '../scripts/update-gyeongnam-restrooms.mjs';

const base = {
  개방자치단체코드: '5670000', 관리번호: 'official-1', 화장실명: '중앙 공중화장실',
  소재지도로명주소: '경상남도 창원시 중앙대로 1', 소재지지번주소: '',
  '남성용-장애인용대변기수': '1', '여성용-장애인용대변기수': '0',
  개방시간: '상시', 개방시간상세: '', 전화번호: '', 데이터기준일자: '2026-09-13',
};

test('all thirty checked-in official records survive runtime normalization across the five promised cities', () => {
  const records = JSON.parse(readFileSync(new URL('../server/data/gyeongnam-restrooms.json', import.meta.url), 'utf8'));
  const before = JSON.stringify(records);
  assert.equal(records.length, 30);
  const normalized = records.map(normalizeRestroomAlternative);
  assert.equal(normalized.filter(Boolean).length, 30);
  assert.equal(new Set(normalized.map(item => item.id)).size, 30);
  const cities = normalized.reduce((counts, item) => {
    const city = item.address.match(/^(?:경상남도|경남)\s*(창원시|진주시|통영시|사천시|김해시)/)?.[1];
    assert.ok(city, item.address); counts[city] = (counts[city] || 0) + 1; return counts;
  }, {});
  assert.deepEqual(cities, { 진주시: 6, 통영시: 6, 사천시: 6, 김해시: 6, 창원시: 6 });
  for (const item of normalized) {
    assert.equal(item.evidence.accessibleToilet, 'confirmed');
    for (const [key, state] of Object.entries(item.evidence)) if (key !== 'accessibleToilet') assert.equal(state, 'unknown');
    assert.ok(item.sources.some(source => source.type === 'official' && source.referenceDate));
  }
  assert.equal(JSON.stringify(records), before, 'normalizing records must not rewrite official source data');
});

test('official CP949-decoded CSV structure keeps quoted commas and source fields', () => {
  const rows = parseCsv('화장실명,소재지도로명주소,데이터기준일자\r\n"공원, 화장실",경상남도 창원시 중앙대로 1,2026-09-13\r\n');
  assert.deepEqual(rows, [{ 화장실명: '공원, 화장실', 소재지도로명주소: '경상남도 창원시 중앙대로 1', 데이터기준일자: '2026-09-13' }]);
});

test('only official records with an accessible large fixture and minimum operating evidence pass', () => {
  assert.deepEqual(normalizeOfficialRestroom(base), {
    sourceId: 'official-1', city: '창원시', name: '중앙 공중화장실', address: '경상남도 창원시 중앙대로 1',
    openingHours: '상시', referenceDate: '2026-09-13', accessibleFixtures: 1,
  });
  assert.equal(normalizeOfficialRestroom({ ...base, '남성용-장애인용대변기수': '0' }), null);
  assert.equal(normalizeOfficialRestroom({ ...base, 개방시간: '', 전화번호: '' }), null);
  assert.equal(normalizeOfficialRestroom({ ...base, 데이터기준일자: '' }), null);
  assert.equal(normalizeOfficialRestroom({ ...base, 개방자치단체코드: '6110000' }), null);
});

test('phone numbers are allowlisted and absent detail is never inferred', () => {
  const accepted = normalizeOfficialRestroom({ ...base, 개방시간: '', 전화번호: '055-123-4567' });
  assert.equal(accepted.phoneNumber, '055-123-4567');
  assert.equal(Object.hasOwn(accepted, 'entranceStep'), false);
  assert.equal(normalizeOfficialRestroom({ ...base, 개방시간: '', 전화번호: '<script>' }), null);
});
