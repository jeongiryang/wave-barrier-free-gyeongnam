import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions, openItinerary } from "./fixtures";

test('English shell preserves the two-tab itinerary gate, history and focus', async ({ page }) => {
  await mockPlannerApi(page); await page.addInitScript(() => localStorage.setItem('wave-locale', 'en'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/planner');
  const tabs = page.locator('.simple-planner-tabs button');
  await expect(tabs).toHaveCount(2); await expect(tabs.nth(1)).toBeDisabled();
  await expect(page.getByRole('navigation', { name: 'Main menu', exact: true })).toBeVisible();
  await chooseTripConditions(page);
  await expect(page.locator('.simple-results-heading')).toContainText('2 places loaded');
  await page.getByRole('button', { name: '경남도립미술관 add to itinerary', exact: true }).click();
  await expect(tabs.nth(1)).toBeEnabled();
  await openItinerary(page, { start: '2026-10-14' });
  await tabs.first().click(); await expect(page).toHaveURL(/#conditions$/);
  await page.goBack();
  await expect(tabs.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#itinerary')).toBeVisible();
  await expect(page.locator('#itinerary-stage-title')).toBeFocused();
  expect((await new AxeBuilder({ page }).include('.simple-planner-heading').include('.simple-footer').analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

for (const response of ['empty', 'error'] as const) {
  test(`English results distinguish loading and ${response} without enabling an empty itinerary`, async ({ page }) => {
    await mockPlannerApi(page); await page.addInitScript(() => localStorage.setItem('wave-locale', 'en'));
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/wave?action=plan*', async route => {
      await gate;
      await route.fulfill(response === 'error' ? { status: 503, json: { error: 'Unavailable' } } : { json: { mode: 'live', generatedAt: '2026-09-06T00:00:00Z', baseYm: '202609', course: null, audio: null, places: [], stops: [], statuses: [] } });
    });
    await page.goto('/planner?region=창원');
    try { await expect(page.locator('.simple-search-progress')).toHaveText('Finding places.'); } finally { release(); }
    await expect(page.locator('.simple-results')).toHaveAttribute('aria-busy', 'false');
    if (response === 'error') { await expect(page.locator('.simple-result-notice[role="alert"]')).toBeVisible(); await expect(page.locator('.simple-empty')).toHaveCount(0); }
    else await expect(page.locator('.simple-empty')).toHaveText('No places were returned for these preferences.');
    await expect(page.locator('.simple-planner-tabs button').nth(1)).toBeDisabled();
  });
}
