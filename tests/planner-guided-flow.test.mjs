import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("새 여행자는 한 단계씩 보고 필요하면 전체 보기로 전환한다", async () => {
  const [page, viewHook, modeToggle, stageFrame] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/hooks/usePlannerStageView.ts"),
    source("features/planner/components/PlannerJourneyModeToggle.tsx"),
    source("features/planner/components/PlannerStageFrame.tsx"),
  ]);

  assert.match(viewHook, /useSyncExternalStore\(subscribe, currentView, serverView\)/);
  assert.match(viewHook, /wave-planner-stage-view-v1/);
  assert.match(viewHook, /wave-planner-active-step-v1/);
  assert.match(viewHook, /navigation: \{ step: "itinerary", target: "navigation" \}/);
  assert.match(viewHook, /route: \{ step: "itinerary", target: "itinerary" \}/);
  assert.match(viewHook, /scrollToSection\(destination\.target, prefersReducedMotion\(\)\)/);
  assert.match(modeToggle, /aria-pressed=\{view === "guided"\}/);
  assert.match(modeToggle, /aria-pressed=\{view === "overview"\}/);
  assert.match(stageFrame, /hidden=\{view === "guided" && !active\}/);
  assert.equal((page.match(/<PlannerStageFrame/g) ?? []).length, 4);
  assert.match(page, /observeSections: stageView\.view === "overview"/);
  assert.match(page, /activeStepId: stageView\.activeStepId/);
  assert.match(page, /onActiveStepChange: stageView\.changeStep/);
  assert.match(page, /interactive=\{hydrated\}/);
  assert.match(modeToggle, /disabled=\{!interactive\}/);
});

test("PDF 여행 단계는 사용자가 할 선택을 제목으로 안내한다", async () => {
  const content = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/PlannerStageFrame.tsx"),
    source("features/planner/components/PlannerConditionsPanel.tsx"),
    source("features/planner/components/RecommendationCarousel.tsx"),
    source("features/planner/components/PlannerItineraryWorkspace.tsx"),
    source("features/planner/components/DepartureReadinessCard.tsx"),
  ]).then((parts) => parts.join("\n"));

  for (const question of [
    "어떤 편의가 필요할까요?",
    "어떤 여행지가 끌리나요?",
    "여행 순서를 편하게 정리하세요.",
    "출발 전, 무엇을 확인할까요?",
  ]) assert.match(content, new RegExp(question.replace("?", "\\?")));
});
