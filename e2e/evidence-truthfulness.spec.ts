import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("공식 편의근거가 없는 장소는 추천과 이 기기 일정에서 분리한다", async ({ page }) => {
  await mockPlannerApi(page, { explorationOnly: true });
  await page.goto("/planner");

  await expect(page.getByRole("heading", { name: /선택한 편의조건이 공식 정보로 확인된 장소를 찾지 못했습니다/ })).toBeVisible();
  await expect(page.locator(".place-card:not(.place-card-skeleton)")).toHaveCount(0);
  const exploration = page.getByRole("region", { name: "편의시설 정보를 더 확인해야 하는 장소" });
  await expect(exploration.locator("article")).toHaveCount(2);
  await expect(exploration.getByText("선택한 편의와 불일치", { exact: true })).toBeVisible();
  await expect(exploration.getByText("공식 정보 확인 필요", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "이 기기 일정", exact: true }).getByText("아직 일정에 추가한 장소가 없어요.")).toBeVisible();

  await exploration.getByRole("button", { name: "이용 정보 확인" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "추천에서 분리한 이유" })).toBeVisible();
  await expect(dialog.getByText("공식 편의정보에서 선택 조건과 일치하는 항목을 확인하지 못했습니다.")).toBeVisible();
});

test("교통·요금·임시 이동값은 확인 범위를 그대로 말한다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");

  await expect(page.locator(".service-status-summary")).toContainText("교통정보 1개 직접 확인");
  await expect(page.getByText("통행료 없음", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("시간 정보 없음", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /도보 걸어서 이동 시간 정보 없음/ }).click();
  await expect(page.getByText("없는 시간을 임의로 만들지 않습니다.")).toBeVisible();
  await expect(page.getByRole("link", { name: /카카오맵에서 도보 확인/ })).toBeVisible();
});
