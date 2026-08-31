import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("공식 편의근거가 없는 장소는 추천과 자동 일정에서 분리한다", async ({ page }) => {
  await mockPlannerApi(page, { explorationOnly: true });
  await page.goto("/planner");

  await expect(page.getByRole("heading", { name: /공식 편의근거를 확인한 장소가 아직 없습니다/ })).toBeVisible();
  await expect(page.locator(".place-card:not(.place-card-skeleton)")).toHaveCount(0);
  const exploration = page.getByRole("region", { name: "공식 편의근거를 더 확인해야 하는 장소" });
  await expect(exploration.locator("article")).toHaveCount(2);
  await expect(exploration.getByText("선택 조건 일치 0%", { exact: true })).toBeVisible();
  await expect(exploration.getByText("공식 편의근거 미확인", { exact: true })).toBeVisible();
  await expect(page.getByText("자동 일정을 만들지 않았습니다.", { exact: true })).toBeVisible();

  await exploration.getByRole("button", { name: "근거 상세 확인" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "추천에서 분리한 이유" })).toBeVisible();
  await expect(dialog.getByText("공식 편의정보에서 선택 조건과 일치하는 항목을 확인하지 못했습니다.")).toBeVisible();
});

test("교통·요금·임시 이동값은 확인 범위를 그대로 말한다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");

  await expect(page.getByText("교통정보 1개 직접 확인", { exact: true })).toBeVisible();
  await expect(page.getByText("통행료 없음", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("경로 미확인 · 임시 30분", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("공식 정보 미제공", { exact: true })).toBeVisible();
});
