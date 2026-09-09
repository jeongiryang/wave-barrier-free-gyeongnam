import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

test("starting a new region trip clears old facilities and activities while keeping the archive", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner?travelStart=2026-10-07&travelEnd=2026-10-08");
  await chooseTripConditions(page);
  const facilities = page.getByRole("group", { name: "여행 편의 조건 선택" });
  const activities = page.getByRole("group", { name: "무엇을 하고 싶나요?" });
  await expect(facilities.locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(1);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "내 일정에 저장", exact: true }).click();
  await expect(page.locator(".travel-book-archive-action [role=status]")).toContainText("내 일정에 저장했어요");
  const archive = await page.evaluate(() => localStorage.getItem("wave-travel-book-v1"));
  const picker = page.getByRole("group", { name: "여행 지역 선택", exact: true });
  const nextRegion = picker.getByRole("button", { name: "고성", exact: true });
  await nextRegion.click();
  await page.getByRole("dialog").getByRole("button", { name: "새 여행으로 시작", exact: true }).click();
  await expect(nextRegion).toHaveAttribute("aria-pressed", "true");
  await expect(nextRegion).toBeFocused();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
  await expect(facilities).toBeVisible();
  await expect(activities).toBeVisible();
  await expect(facilities.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".condition-actions").getByRole("button", { name: "여행지 찾기 →", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("wave-travel-book-v1"))).toBe(archive);
  for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await nextRegion.focus();
    await page.locator("#conditions").screenshot({ path: test.info().outputPath(`new-trip-neutral-${width}.png`) });
  }
});
