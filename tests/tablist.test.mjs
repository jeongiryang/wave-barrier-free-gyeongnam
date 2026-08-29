import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { nextTabIndex, rovingTabIndex } from "../lib/a11y/tablist.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("화살표로 양쪽 끝을 감아 돈다", () => {
  assert.equal(nextTabIndex("ArrowRight", 0, 4), 1);
  assert.equal(nextTabIndex("ArrowRight", 3, 4), 0);
  assert.equal(nextTabIndex("ArrowLeft", 0, 4), 3);
  assert.equal(nextTabIndex("ArrowLeft", 2, 4), 1);
  // 세로로 놓인 탭 목록에서도 같은 축으로 움직인다.
  assert.equal(nextTabIndex("ArrowDown", 0, 4), 1);
  assert.equal(nextTabIndex("ArrowUp", 0, 4), 3);
});

test("Home과 End가 양 끝으로 간다", () => {
  assert.equal(nextTabIndex("Home", 2, 4), 0);
  assert.equal(nextTabIndex("End", 0, 4), 3);
});

test("처리하지 않는 키는 그대로 흘려보낸다", () => {
  // null이어야 preventDefault를 하지 않고 Tab·Enter가 평소대로 동작한다.
  for (const key of ["Tab", "Enter", " ", "a", "Escape", "PageDown"]) {
    assert.equal(nextTabIndex(key, 0, 4), null, `${key}를 가로채면 안 된다`);
  }
});

test("빈 목록이나 범위 밖 위치에서도 터지지 않는다", () => {
  assert.equal(nextTabIndex("ArrowRight", 0, 0), null);
  assert.equal(nextTabIndex("ArrowRight", -1, 3), 1);
  assert.equal(nextTabIndex("End", 99, 3), 2);
});

test("선택된 탭만 Tab 순서에 남는다", () => {
  // 필터 여섯 개를 Tab으로 여섯 번 지나쳐야 다음 요소에 닿는 상태를 없앤다.
  assert.equal(rovingTabIndex(true), 0);
  assert.equal(rovingTabIndex(false), -1);
});

test("tablist를 선언한 곳은 키보드 이동을 함께 붙인다", async () => {
  const [theme, hook] = await Promise.all([
    source("features/planner/components/ThemeExplorer.tsx"),
    source("features/planner/hooks/useTabListKeyboard.ts"),
  ]);
  assert.match(hook, /nextTabIndex\(/);
  assert.match(hook, /rovingTabIndex\(/);
  assert.match(theme, /role="tablist"/);
  assert.match(theme, /useTabListKeyboard\(/, "탭 목록에 키보드 이동이 없다");
  assert.match(theme, /onKeyDown=\{onKeyDown\}/);
  assert.match(theme, /aria-controls=/, "탭이 여는 패널 연결이 없다");
  assert.match(theme, /role="tabpanel"/);
  assert.match(theme, /aria-labelledby=/, "패널이 탭을 되가리키지 않는다");
});

test("고른 순간 순서가 바뀌는 목록은 탭이라고 말하지 않는다", async () => {
  const file = await source("features/planner/components/RouteComparisonPanel.tsx");
  // 예상 시간이 도착하면 빠른 순서로 다시 정렬된다. 화살표로 갈 "옆 탭"이 없다.
  assert.doesNotMatch(file, /role="tablist"/);
  assert.doesNotMatch(file, /role="tab"/);
  assert.match(file, /role="group"/);
  assert.match(file, /aria-pressed=/);
});

test("여러 곳을 바꾸는 필터는 탭 목록이라고 말하지 않는다", async () => {
  const file = await source("features/planner/components/TransportModeSelector.tsx");
  // 고른 값이 예매 안내·운행정보 패널·경로 목록을 함께 바꾼다. 가리킬 패널이 없다.
  assert.doesNotMatch(file, /role="tablist"/);
  assert.doesNotMatch(file, /role="tab"/);
  assert.match(file, /role="group"/);
  assert.match(file, /aria-pressed=/);
});
