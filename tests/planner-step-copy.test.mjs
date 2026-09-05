import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * 플래너 조건 패널의 문구 회귀 테스트.
 *
 * 조건 패널은 섹션 제목이 이미 `STEP 01`을 달고 있는데 그 안의 다섯 필드가 다시
 * `01`~`05`를 달고 있었다. 번호가 두 겹이면 어느 쪽이 순서인지 읽는 사람이
 * 판단해야 한다. 안쪽 다섯 개는 아무 순서로나 채워도 되는 필드라 순서가 아니다.
 */

const FIELD_FILES = [
  "features/planner/components/PlannerConditionsPanel.tsx",
  "features/planner/components/PlannerThemeDates.tsx",
  "features/planner/components/PlannerAccessibilityProfiles.tsx",
];

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("조건 필드는 섹션의 STEP 번호와 겹치는 자체 번호를 달지 않는다", async () => {
  const files = await Promise.all(FIELD_FILES.map(source));
  for (const [index, file] of files.entries()) {
    const numbered = file.match(/step-label"><b>[0-9]+<\/b>/g) ?? [];
    assert.deepEqual(numbered, [], `${FIELD_FILES[index]}에 이중 번호가 남아 있다`);
  }
});

test("편의 조건을 고르지 않은 상태에서도 문장이 끊기지 않는다", async () => {
  const file = await source("features/planner/components/PlannerAccessibilityProfiles.tsx");
  // 예전에는 `{길이 || "조건을"}개 선택`이라 미선택일 때 "조건을개 선택"으로 찍혔다.
  assert.doesNotMatch(file, /\|\| "[^"]+"\}개 선택/);
  assert.match(file, /선택한 편의 조건 없음/);
});

test("단계 제목을 한국어로 읽을 수 있다", async () => {
  const files = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/PlannerConditionsPanel.tsx"),
    source("features/planner/components/RecommendationCarousel.tsx"),
    source("features/planner/components/PlannerItineraryWorkspace.tsx"),
    source("features/planner/components/DepartureReadinessCard.tsx"),
  ]).then((parts) => parts.join("\n"));
  for (const title of ["여행 조건 정하기", "내 조건에 맞는 여행지", "이 기기 일정 만들기", "출발 전에 이것만 다시 확인하세요"]) assert.match(files, new RegExp(title));
});

test("추천 조회는 사용자가 명시적으로 시작한다", async () => {
  const file = await source("features/planner/components/PlannerConditionsPanel.tsx");
  assert.match(file, /onClick=\{\(\) => void props\.onGenerate\(\)\}/);
  assert.match(file, /내 조건에 맞는 여행지 찾기/);
  assert.doesNotMatch(file, /추천이 자동으로 업데이트/);
});

test("쓰이지 않는 번호 배지 스타일을 남겨 두지 않는다", async () => {
  const [explorer, contrast] = await Promise.all([
    source("app/styles/landing-explorer.css"),
    source("app/styles/planner-theme-contrast.css"),
  ]);
  assert.doesNotMatch(explorer, /\.step-label b\b/);
  assert.doesNotMatch(contrast, /\.step-label b\b/);
  // 같은 규칙을 쓰던 경로 순번 배지는 그대로 남아야 한다.
  assert.match(contrast, /\.route-option-rank/);
});
