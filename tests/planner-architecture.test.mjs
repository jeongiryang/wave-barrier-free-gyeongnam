import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function plannerSignalsSource() {
  return (await Promise.all([
    "features/planner/hooks/usePlannerSignals.ts",
    "features/planner/hooks/useServiceHealth.ts",
    "features/planner/hooks/usePlannerEnrichment.ts",
    "features/planner/hooks/useRegionWeather.ts",
  ].map(source))).join("\n");
}

async function routePlanningSource() {
  return (await Promise.all([
    "features/planner/hooks/useRoutePlanning.ts",
    "features/planner/hooks/useRouteRequest.ts",
    "features/planner/services/route-data.ts",
  ].map(source))).join("\n");
}

test("planner page delegates derived data and browser lifecycles to feature modules", async () => {
  const [page, viewModel, actions, placeAdapters, dialogFocus, autoRefresh] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/view-model.ts"),
    Promise.all([
      source("features/planner/hooks/usePlannerActions.ts"),
      source("features/planner/hooks/usePlannerPointActions.ts"),
      source("features/planner/hooks/usePlannerImpactAction.ts"),
      source("features/planner/hooks/useBookingRouteClipboard.ts"),
    ]).then((parts) => parts.join("\n")),
    source("features/planner/place-adapters.ts"),
    source("features/planner/hooks/usePlaceDialogFocus.ts"),
    source("features/planner/hooks/usePlannerAutoRefresh.ts"),
  ]);

  assert.match(page, /buildPlannerViewModel/);
  assert.match(page, /usePlannerActions/);
  assert.match(page, /usePlaceDialogFocus/);
  assert.match(page, /usePlannerAutoRefresh/);
  assert.doesNotMatch(page, /assessTripImpact|fallbackProviderDefinitions|addEventListener\("keydown"/);
  assert.match(viewModel, /buildFallbackTransportProviders/);
  assert.match(viewModel, /assessTripImpact/);
  assert.match(actions, /import \{ mapPlaceToPlannerPlace, richSpotToPlace \}/);
  assert.match(placeAdapters, /export function richSpotToPlace/);
  assert.match(placeAdapters, /export function mapPlaceToPlannerPlace/);
  assert.match(dialogFocus, /previousFocus\?\.focus\(\)/);
  assert.match(autoRefresh, /window\.clearTimeout\(timer\)/);
});

test("planner starts with trip conditions and composes recommendation route and live context in one journey section", async () => {
  const page = await source("app/planner/page.tsx");
  for (const component of [
    "PlannerServiceStatus",
    "PlannerConditionsPanel",
    "RecommendationWorkspace",
    "PlannerResultsPanel",
    "TravelSignalsPanel",
    "NavigationWorkspace",
  ]) {
    assert.match(page, new RegExp(`<${component}`));
  }
  assert.ok(page.indexOf("<PlannerConditionsPanel") < page.indexOf("<PlannerServiceStatus"));
  assert.match(page, /<section className="planner-journey-workspace" id="journey"/);
  const journeyStart = page.indexOf('<section className="planner-journey-workspace"');
  const journeyEnd = page.indexOf("</section>", journeyStart);
  const journey = page.slice(journeyStart, journeyEnd);
  assert.match(journey, /<RecommendationWorkspace/);
  assert.match(journey, /<PlannerResultsPanel/);
  assert.match(journey, /<TravelSignalsPanel/);
  assert.doesNotMatch(page, /PlannerEvidencePanel|믿을 수 있는 여행 추천|<PhotoCourseRestore/);
  assert.doesNotMatch(page, /className="planner-bento"|className="place-carousel"|className="weather-board"|className="navigation-workspace"|className="api-bento"/);
});

