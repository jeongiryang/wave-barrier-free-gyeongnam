import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) { return readFile(new URL(`../${path}`, import.meta.url), "utf8"); }

test("issue 544 direct search keeps unknown facts explicit and connects saved places to itinerary", async () => {
  const [search, workspace, page] = await Promise.all([
    source("features/planner/components/DirectPlaceSearch.tsx"),
    source("features/planner/components/RecommendationWorkspace.tsx"),
    source("app/planner/page.tsx"),
  ]);
  for (const label of ["지역", "관광지", "카페", "식당", "기타"]) assert.match(search, new RegExp(label));
  for (const fact of ["운영시간", "이동", "편의·접근성", "미확인"]) assert.match(search, new RegExp(fact));
  assert.match(search, /ArrowDown/);
  assert.match(search, /ArrowUp/);
  assert.match(search, /event\.key === "Escape"/);
  assert.match(search, /aria-activedescendant/);
  assert.match(workspace, /날짜 정하기/);
  assert.match(search, /trip\.toggleSaved\(result\.place\.id, result\.place\)/);
  assert.match(workspace, /내 일정 보기/);
  assert.match(page, /onBuildItinerary=\{\(\) => stageView\.changeStep\("itinerary", true\)\}/);
});

test("issue 544 date control opens from the field and keyboard with a mobile target", async () => {
  const [control, settings, stage] = await Promise.all([
    source("components/AccessibleDateInput.tsx"),
    source("features/planner/components/TripSettingsEditor.tsx"),
    source("features/planner/hooks/usePlannerStageView.ts"),
  ]);
  assert.match(control, /showPicker/);
  assert.match(control, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(control, /minHeight: 44/);
  assert.match(settings, /<AccessibleDateInput required value=\{start\}/);
  assert.match(settings, /id="itinerary-setup"/);
  assert.match(stage, /id === "itinerary" \? document\.getElementById\("itinerary-setup"\)/);
});

test("approved PR 667 supersedes the old intro phrase while preserving isolated styles", async () => {
  const [intro, css] = await Promise.all([
    source("features/landing/components/LandingIntro.tsx"),
    source("features/landing/components/LandingIntro.module.css"),
  ]);
  assert.match(intro, /모두의 발걸음이 닿는 경상남도/);
  assert.match(intro, /import\("\.\.\/intro\/wave-intro"\)/);
  assert.match(intro, /onCancel/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /:root|--wave-|\.wave-header|\.simple-place-row/);
});
