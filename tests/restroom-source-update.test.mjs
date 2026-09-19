import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOfficialRestroom, parseCsv } from '../scripts/update-gyeongnam-restrooms.mjs';

const base = {
  개방자치단체코드: '5670000', 관리번호: 'official-1', 화장실명: '중앙 공중화장실',
  소재지도로명주소: '경상남도 창원시 중앙대로 1', 소재지지번주소: '',
  '남성용-장애인용대변기수': '1', '여성용-장애인용대변기수': '0',
  개방시간: '상시', 개방시간상세: '', 전화번호: '', 데이터기준일자: '2026-09-13',
};

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
