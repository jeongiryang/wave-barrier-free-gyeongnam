import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = []; errors.set(page, list);
  page.on("pageerror", error => list.push(error.message));
  page.on("console", message => { if (message.type() === "error") list.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });
async function prepare(page: Page, english: boolean, end = "2026-10-08", theme = "light") {
  await page.addInitScript(theme => localStorage.setItem("wave-theme", theme), theme);
  await mockPlannerApi(page);
  await page.goto(`/planner?travelStart=2026-10-07&travelEnd=${end}`);
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  if (english) {
    await page.keyboard.press("Control+Home");
    const preferences = page.locator(".preference-controls:visible");
    // Home does not establish focus in the scroll-hidden header.
    // Use its existing keyboard reveal contract before the same pointer action.
    const preferenceTrigger = preferences.locator("summary");
    await preferenceTrigger.focus();
    await expect(preferenceTrigger).toBeFocused();
    await expect(preferenceTrigger).toBeInViewport();
    await preferences.getByLabel("환경설정 열기", { exact: true }).click();
    await preferences.getByLabel("언어", { exact: true }).selectOption("en");
    await preferences.getByLabel("Open preferences", { exact: true }).click();
  }
  return page.locator(".day-planner");
}
for (const english of [false, true]) for (const theme of ["light", "dark"]) {
  test(`seven-day input and current itinerary stay consistent ${english ? "English" : "Korean"} ${theme}`, async ({ page }, testInfo) => {
    const itinerary = await prepare(page, english, "2026-10-08", theme);
    const end = itinerary.getByLabel(english ? "Trip end date" : "여행 마지막 날", { exact: true });
    await expect(end).toHaveAttribute("max", "2026-10-13");
    await end.fill("2026-10-16");
    await expect(end).toHaveValue("2026-10-08");
    await expect(itinerary.locator("#itinerary-date-notice")).toContainText(english ? "seven days" : "최대 7일");
    await expect(itinerary.locator(".day-planner-grid > article")).toHaveCount(2);
    await itinerary.getByLabel(english ? "Trip start date" : "여행 시작일", { exact: true }).fill("2026-10-10");
    await expect(end).toHaveValue("2026-10-10");
    await expect(itinerary.locator("#itinerary-date-notice")).toContainText("2026-10-10");
    await expect(itinerary.locator(".outside-trip-dates")).toContainText("2026-10-07");
    for (const width of [390, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await itinerary.scrollIntoViewIfNeeded();
      await expect(itinerary).toHaveCSS("opacity", "1");
      expect(await itinerary.locator(".outside-trip-dates li > span").evaluateAll(nodes => nodes.filter(node => node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1).map(node => node.textContent))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await itinerary.screenshot({ path: testInfo.outputPath(`date-notice-${width}-${english ? "en" : "ko"}.png`) });
    }
    expect((await new AxeBuilder({ page }).include(".day-planner").analyze()).violations).toEqual([]);
  });
  test(`outside dates require a choice before archiving ${english ? "English" : "Korean"} ${theme}`, async ({ page }) => {
    const itinerary = await prepare(page, english, "2026-10-08", theme);
    await itinerary.getByLabel(english ? "용지호수공원 trip date" : "용지호수공원 여행 날짜", { exact: true }).selectOption("2026-10-08");
    await itinerary.getByLabel(english ? "Trip end date" : "여행 마지막 날", { exact: true }).fill("2026-10-07");
    await expect(itinerary.locator(".outside-trip-dates")).toContainText("용지호수공원 · 2026-10-08");
    await expect(itinerary.locator(".day-planner-grid li")).toHaveCount(1);
    const archive = itinerary.getByRole("button", { name: english ? "Save itinerary" : "내 일정에 저장", exact: true });
    await expect(archive).toBeDisabled();
    await expect(itinerary.getByRole("button", { name: english ? "Create shared link" : "공유 링크 만들기", exact: true })).toBeDisabled();
    await expect(itinerary.locator("#archive-date-notice")).toContainText(english ? "original dates" : "원래 날짜");
    await itinerary.getByLabel(english ? "용지호수공원 move to a date in this trip" : "용지호수공원 이번 여행 날짜로 이동", { exact: true }).selectOption("2026-10-07");
    await expect(archive).toBeEnabled(); await archive.click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]"));
    expect(stored[0].travelEnd).toBe("2026-10-07"); expect(stored[0].scheduleAssignments["1002"]).toBe("2026-10-07");
    await page.reload();
    await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
  });
  test(`legacy long URL normalizes visibly ${english ? "English" : "Korean"} ${theme}`, async ({ page }) => {
    const itinerary = await prepare(page, english, "2026-10-16", theme);
    await expect(itinerary.getByLabel(english ? "Trip end date" : "여행 마지막 날", { exact: true })).toHaveValue("2026-10-13");
    await expect(itinerary.locator(".day-planner-grid > article")).toHaveCount(7);
    await expect(itinerary.locator("#itinerary-date-notice")).toContainText("2026-10-13");
    await itinerary.scrollIntoViewIfNeeded(); await expect(itinerary).toHaveCSS("opacity", "1");
  });
}
