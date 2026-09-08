import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

for (const [timezoneId, expectedDate] of [["Asia/Seoul", "2030-01-01"], ["America/Los_Angeles", "2029-12-31"]]) {
  test.describe(`planner date hydration in ${timezoneId}`, () => {
    test.use({ timezoneId });
    for (const locale of ["ko", "en"]) test(`a different browser clock keeps the initial DOM stable in ${locale}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await mockPlannerApi(page);
      await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
      // Leave timers/animation running while making client and SSR dates differ.
      await page.clock.setFixedTime(new Date("2030-01-01T00:30:00Z"));
      await page.goto("/planner");
      const conditions = page.locator("#conditions");
      await expect(conditions.getByLabel(locale === "en" ? "Start date" : "출발일", { exact: true })).toHaveValue(expectedDate);
      await expect(page.locator(".itinerary-day-tabs button")).toHaveCount(1);
      await expect(page.locator(".itinerary-day-tabs button")).toHaveText(expectedDate.slice(5).replace("-", "/"));
      await page.reload();
      await expect(conditions.getByLabel(locale === "en" ? "Start date" : "출발일", { exact: true })).toHaveValue(expectedDate);
      expect(errors).toEqual([]);
    });
  });
}
