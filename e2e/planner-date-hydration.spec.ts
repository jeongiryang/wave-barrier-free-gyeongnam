import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

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
      const conditions = page.locator('#conditions'); await expect(conditions.locator('input[type=date]')).toHaveCount(0);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-trip-schedule-v1') || '{}').travelStart || '')).toBe('');
      await chooseTripConditions(page); await page.locator('.simple-place-row').first().locator('.simple-place-add').click();
      await page.locator(".wave-header .wave-my-trips").click();
      const draft = page.locator('.simple-initial-setup'); await expect(draft.getByLabel('시작일', { exact: true })).toHaveValue(expectedDate);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-trip-schedule-v1') || '{}').travelStart || '')).toBe('');
      await page.reload(); await page.locator(".wave-header .wave-my-trips").click();
      await expect(draft.getByLabel('시작일', { exact: true })).toHaveValue(expectedDate);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-trip-schedule-v1') || '{}').travelStart || '')).toBe('');
      expect(errors).toEqual([]);
    });
  });
}
