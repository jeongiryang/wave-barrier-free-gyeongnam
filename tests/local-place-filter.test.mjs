import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { groupPlaceNames, normalizePlaceName, repeatedNameIds } from '../lib/local-place-filter.js';
import { filterByFoodCategory } from '../lib/food-category.js';

// 스펙 35: 지역 가게 보기. 어떤 가게가 체인인지 알려주는 공식 제공처가 없으므로
// 상표 이름 목록을 코드나 데이터에 적어 걸러내지 않는다. 대신 관찰할 수 있는
// 사실(지금 결과 목록 안에서 같은 이름이 몇 번 나오는지)만 쓴다.

test('normalizePlaceName은 지점 접미사와 괄호 안 지점명을 뗀다', () => {
  assert.equal(normalizePlaceName('○○김밥 통영점'), normalizePlaceName('○○김밥'));
  assert.equal(normalizePlaceName('○○커피(강남점)'), normalizePlaceName('○○커피'));
  assert.equal(normalizePlaceName('명동교자 본점'), normalizePlaceName('명동교자'));
});

test('normalizePlaceName은 공백·문장부호·대소문자 차이를 지운다', () => {
  assert.equal(normalizePlaceName('Cafe  Ediya'), normalizePlaceName('cafe ediya'));
  assert.equal(normalizePlaceName('스타벅스 (역점)'), normalizePlaceName('스타벅스'));
});

test('빈 이름·비문자열은 빈 문자열로 판정에서 제외된다', () => {
  assert.equal(normalizePlaceName(''), '');
  assert.equal(normalizePlaceName(undefined), '');
  assert.equal(normalizePlaceName(null), '');
  assert.equal(normalizePlaceName(42), '');
  assert.equal(normalizePlaceName('   '), '');
});

test('lib/local-place-filter.js에는 상표 이름 목록 상수가 없다', () => {
  const source = readFileSync(fileURLToPath(new URL('../lib/local-place-filter.js', import.meta.url)), 'utf8');
  // 상표 이름을 나열하는 배열·객체 리터럴 상수를 이 파일에 두지 않는다.
  assert.doesNotMatch(source, /=\s*\[\s*['"]/, '상표 이름을 나열한 배열 상수가 있으면 안 된다');
  assert.doesNotMatch(source, /=\s*\{\s*['"A-Za-z0-9_]+:\s*['"]/, '상표 이름을 나열한 객체 리터럴 상수가 있으면 안 된다');
  // 주석에서 "만들지 않는다"고 설명하는 것은 허용하되, 실제 필드/속성으로 쓰이면 안 된다.
  assert.doesNotMatch(source, /[.:]\s*isChain\b/i);
});

test('groupPlaceNames는 지금 결과 목록 안에서만 같은 이름을 묶는다', () => {
  const places = [
    { id: '1', name: '○○김밥 통영점' },
    { id: '2', name: '○○김밥 창원점' },
    { id: '3', name: '△△분식' },
    { id: '4', name: '' }, // 빈 이름 제외
  ];
  const groups = groupPlaceNames(places);
  const kimbap = groups.find((group) => group.ids.includes('1'));
  assert.ok(kimbap);
  assert.equal(kimbap.count, 2);
  assert.deepEqual(kimbap.ids.sort(), ['1', '2']);
  assert.equal(groups.reduce((sum, group) => sum + group.count, 0), 3); // 빈 이름 항목은 세지 않는다
});

test('repeatedNameIds는 threshold 이상일 때만, 반복된 항목의 id만 돌려준다', () => {
  const places = [
    { id: '1', name: '○○김밥 통영점' },
    { id: '2', name: '○○김밥 창원점' },
    { id: '3', name: '△△분식' },
  ];
  assert.deepEqual(repeatedNameIds(places, 2).sort(), ['1', '2']);
  assert.deepEqual(repeatedNameIds(places, 3), []);
});

test('빈 이름은 반복 판정에서 제외되고 접히지 않는다', () => {
  const places = [{ id: '1', name: '' }, { id: '2', name: '' }];
  assert.deepEqual(repeatedNameIds(places, 2), []);
});

test('39번(음식 종류) 거르기와 35번(반복 이름 접기) 거르기는 순서를 바꿔도 같은 결과를 낸다', () => {
  const places = [
    { id: '1', name: '○○김밥 통영점', category: '음식점 > 한식' },
    { id: '2', name: '○○김밥 창원점', category: '음식점 > 한식' },
    { id: '3', name: '△△분식', category: '음식점 > 한식' },
    { id: '4', name: '□□카페', category: '음식점 > 카페' },
  ];
  const repeated = new Set(repeatedNameIds(places, 2));
  const collapseRepeated = (list) => list.filter((place) => !repeated.has(place.id));

  const foodThenLocal = collapseRepeated(filterByFoodCategory(places, ['한식']));
  const localThenFood = filterByFoodCategory(collapseRepeated(places), ['한식']);
  assert.deepEqual(foodThenLocal.map((p) => p.id).sort(), localThenFood.map((p) => p.id).sort());
  // 반복 판정 자체는 원본 목록 기준이므로, 종류를 먼저 걸러 목록이 줄어도
  // 반복 집합은 바뀌지 않는다(둘 다 같은 예상값을 낸다).
  assert.deepEqual(foodThenLocal.map((p) => p.id).sort(), ['3']);
});
