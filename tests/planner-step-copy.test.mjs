import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * 지역 검색과 일정 편집의 라벨·선택 사항·응답 상태 계약.
 * 실제 렌더링과 키보드 흐름은 simple planner 및 search-result-focus E2E가 검증한다.
 */

const FIELD_FILES = [
  "features/planner/components/PlannerConditionsPanel.tsx",
  "features/planner/components/TripSettingsEditor.tsx",
  "features/planner/components/StopEditor.tsx",
];

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("검색 조건과 일정 편집 필드는 강제 절차처럼 번호를 달지 않는다", async () => {
  const files = await Promise.all(FIELD_FILES.map(source));
  for (const [index, file] of files.entries()) {
    const numbered = file.match(/step-label"><b>[0-9]+<\/b>/g) ?? [];
    assert.deepEqual(numbered, [], `${FIELD_FILES[index]}에 이중 번호가 남아 있다`);
  }
});

test("편의 조건이 없어도 완전한 버튼 이름을 유지하고 적용 전 초안은 분리한다", async () => {
  const file = await source("features/planner/components/PlannerConditionsPanel.tsx");
  // 예전에는 `{길이 || "조건을"}개 선택`이라 미선택일 때 "조건을개 선택"으로 찍혔다.
  assert.doesNotMatch(file, /\|\| "[^"]+"\}개 선택/);
  assert.match(file, /필요한 편의\{plan\.selected\.length > 0 \? ` · \$\{plan\.selected\.length\}개` : ""\}/);
  assert.match(file, /const \[draft, setDraft\] = useState\(plan\.selected\)/);
  assert.match(file, /plan\.setSelected\(draft\); onClose\(\)/);
  assert.match(file, /<legend className="sr-only">여행 편의 조건 선택/);
});

test("검색 결과와 일정 설정은 현재 할 일을 한국어로 안내한다", async () => {
  const files = await Promise.all([
    source("features/planner/components/PlannerHeader.tsx"),
    source("features/planner/components/PlannerConditionsPanel.tsx"),
    source("features/planner/components/RecommendationCarousel.tsx"),
    source("features/planner/components/PlannerItineraryWorkspace.tsx"),
    source("features/planner/components/TripSettingsEditor.tsx"),
    source("features/planner/components/PlannerItineraryBoard.tsx"),
  ]).then(parts => parts.join("\n"));
  for (const title of ["여행 설계", "여행지 검색 결과", "내 일정", "여행 설정", "날짜별 여행 일정"]) assert.ok(files.includes(title), title);
  assert.match(files, /<select aria-label="여행 지역"/);
  assert.ok(files.includes("언제 떠날까요?"));
  for (const action of ["필요한 편의", "하고 싶은 활동", "이동 수단", "시간표 만들기", "시간표", "지도"]) assert.ok(files.includes(action), action);
});

test("선택한 지역은 준비 완료 후 바로 조회하고 실패에는 같은 조건의 재시도를 제공한다", async () => {
  const [page, conditions, results] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/PlannerConditionsPanel.tsx"),
    source("features/planner/components/RecommendationCarousel.tsx"),
  ]);
  const start = page.indexOf("const searchKey =");
  const finish = page.indexOf("async function searchForNaru", start);
  assert.ok(start >= 0 && finish > start);
  const auto = page.slice(start, finish);
  assert.match(auto, /JSON\.stringify\(\[region, theme, selected\]\)/);
  for (const guard of ["!hydrated", "!planController.criteriaReady", "!tripSelection.storageReady", "!region", "planController.loading", "automaticSearch.current === searchKey"]) assert.ok(auto.includes(guard), guard);
  assert.match(auto, /automaticSearch\.current = searchKey/);
  assert.match(auto, /void runPlan\(\{ resetRouteData, resetAudio \}, false\)/);
  assert.match(auto, /return \(\) => clearTimeout\(timer\)/);
  assert.doesNotMatch(auto, /travelStart|travelEnd|!theme|!selected\.length/);
  assert.match(conditions, /plan\.loading &&[\s\S]*role="status"[\s\S]*className="button-loader"/);
  assert.match(results, /aria-busy=\{loading\}/);
  assert.match(results, /planError \?[\s\S]*role="alert"/);
  assert.match(results, /disabled=\{loading\} onClick=\{\(\) => void onGenerate\(false\)\}/);
  assert.match(results, /같은 조건으로 다시 시도/);
  assert.match(results, /dirty && !loading && !planError/);
  assert.match(results, /loading && !plan &&[\s\S]*className="simple-place-skeleton"/);
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
