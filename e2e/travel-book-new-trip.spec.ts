import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi, openItinerary } from "./fixtures";

async function archiveContent(page: Page) {
  return page.evaluate(() => (JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]") as Array<Record<string, unknown>>).map(book => Object.fromEntries(Object.entries(book).filter(([key]) => !["updatedAt", "identity"].includes(key)))));
}

async function openSavedTravelBook(page: Page) {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner?travelStart=2026-10-07&travelEnd=2026-10-08");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-10-07", end: "2026-10-08" });
  await page.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
    await acceptTripTimingWarning(page);
  await expect(page.locator(".simple-save-control [role=status]")).toContainText("내 여행에 저장했어요");
  await page.getByRole("link", { name: "저장한 여행", exact: true }).click();
  await expect(page.getByRole("heading", { name: "창원 1곳 여행" })).toBeVisible();
  return archiveContent(page);
}

async function expectEmptyConditions(page: Page) {
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("");
  await expect(page.locator(".simple-stops li")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "하고 싶은 활동", exact: true }).locator('[aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: /^필요한 편의/ }).click();
  const facilities = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await expect(facilities.locator(".simple-facility-grid input:checked")).toHaveCount(0);
  await facilities.getByRole("button", { name: "편의 선택 닫기", exact: true }).click();
  await expect(page.locator(".wave-header").locator(".wave-my-trips")).toHaveAttribute("href", "/travel-book");
}

test("new trip from the travel book starts with empty conditions and keeps archived trips", async ({ page }) => {
  const archive = await openSavedTravelBook(page);
  await page.getByText("새 여행 설계", { exact: true }).click();
  const confirmation = page.getByRole("dialog");
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "새 여행 시작", exact: true }).click();
  await expect(page).toHaveURL(/\/planner(?:#conditions)?$/);
  await expectEmptyConditions(page);
  // Explicit backup may update its timestamp/binding, never its saved content.
  expect(await archiveContent(page)).toEqual(archive);
  const current = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values);
  expect(current["wave-saved-places"]).toBe("[]");
  expect(current["wave-planner-region-v1"]).toBe("");
  expect(JSON.parse(current["wave-trip-schedule-v1"])).toMatchObject({ travelStart: "", travelEnd: "" });
  expect(JSON.parse(current["wave-trip-identity-v1"]).id).not.toBe(archive[0].tripId);
  await page.reload();
  await expectEmptyConditions(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values)).toEqual(current);
});

for (const theme of ["light", "dark"]) test(`${theme}: new trip cancellation and failed storage commit preserve the active trip and archive`, async ({ page }) => {
  await page.addInitScript(theme => localStorage.setItem("wave-theme", theme), theme);
  const archive = await openSavedTravelBook(page);
  const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /^wave-(current-trip|saved-place|trip-|planner-region)/.test(key))));
  const sessionProfiles = await page.evaluate(() => sessionStorage.getItem("wave-session-facilities-v1"));
  expect(JSON.parse(sessionProfiles || "[]")).toEqual(["parking", "route", "wheelchair", "elevator", "restroom"]);
  const trigger = page.getByRole("button", { name: "새 여행 설계", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toBeFocused();
  expect((await new AxeBuilder({ page }).include(".region-change-dialog").analyze()).violations).toEqual([]);
  for (const width of test.info().project.name.startsWith("desktop") ? [960, 1440] : [390, 320]) {
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
  expect(await page.evaluate(() => sessionStorage.getItem("wave-session-facilities-v1"))).toBe(sessionProfiles);

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
  expect(await archiveContent(page)).toEqual(archive);
  expect(await page.evaluate(() => sessionStorage.getItem("wave-session-facilities-v1"))).toBe(sessionProfiles);
});
