import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("공개 헤더와 하단 안내는 인증 SDK를 초기 로드하지 않는다", async () => {
  const [header, deferred] = await Promise.all([
    source("features/landing/components/LandingHeader.tsx"),
    source("components/WaveFooterTools.tsx"),
  ]);
  assert.doesNotMatch(header, /auth\/components\/AccountMenu/);
  assert.match(header, /WaveHeader/);
  assert.doesNotMatch(await source("components/WaveHeader.tsx"), /authClient|AccountMenu|useHydratedSession/);
  assert.doesNotMatch(deferred, /authClient|AccountMenu|useHydratedSession/);
  assert.match(deferred, /FooterAccountLink/);
  assert.match(await source("features/auth/components/FooterAccountLink.tsx"), /lazy\(\(\) => import/);
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

test("검색 화면과 모바일 시간표는 지도를 지연하고 지역 사진은 실제 카드만 lazy 로드한다", async () => {
  const [planner, itinerary, workspace, regionStory, smartImage, photoCourse] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/PlannerItineraryWorkspace.tsx"),
    source("features/planner/components/RouteMapWorkspace.tsx"),
    source("features/landing/components/LandingRegionStory.tsx"),
    source("features/tourism/components/SmartSpotImage.tsx"),
    source("features/photo-course/PhotoCourseRestore.tsx"),
  ]);
  assert.match(planner, /mapEnabled=\{journey\.activeStepId === "itinerary" \|\| journey\.activeStepId === "departure-readiness"\}/);
  assert.match(itinerary, /const mapView = desktop \|\| props\.mapView/);
  assert.match(itinerary, /mapEnabled=\{props\.mapEnabled && mapView\}/);
  assert.match(itinerary, /if \(!props\.tripSelection\.travelStart\) return <InitialTripSetup/);
  assert.match(workspace, /lazy\(\(\) => import\("\.\.\/\.\.\/\.\.\/components\/RouteMap"\)\)/);
  assert.match(workspace, /useState\(mapEnabled\)/);
  assert.match(workspace, /if \(mapEnabled && !mapMounted\) setMapMounted\(true\)/);
  assert.match(workspace, /mapMounted \? <Suspense/);
  assert.doesNotMatch(regionStory, /Wikimedia|upload\.wikimedia\.org|<LandingBoundaryMap|korea-sgis-2020/);
  assert.equal((regionStory.match(/<img\b/g) || []).length, 1);
  assert.match(regionStory, /orderedRegions\.slice\(0, expanded \? 18 : 6\)\.map/);
  assert.match(regionStory, /src=\{photo\.image\}/);
  assert.match(regionStory, /loading="lazy" decoding="async" width="640" height="480"/);
  assert.doesNotMatch(regionStory, /fetch\(|setInterval|setTimeout|requestAnimationFrame/);
  assert.match(regionStory, /media\.matches \|\| revealed\.current\.has\(entry\.target\)/);
  assert.match(regionStory, /animations\.forEach\(animation => animation\.cancel\(\)\)/);
  const boundary = await source("features/landing/components/LandingBoundaryMap.tsx");
  assert.match(boundary, /new IntersectionObserver/);
  assert.match(boundary, /import\("\.\/RegionBoundarySurface"\)/);
  for (const image of [smartImage, photoCourse]) {
    assert.match(image, /loading="lazy"/);
    assert.match(image, /decoding="async"/);
    assert.match(image, /width=/);
    assert.match(image, /height=/);
  }
});

test("지역을 읽거나 hover해도 새 조회 없이 같은 사진과 목적지를 유지한다", async () => {
  const [landing, planner] = await Promise.all([
    source("features/landing/components/LandingRegionStory.tsx"),
    source("features/planner/components/PlannerRegionDiscovery.tsx"),
  ]);
  for (const region of [landing, planner]) {
    assert.match(region, /src=\{photo\.image\}/);
    assert.match(region, /loading="lazy" decoding="async"/);
    assert.doesNotMatch(region, /onMouseEnter|onPointerEnter|onMouseMove|fetch\(|setInterval/);
    assert.match(region, /aria-expanded=\{expanded\}/);
    assert.match(region, /regionPhotoSource\(photo\)\.href/);
  }
  assert.match(landing, /regionShowcaseAlbums\[name\]\[0\]/);
  assert.match(planner, /regionShowcasePhotos\[name\]/);
  assert.match(planner, /onClick=\{\(\) => onChange\(name\)\}/);
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
