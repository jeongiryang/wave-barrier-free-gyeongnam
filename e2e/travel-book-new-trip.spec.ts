import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

async function openSavedTravelBook(page: Page) {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner?travelStart=2026-10-07&travelEnd=2026-10-08");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "내 일정에 저장", exact: true }).click();
  await expect(page.locator(".travel-book-archive-action [role=status]")).toContainText("내 일정에 저장했어요");
  await page.getByRole("link", { name: /저장한 일정 보기/ }).click();
  await expect(page.getByRole("heading", { name: "창원 1곳 여행" })).toBeVisible();
  return page.evaluate(() => localStorage.getItem("wave-travel-book-v1"));
}

test("new trip from the travel book starts with empty conditions and keeps archived trips", async ({ page }) => {
  const archive = await openSavedTravelBook(page);
  const today = await page.evaluate(() => new Date().toLocaleDateString("en-CA"));
  await page.getByText("새 여행 설계", { exact: true }).click();
  const confirmation = page.getByRole("dialog");
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "새 여행 시작", exact: true }).click();
  await expect(page).toHaveURL(/\/planner(?:#conditions)?$/);
  await expect(page.locator(".reference-region-grid")).toBeVisible();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "여행 지역 선택", exact: true }).locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByRole("group", { name: "여행 편의 조건 선택" }).locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByRole("group", { name: "무엇을 하고 싶나요?" }).locator('[aria-pressed="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("wave-travel-book-v1"))).toBe(archive);
  const current = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values);
  expect(current["wave-saved-places"]).toBe("[]");
  expect(current["wave-planner-region-v1"]).toBe("");
  expect(JSON.parse(current["wave-trip-schedule-v1"]).travelStart).toBe(today);
  await page.reload();
  await expect(page.locator(".reference-region-grid")).toBeVisible();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "여행 지역 선택", exact: true }).locator('[aria-pressed="true"]')).toHaveCount(0);
});

for (const theme of ["light", "dark"]) test(`${theme}: new trip cancellation and failed storage commit preserve the active trip and archive`, async ({ page }) => {
  await page.addInitScript(theme => localStorage.setItem("wave-theme", theme), theme);
  const archive = await openSavedTravelBook(page);
  const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /^wave-(current-trip|saved-place|trip-|planner-region)/.test(key))));
  const trigger = page.getByRole("button", { name: "새 여행 설계", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toBeFocused();
  expect((await new AxeBuilder({ page }).include(".region-change-dialog").analyze()).violations).toEqual([]);
  for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await dialog.screenshot({ path: test.info().outputPath(`new-trip-confirm-${width}.png`) });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "기존 일정 유지", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /^wave-(current-trip|saved-place|trip-|planner-region)/.test(key))))).toEqual(before);

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "wave-current-trip-v1") throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await trigger.click();
  await dialog.getByRole("button", { name: "새 여행 시작", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("기존 일정은 유지됩니다");
  await expect(page).toHaveURL(/\/travel-book$/);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /^wave-(current-trip|saved-place|trip-|planner-region)/.test(key))))).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem("wave-travel-book-v1"))).toBe(archive);
});
