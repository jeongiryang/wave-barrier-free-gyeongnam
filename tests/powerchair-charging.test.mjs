import assert from 'node:assert/strict';
import test from 'node:test';
import { POWERCHAIR_CHARGING_NOTICE_TEXT, POWERCHAIR_CHARGING_OFFICIAL_LINKS } from '../lib/powerchair-charging-links.js';

// 스펙 15는 공공데이터포털 OpenAPI로 경남 표본을 실제 호출로 확인하지 못하면
// "대체 설계"를 구현하라고 명시한다: 지도 레이어 대신 시군 공식 안내 링크만
// 정적으로 둔다. 이 테스트는 그 정적 데이터가 명세의 불변조건을 지키는지
// 확인한다(설치 장소 목록을 두지 않음, 경남 18개 시군 모두 존재, 실제
// 존재해야 하는 https 링크 형식, 확인 날짜 기록).

test('covers all 18 Gyeongnam counties exactly once', () => {
  const expected = ['창원', '진주', '통영', '사천', '김해', '밀양', '거제', '양산', '의령', '함안', '창녕', '고성', '남해', '하동', '산청', '함양', '거창', '합천'];
  assert.deepEqual(POWERCHAIR_CHARGING_OFFICIAL_LINKS.map(link => link.region).sort(), [...expected].sort());
  assert.equal(new Set(POWERCHAIR_CHARGING_OFFICIAL_LINKS.map(link => link.region)).size, 18);
});

test('every link is an https URL to an official .go.kr domain with a verification date', () => {
  for (const link of POWERCHAIR_CHARGING_OFFICIAL_LINKS) {
    assert.match(link.url, /^https:\/\/(www\.)?[a-z0-9.-]+\.go\.kr\//);
    assert.match(link.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok([1, 2, 3].includes(link.pageKind));
    assert.ok(link.name.length > 0);
  }
});

test('does not embed an installation location list — only city/county-level links', () => {
  for (const link of POWERCHAIR_CHARGING_OFFICIAL_LINKS) {
    assert.equal(typeof link.name, 'string');
    assert.equal(Object.keys(link).sort().join(','), 'name,pageKind,region,url,verifiedAt');
  }
  assert.equal(Object.isFrozen(POWERCHAIR_CHARGING_OFFICIAL_LINKS), true);
});

test('notice text matches the spec wording exactly and never claims availability', () => {
  assert.equal(POWERCHAIR_CHARGING_NOTICE_TEXT, '전동휠체어 충전 장소는 시군마다 안내가 달라요. 방문 전 관할 기관에 확인하는 것이 확실해요.');
  assert.doesNotMatch(POWERCHAIR_CHARGING_NOTICE_TEXT, /사용 가능|이용 가능|빈자리/);
});
