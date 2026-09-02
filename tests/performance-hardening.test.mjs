import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("공개 랜딩은 인증 SDK를 사용자 의도 또는 유휴 시점까지 미룬다", async () => {
  const [header, deferred] = await Promise.all([
    source("features/landing/components/LandingHeader.tsx"),
    source("features/landing/components/LandingAccountMenu.tsx"),
  ]);
  assert.doesNotMatch(header, /auth\/components\/AccountMenu/);
  assert.match(header, /LandingAccountMenu/);
  assert.match(deferred, /import\("\.\.\/\.\.\/auth\/components\/AccountMenu"\)/);
  assert.match(deferred, /ACCOUNT_IDLE_DELAY_MS = 4_000/);
  assert.match(deferred, /onPointerEnter=\{reveal\}/);
});

test("커뮤니티 요청은 timeout abort와 오류 종류를 한 경계에서 정리한다", async () => {
  const [api, list, detail, comments] = await Promise.all([
    source("features/community/client/api.ts"),
    source("features/community/hooks/useCommunityPostList.ts"),
    source("features/community/hooks/useCommunityPostResource.ts"),
    source("features/community/hooks/useCommunityCommentActions.ts"),
  ]);
  assert.match(api, /class CommunityRequestError extends Error/);
  assert.match(api, /"aborted" \| "timeout" \| "network" \| "invalid" \| "http"/);
  assert.match(api, /parentSignal\?\.addEventListener\("abort"/);
  assert.match(api, /COMMUNITY_REQUEST_TIMEOUT_MS = 12_000/);
  assert.match(api, /finally \{[\s\S]*window\.clearTimeout\(timeout\)/);
  assert.match(list, /requestRef\.current !== controller/);
  assert.match(detail, /requestRef\.current\?\.abort\(\)/);
  assert.match(detail, /getCommunityPost\(postId, controller\.signal\)/);
  assert.match(comments, /finally \{[\s\S]*setCommentState/);
});

test("사진 코스의 이전 공식정보 응답은 최신 편집을 덮지 않는다", async () => {
  const hook = await source("features/photo-course/usePhotoCourse.ts");
  assert.match(hook, /enrichmentRequests = useRef\(new Map/);
  assert.match(hook, /signal: controller\.signal/);
  assert.match(hook, /enrichmentRequests\.current\.get\(stop\.id\) !== controller/);
  assert.match(hook, /abortEnrichment\(stopId\)/);
  assert.match(hook, /useEffect\(\(\) => \(\) => abortEnrichment\(\)/);
  assert.match(hook, /finally \{[\s\S]*setReading\(false\)/);
});

test("숨은 플래너 지도와 원격 이미지는 초기 네트워크 비용을 만들지 않는다", async () => {
  const [planner, workspace, regionStory, smartImage, photoCourse] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/RouteMapWorkspace.tsx"),
    source("features/landing/components/LandingRegionStory.tsx"),
    source("features/tourism/components/SmartSpotImage.tsx"),
    source("features/photo-course/PhotoCourseRestore.tsx"),
  ]);
  assert.match(planner, /mapEnabled=\{stageView\.view === "overview" \|\| journey\.activeStepId === "itinerary"\}/);
  assert.match(workspace, /lazy\(\(\) => import\("\.\.\/\.\.\/\.\.\/components\/RouteMap"\)\)/);
  assert.match(workspace, /mapEnabled \? <Suspense/);
  assert.doesNotMatch(regionStory, /<img|Wikimedia|upload\.wikimedia\.org/);
  assert.match(regionStory, /<RegionMapSurface \/>/);
  for (const image of [smartImage, photoCourse]) {
    assert.match(image, /loading="lazy"/);
    assert.match(image, /decoding="async"/);
    assert.match(image, /width=/);
    assert.match(image, /height=/);
  }
});

test("지역 사진은 hover intent 뒤에만 요청하고 이탈 시 취소한다", async () => {
  const regions = await source("features/landing/hooks/useLandingRegions.ts");
  assert.match(regions, /HOVER_INTENT_MS = 180/);
  assert.match(regions, /window\.setTimeout\(show, HOVER_INTENT_MS\)/);
  assert.match(regions, /cancelRegionPhoto\(region\)/);
  assert.match(regions, /photoRequests\.current\.get\(region\)\?\.abort\(\)/);
  assert.match(regions, /photoRequests\.current\.forEach\(\(controller\) => controller\.abort\(\)\)/);
});

test("빌드 성능 예산은 전역 CSS와 랜딩 초기 비용을 별도로 제한한다", async () => {
  const [script, packageJson, workflow] = await Promise.all([
    source("scripts/check-performance-budget.mjs"),
    source("package.json"),
    source(".github/workflows/ci.yml"),
  ]);
  assert.match(script, /cssGzipKiB: 70/);
  assert.match(script, /landingInitialJsGzipKiB: 155/);
  assert.match(script, /plannerInitialJsGzipKiB: 270/);
  assert.match(script, /공개 랜딩이 인증 chunk를 초기 요청/);
  assert.match(packageJson, /"check:performance"/);
  assert.match(workflow, /npm run check:performance/);
});
