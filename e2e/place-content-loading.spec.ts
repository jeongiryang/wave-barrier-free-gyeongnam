import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

for (const failed of [false, true]) test(`place details load on opening; ${failed ? "failed" : "loaded"} content preserves focus and trip actions`, async ({ page }) => {
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let contentRequests = 0;
  await page.route("**/features/planner/components/PlaceDecisionContent.tsx*", route => {
    contentRequests++;
    return failed ? route.abort("failed") : route.continue();
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  expect(contentRequests).toBe(0);
  const trigger = page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "경남도립미술관", exact: true });
  await expect(dialog.getByRole("heading")).toBeFocused();
  if (failed) await expect(dialog.getByRole("alert")).toContainText("상세 화면을 불러오지 못했어요");
  else await expect(dialog.getByText(/공식 시설 정보는 안전 인증이나 접근 가능성 보장이 아닙니다/)).toBeVisible();
  expect(contentRequests).toBe(1);
  await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeEnabled();
  expect((await new AxeBuilder({ page }).include(".native-place-dialog").analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "일정에 추가", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(contentRequests).toBe(1);
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values);
  expect(JSON.parse(draft["wave-saved-places"] || "[]")).toEqual(["1001"]);
  expect(JSON.parse(draft["wave-trip-schedule-v1"] || "{}").travelStart || "").toBe("");
  await expect(page.locator(".wave-header").locator(".wave-my-trips")).toContainText("1");
});
