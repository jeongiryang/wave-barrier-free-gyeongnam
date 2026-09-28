import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

test("delayed detail content cannot move arrival controls during their first click", async ({ page }) => {
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/features/planner/components/PlaceDecisionContent.tsx*", async route => { await pending; await route.continue(); });
  try {
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "경남도립미술관", exact: true });
    await expect(dialog.getByRole("status")).toContainText("상세 정보를 불러오는 중");
    const preview = dialog.locator("summary").filter({ hasText: /^주차·입구·시설 미리보기$/ });
    await expect(preview).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeEnabled();
    release();
    await preview.click();
    const facilities = dialog.getByRole("button", { name: "3. 시설", exact: true });
    await facilities.click();
    await expect(facilities).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator(".dining-accessibility")).toBeVisible();
  } finally { release(); }
});

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
  else await expect(dialog.getByRole("link", { name: "정보 이용 안내 (새 창)", exact: true })).toBeVisible();
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
