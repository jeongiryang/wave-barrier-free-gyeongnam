import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("planner keeps photo restore separate and unifies journey decisions", async () => {
  const [page, header, photoPage, results] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/PlannerHeader.tsx"),
    source("app/photo-course/page.tsx"),
    source("features/planner/components/PlannerResultsPanel.tsx"),
  ]);
  assert.doesNotMatch(page, /PhotoCourseRestore/);
  assert.match(page, /className="planner-journey-workspace"/);
  assert.match(page, /내 여행 만들기/);
  assert.match(page, /<PlannerConditionsPanel/);
  assert.match(page, /<RecommendationWorkspace/);
  assert.match(page, /<NavigationWorkspace/);
  assert.match(page, /<PlannerResultsPanel/);
  assert.match(page, /<TravelSignalsPanel/);
  assert.doesNotMatch(page, /PlannerEvidencePanel/);
  assert.match(results, /<PlannerRouteOverview/);
  assert.doesNotMatch(results, /06 · 믿을 수 있는 여행 추천/);
  assert.match(header, /href="\/photo-course"/);
  assert.match(photoPage, /<PhotoCourseRestore/);
});

test("route comparison is grouped by travel mode and ordered by time", async () => {
  const [view, panel] = await Promise.all([
    source("features/planner/hooks/useRouteView.ts"),
    source("features/planner/components/RouteComparisonPanel.tsx"),
  ]);
  for (const label of ["도보", "자전거", "대중교통", "자동차"]) assert.match(view, new RegExp(label));
  assert.match(view, /a\.minutes - b\.minutes/);
  assert.doesNotMatch(panel, /가장 빠름|가장 저렴함|환승 최소|걷기 최소/);
  assert.match(panel, /카카오맵에서/);
  assert.match(panel, /map\.kakao\.com\/link\/to/);
});

test("place detail can surface WAVE community stories", async () => {
  const [dialog, stories, seed, migration] = await Promise.all([
    source("features/planner/components/PlaceDecisionDialog.tsx"),
    source("features/planner/components/PlaceCommunityStories.tsx"),
    source("migrations/004_community_seed.sql"),
    source("server/deployment/migration-handler.ts"),
  ]);
  assert.match(dialog, /<PlaceCommunityStories/);
  assert.match(stories, /listCommunityPosts/);
  assert.match(stories, /W\.A\.V\.E COMMUNITY/);
  assert.match(seed, /실제 개인 후기가 아닌 기능 확인용 샘플/);
  assert.match(migration, /004_community_seed\.sql/);
});

test("photo course accepts common EXIF-capable web image containers", async () => {
  const [photo, parser] = await Promise.all([
    source("features/photo-course/PhotoCourseRestore.tsx"),
    source("lib/photo-exif.js"),
  ]);
  assert.match(photo, /\.png/);
  assert.match(photo, /\.webp/);
  assert.match(photo, /\.tiff/);
  assert.match(parser, /findPngExifStart/);
  assert.match(parser, /findWebpExifStart/);
  assert.match(parser, /isTiffStart/);
});
