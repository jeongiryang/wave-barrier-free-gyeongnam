import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

for (const failed of [false, true]) test(`place details load on opening; ${failed ? "failed" : "loaded"} content preserves focus and trip actions`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let contentRequests = 0;
  await page.route("**/features/planner/components/PlaceDecisionContent.tsx*", route => {
    contentRequests++;
    return failed ? route.abort("failed") : route.continue();
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  expect(contentRequests).toBe(0);
  const trigger = page.locator(".place-card").filter({ has: page.getByRole("heading", { name: "경남도립미술관", exact: true }) }).getByRole("button", { name: "이용 정보", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "경남도립미술관", exact: true });
  await expect(dialog.getByRole("heading")).toBeFocused();
  if (failed) await expect(dialog.getByRole("alert")).toContainText("상세 화면을 불러오지 못했어요");
  else await expect(dialog.getByText(/현장 접근 가능성을 보장하지 않습니다/)).toBeVisible();
  expect(contentRequests).toBe(1);
  await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeEnabled();
  expect((await new AxeBuilder({ page }).include(".native-place-dialog").analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "일정에 추가", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
});
