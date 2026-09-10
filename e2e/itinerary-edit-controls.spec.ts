import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

for (const { en, theme, width } of [{ en: false, theme: "light", width: 960 }, { en: true, theme: "dark", width: 1440 }]) {
  test(`itinerary date and time edits remain visible and persist ${en ? "EN" : "KO"} ${theme}`, async ({ page }, testInfo) => {
    await mockPlannerApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(theme => {
      localStorage.setItem("wave-theme", theme);
    }, theme);
    await page.goto("/planner?travelStart=2026-10-07&travelEnd=2026-10-09");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    if (en) {
      const preferences = page.locator(".preference-controls:visible");
      await preferences.locator("summary").focus();
      await preferences.getByLabel("환경설정 열기", { exact: true }).click();
      await preferences.getByLabel("언어", { exact: true }).selectOption("en");
      await preferences.getByLabel("Open preferences", { exact: true }).click();
    }
    const panel = page.locator(".day-planner");
    const chooseTime = panel.getByRole("button", { name: en ? "Choose time" : "시간 선택", exact: true });
    await chooseTime.focus();
    await chooseTime.press("Enter");
    await page.keyboard.press("Escape");
    const time = panel.locator("#day-start-time");
    await expect(time).toBeFocused();
    await time.fill("11:30");
    const date = panel.getByLabel(en ? "경남도립미술관 trip date" : "경남도립미술관 여행 날짜", { exact: true });
    await expect(date.locator("..")).toContainText(en ? "Change visit date" : "방문 날짜 변경");
    await date.selectOption("2026-10-09");
    await expect(panel.locator(".day-planner-grid > article").nth(2)).toContainText("경남도립미술관");
    await page.reload();
    await expect(time).toHaveValue("11:30");
    await expect(date).toHaveValue("2026-10-09");
    await expect(panel.locator(".day-planner-grid > article").nth(0).locator("li")).toHaveCount(0);
    await page.setViewportSize({ width, height: 1000 });
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toHaveCSS("opacity", "1");
    for (const control of [time, chooseTime, date]) {
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await panel.screenshot({ path: testInfo.outputPath("itinerary-timeline.png") });
    expect((await new AxeBuilder({ page }).include(".day-planner").analyze()).violations).toEqual([]);
  });
}
