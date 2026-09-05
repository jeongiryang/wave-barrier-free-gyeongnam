import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("planner keeps photo restore secondary and uses one saved-place itinerary", async () => {
  const [page, header, photoPage, itinerary] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/PlannerHeader.tsx"),
    source("app/photo-course/page.tsx"),
    source("features/planner/components/PlannerItineraryWorkspace.tsx"),
  ]);
  assert.doesNotMatch(page, /PhotoCourseRestore/);
  assert.match(page, /className="planner-journey-workspace"/);
  assert.match(page, /나에게 맞는 경남 여행/);
  assert.match(page, /<PlannerConditionsPanel/);
  assert.match(page, /<RecommendationWorkspace/);
  assert.match(page, /<PlannerItineraryWorkspace/);
  assert.match(page, /<DepartureReadinessCard/);
  assert.match(page, /<TravelSignalsPanel/);
  assert.doesNotMatch(page, /PlannerResultsPanel|PlannerRouteOverview|PlannerEvidencePanel/);
  assert.match(itinerary, /<TripDayPlanner/);
  assert.match(itinerary, /<NavigationWorkspace/);
  assert.doesNotMatch(header, /href="\/photo-course"/);
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

test("place detail can surface only real public WAVE community stories", async () => {
  const [dialog, stories, reads, retirement] = await Promise.all([
    source("features/planner/components/PlaceDecisionDialog.tsx"),
    source("features/planner/components/PlaceCommunityStories.tsx"),
    source("features/community/server/post-read-repository.ts"),
    source("migrations/006_retire_community_seed.sql"),
  ]);
  assert.match(dialog, /<PlaceCommunityStories/);
  assert.match(stories, /listCommunityPosts/);
  assert.match(stories, /W\.A\.V\.E COMMUNITY/);
  assert.doesNotMatch(stories, /샘플/);
  assert.match(reads, /p\.author_id <> 'wave-seed'/);
  assert.match(retirement, /moderation_status = 'hidden'/);
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
