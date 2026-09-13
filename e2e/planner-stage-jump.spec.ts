import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, openItinerary } from "./fixtures";

for (const view of ['overview', 'guided'] as const) for (const motion of ['reduce', 'no-preference'] as const) {
  test(`${view} ${motion}: legacy links and the two-tab view preserve date, order and keyboard focus`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: view }); await page.emulateMedia({ reducedMotion: motion });
    await page.goto('/planner'); await chooseTripConditions(page);
    await page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
    await openItinerary(page, { start: '2026-10-14' });
    const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values);
    const before = await read();
    for (const width of [page.viewportSize()!.width, 960]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [hash, itinerary] of [['conditions', false], ['itinerary', true], ['places', false], ['departure-readiness', true], ['conditions', false]] as const) {
        await page.evaluate(hash => { history.pushState(null, '', `#${hash}`); dispatchEvent(new PopStateEvent('popstate')); }, hash);
        await expect(page.locator('.simple-planner-tabs button').nth(itinerary ? 1 : 0)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator(itinerary ? '#itinerary' : '#conditions')).toBeVisible();
        if (hash === 'itinerary') await expect(page.locator('#itinerary-stage-title')).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      }
    }
    const after = await read();
    for (const key of ['wave-trip-schedule-v1', 'wave-saved-places', 'wave-trip-order-v1', 'wave-trip-identity-v1']) expect(after[key]).toBe(before[key]);
    await page.locator('.simple-planner-tabs button').nth(1).focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#itinerary-stage-title')).toBeFocused();
  });
}
