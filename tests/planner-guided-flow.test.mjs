import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("지역을 고르면 결과를 보고 담은 장소는 별도 내 일정 화면에서 편집한다", async () => {
  const [page, header, criteria, results, settings, itinerary] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/PlannerHeader.tsx"),
    source("features/planner/components/PlannerConditionsPanel.tsx"),
    source("features/planner/components/RecommendationCarousel.tsx"),
    source("features/planner/components/TripSettingsEditor.tsx"),
    source("features/planner/components/PlannerItineraryWorkspace.tsx"),
  ]);
  assert.match(header, /aria-label="여행 설계 화면"/);
  assert.match(header, /onNavigate\("conditions"\)/);
  assert.match(header, /onNavigate\("itinerary"\)/);
  assert.match(page, /const browsing = journey\.activeStepId === "conditions" \|\| journey\.activeStepId === "places"/);
  assert.match(page, /<div hidden=\{!browsing\} className="simple-browse-view">/);
  assert.match(page, /<div hidden=\{browsing\} className="simple-itinerary-view">/);
  assert.match(page, /onRegionChange=\{regionChange\.request\}/);
  assert.match(page, /region && <RecommendationWorkspace/);
  assert.match(criteria, /onChange=\{event => onRegionChange\(event\.target\.value\)\}/);
  assert.match(criteria, /!plan\.region &&[\s\S]*<PlannerRegionDiscovery/);
  assert.match(results, /onToggle=\{\(\) => trip\.toggleSaved\(place\.id\)\}/);
  assert.match(results, /current=\{resultCurrent\}/);
  assert.match(itinerary, /if \(!props\.tripSelection\.travelStart\) return <InitialTripSetup trip=\{props\.tripSelection\}/);
  assert.match(settings, /type: 'schedule', start, end, startTime: time, transport/);
  assert.match(settings, /trip\.orderedSavedPlaces\.map\(place => place\.name\)/);
  assert.doesNotMatch(page + header, /<PlannerStageFrame|<PlannerJourneyRail|<PlannerJourneyModeToggle/);
});

test("PC는 같은 날짜의 시간표 왼쪽과 지도 오른쪽, 모바일은 접근 가능한 보기 전환을 제공한다", async () => {
  const [itinerary, board, css] = await Promise.all([
    source("features/planner/components/PlannerItineraryWorkspace.tsx"),
    source("features/planner/components/PlannerItineraryBoard.tsx"),
    source("app/styles/simple-planner.css"),
  ]);
  assert.match(itinerary, /matchMedia\('\(min-width:1024px\)'\)/);
  assert.match(itinerary, /media\.removeEventListener\('change', update\)/);
  assert.match(itinerary, /const mapView = desktop \|\| props\.mapView/);
  assert.match(itinerary, /!desktop &&[\s\S]*aria-label="일정 보기 방식"/);
  assert.match(itinerary, /aria-pressed=\{!mapView\} onClick=\{\(\) => setMapView\(false\)\}>시간표/);
  assert.match(itinerary, /aria-pressed=\{mapView\} onClick=\{\(\) => setMapView\(true\)\}>지도/);
  assert.ok(board.indexOf('className="simple-timeboard"') < board.indexOf('className="simple-itinerary-map"'));
  assert.match(board, /schedule\.find\(day => day\.day === trip\.activeDay\)/);
  assert.match(itinerary, /scheduleAssignments\[place\.id\] \|\| tripDays\[0\]\) === activeDay/);
  assert.match(board, /aria-label="날짜별 여행 일정"/);
  assert.match(board, /aria-pressed=\{day === trip\.activeDay\}/);
  assert.match(css, /@media\(min-width:1024px\)\s*\{[\s\S]*?\.simple-itinerary-board\[data-map=true\] \{ grid-template-columns: minmax\(360px,\.9fr\) minmax\(0,1\.1fr\)/);
  assert.match(css, /@media\(max-width:1023px\) \{ \.simple-itinerary-board\[data-map=true\] \.simple-timeboard \{ display: none/);
});
