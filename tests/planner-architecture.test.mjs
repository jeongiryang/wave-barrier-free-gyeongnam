import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("planner page delegates derived data and browser lifecycles to feature modules", async () => {
  const [page, viewModel, actions, dialogFocus, autoRefresh] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/view-model.ts"),
    source("features/planner/hooks/usePlannerActions.ts"),
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
  assert.match(actions, /richSpotToPlace/);
  assert.match(dialogFocus, /previousFocus\?\.focus\(\)/);
  assert.match(autoRefresh, /window\.clearTimeout\(timer\)/);
});

test("planner route composes feature sections instead of owning their dense UI", async () => {
  const page = await source("app/planner/page.tsx");
  for (const component of [
    "PlannerServiceStatus",
    "PlannerConditionsPanel",
    "RecommendationWorkspace",
    "TravelSignalsPanel",
    "NavigationWorkspace",
    "PlannerResultsPanel",
  ]) {
    assert.match(page, new RegExp(`<${component}`));
  }
  assert.doesNotMatch(page, /className="planner-bento"|className="place-carousel"|className="weather-board"|className="navigation-workspace"|className="api-bento"/);
});

test("navigation workspace delegates transport data and map route interactions", async () => {
  const [workspace, transport, mapRoute] = await Promise.all([
    source("features/planner/components/NavigationWorkspace.tsx"),
    source("features/planner/components/TransportDataOverview.tsx"),
    source("features/planner/components/RouteMapWorkspace.tsx"),
  ]);

  assert.match(workspace, /<TransportDataOverview/);
  assert.match(workspace, /<RouteMapWorkspace/);
  assert.doesNotMatch(workspace, /transport-data-results|trip-point-picker|route-options/);
  assert.match(transport, /transport-data-results/);
  assert.match(mapRoute, /trip-point-picker/);
  assert.match(mapRoute, /<RouteMap/);
});

test("planner domain types are shared across route and signal controllers", async () => {
  const [types, routePlanning, signals] = await Promise.all([
    source("features/planner/types.ts"),
    source("features/planner/hooks/useRoutePlanning.ts"),
    source("features/planner/hooks/usePlannerSignals.ts"),
  ]);

  assert.match(types, /export type DestinationCrowd/);
  assert.match(types, /export type RichMode/);
  assert.match(routePlanning, /import type \{ DestinationCrowd/);
  assert.match(signals, /RichMode/);
  assert.doesNotMatch(routePlanning, /type DestinationCrowd =/);
  assert.doesNotMatch(signals, /type RichMode =/);
});
