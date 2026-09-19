import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { filterByFoodCategory, foodCategoryOf, foodCategoryOptions } from '../lib/food-category.js';

// 스펙 39: 음식 종류로 거르기. 카카오 장소 검색의 분류 문자열(`음식점 > 한식 >
// 국밥`)의 두 번째 단계만 종류로 쓴다. 분류표를 만들어 코드를 이름으로
// 바꾸지 않는다. 지금 결과에 실제로 나타난 종류만 선택지로 보여준다.

test('foodCategoryOf는 두 번째 단계를 꺼낸다', () => {
  assert.equal(foodCategoryOf('음식점 > 한식 > 국밥'), '한식');
  assert.equal(foodCategoryOf('음식점 > 카페'), '카페');
  assert.equal(foodCategoryOf('음식점>일식>스시'), '일식');
});

test('두 번째 단계가 없거나 형식이 다르면 예외 없이 null을 돌려준다', () => {
  assert.equal(foodCategoryOf('음식점'), null);
  assert.equal(foodCategoryOf(''), null);
  assert.equal(foodCategoryOf(undefined), null);
  assert.equal(foodCategoryOf(null), null);
  assert.equal(foodCategoryOf(42), null);
  assert.equal(foodCategoryOf({}), null);
});

test('lib/food-category.js에는 분류표 상수가 없다', () => {
  const source = readFileSync(fileURLToPath(new URL('../lib/food-category.js', import.meta.url)), 'utf8');
  // 코드를 이름으로 바꾸는 표(맵·객체 리터럴 상수)를 이 파일에 두지 않는다.
  // 순수 함수 3개만 내보내는지 확인한다.
  assert.doesNotMatch(source, /=\s*\{\s*['"A-Za-z0-9_]+:\s*['"]/, '분류표로 보이는 객체 리터럴 상수가 있으면 안 된다');
  assert.doesNotMatch(source, /new Map\(\[/);
});

test('foodCategoryOptions는 지금 결과에 실제로 나타난 종류만, 개수 순으로 돌려준다', () => {
  const places = [
    { id: '1', category: '음식점 > 한식 > 국밥' },
    { id: '2', category: '음식점 > 한식 > 냉면' },
    { id: '3', category: '음식점 > 카페' },
    { id: '4', category: '음식점' }, // 두 번째 단계 없음 → 선택지에서 제외
    { id: '5' }, // category 없음 → 선택지에서 제외
  ];
  const options = foodCategoryOptions(places);
  assert.deepEqual(options.map((option) => option.id), ['한식', '카페']);
  assert.equal(options[0].count, 2);
  assert.equal(options[1].count, 1);
  assert.equal(options[0].label, '한식');
  // 결과에 없는 종류(중식 등)를 미리 채워 넣지 않는다.
  assert.ok(!options.some((option) => option.id === '중식'));
});

test('filterByFoodCategory는 합집합이며, 선택이 없으면 전부 보여준다', () => {
  const places = [
    { id: '1', category: '음식점 > 한식' },
    { id: '2', category: '음식점 > 카페' },
    { id: '3', category: '음식점 > 일식' },
    { id: '4' },
  ];
  assert.equal(filterByFoodCategory(places, []).length, 4);
  const oneSelected = filterByFoodCategory(places, ['한식']);
  assert.deepEqual(oneSelected.map((p) => p.id), ['1']);
  const twoSelected = filterByFoodCategory(places, ['한식', '카페']);
  assert.deepEqual(twoSelected.map((p) => p.id), ['1', '2']);
  // 분류 문자열이 없는 항목은 선택이 하나라도 있으면 빠진다.
  assert.ok(!twoSelected.some((p) => p.id === '4'));
});

test('빈 입력에서도 예외를 던지지 않는다', () => {
  assert.deepEqual(foodCategoryOptions([]), []);
  assert.deepEqual(foodCategoryOptions(undefined), []);
  assert.deepEqual(filterByFoodCategory([], ['한식']), []);
  assert.deepEqual(filterByFoodCategory(undefined, []), []);
});

test('39번 거르기는 독립된 다른 거르기와 순서를 바꿔 적용해도 같은 결과를 낸다', () => {
  // 35번(지역 가게 보기)의 lib/local-place-filter.js는 이 브랜치(스펙 39)에는
  // 아직 없다. 이 테스트는 "원본 목록에서 계산한 고정 집합을 기준으로 거르는
  // 두 필터는 순서를 바꿔도 같은 결과를 낸다"는 일반 성질을 확인해, 스펙
  // 35가 이어서 구현될 때도 같은 계약이 성립함을 미리 고정한다. 스펙 35의
  // PR에서는 실제 repeatedNameIds를 써서 이 계약을 다시 확인한다.
  const places = [
    { id: '1', category: '음식점 > 한식' },
    { id: '2', category: '음식점 > 한식' },
    { id: '3', category: '음식점 > 카페' },
    { id: '4', category: '음식점 > 카페' },
  ];
  // 원본 목록에서 미리 계산한 고정 id 집합(예: 반복된 이름)으로 거르는 필터.
  const otherFilterKeep = new Set(['1', '3', '4']);
  const otherFilter = (list) => list.filter((p) => otherFilterKeep.has(p.id));

  const foodThenOther = otherFilter(filterByFoodCategory(places, ['한식', '카페']));
  const otherThenFood = filterByFoodCategory(otherFilter(places), ['한식', '카페']);
  assert.deepEqual(foodThenOther.map((p) => p.id), otherThenFood.map((p) => p.id));
});
