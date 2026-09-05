import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Journey Control Center가 네 단계와 실제 여행 상태를 연결한다", async () => {
  const [page, rail, hook, styles] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/PlannerJourneyRail.tsx"),
    source("features/planner/hooks/useJourneyProgress.ts"),
    source("app/styles/planner-journey-control.css"),
  ]);
  assert.match(page, /<PlannerJourneyRail/);
  assert.match(page, /journey-control-layout/);
  assert.match(page, /reviewed: reviewedTrip === reviewSignature/);
  for (const id of ["conditions", "places", "itinerary", "departure-readiness"]) {
    assert.match(hook, new RegExp(`id: "${id}"`));
  }
  assert.match(rail, /aria-current=\{active \? "step"/);
  assert.match(rail, /role="progressbar"/);
  assert.match(styles, /grid-template-columns: minmax\(220px,260px\)/);
  assert.match(styles, /max-width: 1560px[\s\S]*\.journey-stage-stream \.navigation-workspace \{ grid-template-columns: minmax\(0,1fr\)/);
  assert.match(styles, /position: fixed/);
  assert.match(styles, /min-height: 58px/);
});

test("환경설정과 플래너 select가 44px 및 키보드 초점 계약을 가진다", async () => {
  const [preferences, hardening] = await Promise.all([
    source("app/styles/preferences.css"),
    source("app/styles/mobile-interaction-hardening.css"),
  ]);
  assert.match(preferences, /\.preference-row select \{[^}]*min-height: 44px/s);
  assert.match(preferences, /\.preference-row select:focus-visible \{[^}]*outline: 3px/s);
  assert.match(hardening, /\.select-shell select:focus-visible/);
  assert.match(hardening, /outline: 3px solid #ffb800/);
});

test("모든 GitHub workflow는 Node 24 런타임 기반 action을 사용한다", async () => {
  const workflows = await Promise.all([
    ".github/workflows/ci.yml",
    ".github/workflows/cd.yml",
    ".github/workflows/release.yml",
    ".github/workflows/release-backfill.yml",
  ].map(source));
  for (const workflow of workflows) {
    assert.match(workflow, /actions\/checkout@v7/);
    assert.match(workflow, /actions\/setup-node@v7/);
    assert.doesNotMatch(workflow, /actions\/(checkout|setup-node)@v4/);
  }
});