test("travel signals compose independent weather, impact, insight and theme sections", async () => {
  const [signals, secondary] = await Promise.all([
    source("features/planner/components/TravelSignalsPanel.tsx"),
    source("features/planner/components/PlannerSecondaryInsights.tsx"),
  ]);
  assert.match(signals, /<WeatherBoard/);
  assert.match(signals, /<SituationImpactPanel/);
  assert.match(signals, /lazy\(\(\) => import\("\.\/PlannerSecondaryInsights"\)\)/);
  assert.match(signals, /<Suspense/);
  assert.match(secondary, /<RegionalInsights/);
  assert.match(secondary, /<ThemeExplorer/);
  assert.doesNotMatch(signals, /className="weather-current"|className="impact-signal-grid"|className="visitor-insight"|className="rich-card"/);
  assert.doesNotMatch(secondary, /className="weather-current"|className="impact-signal-grid"/);
});

test("navigation workspace delegates transport data and map route interactions", async () => {
  const [workspace, transportOverview, transportModes, transportProviders, transportDataset, mapWorkspace, pointPicker, routeComparison] = await Promise.all([
    source("features/planner/components/NavigationWorkspace.tsx"),
    source("features/planner/components/TransportDataOverview.tsx"),
    source("features/planner/components/TransportModeSelector.tsx"),
    source("features/planner/components/TransportProviderDetails.tsx"),
    source("features/planner/components/TransportDatasetPanel.tsx"),
    source("features/planner/components/RouteMapWorkspace.tsx"),
    source("features/planner/components/TripPointPicker.tsx"),
    source("features/planner/components/RouteComparisonPanel.tsx"),
  ]);
  const transport = `${transportOverview}\n${transportModes}\n${transportProviders}\n${transportDataset}`;
  const mapRoute = `${mapWorkspace}\n${pointPicker}\n${routeComparison}`;

  assert.match(workspace, /<TransportDataOverview/);
  assert.match(workspace, /<RouteMapWorkspace/);
  assert.match(workspace, /도보 · 자전거 · 대중교통 · 자동차/);
  assert.doesNotMatch(workspace, /transport-data-results|trip-point-picker|route-mode-options/);
  assert.match(transport, /transport-data-results/);
  assert.match(mapRoute, /trip-point-picker/);
  assert.match(mapRoute, /<RouteMap/);
  for (const label of ["도보", "자전거", "대중교통", "자동차"]) assert.match(routeComparison, new RegExp(label));
  for (const kakaoMode of ["walk", "bicycle", "traffic", "car"]) assert.match(routeComparison, new RegExp(`kakaoMode: "${kakaoMode}"`));
  assert.match(routeComparison, /a\.alternative\?\.totalTime/);
  assert.match(routeComparison, /Number\.POSITIVE_INFINITY/);
  assert.doesNotMatch(routeComparison, /가장 빠름|가장 저렴함|환승 최소|걷기 최소/);
});

test("planner domain types are shared across route and signal controllers", async () => {
  const [types, routePlanning, signals] = await Promise.all([
    source("features/planner/types.ts"),
    routePlanningSource(),
    plannerSignalsSource(),
  ]);

  assert.match(types, /export type DestinationCrowd/);
  assert.match(types, /export type RichMode/);
  assert.match(routePlanning, /import type \{ DestinationCrowd/);
  assert.match(signals, /RichMode/);
  assert.doesNotMatch(routePlanning, /type DestinationCrowd =/);
  assert.doesNotMatch(signals, /type RichMode =/);
});

test("route request lifecycle delegates endpoint construction to the data service", async () => {
  const [request, service] = await Promise.all([
    source("features/planner/hooks/useRouteRequest.ts"),
    source("features/planner/services/route-data.ts"),
  ]);
  assert.match(request, /fetchDestinationCrowd/);
  assert.match(request, /fetchRouteData/);
  assert.doesNotMatch(request, /new URLSearchParams|\/api\/route|\/api\/wave/);
  assert.match(service, /new URLSearchParams/);
  assert.match(service, /\/api\/route/);
  assert.match(service, /action: "crowd"/);
});
