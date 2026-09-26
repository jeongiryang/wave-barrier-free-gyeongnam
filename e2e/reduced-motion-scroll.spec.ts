import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions, openItinerary } from "./fixtures";

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`${reducedMotion}: 담기와 두 화면 전환에 불필요한 스크롤 애니메이션을 넣지 않는다`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      const original = Element.prototype.scrollIntoView;
      const calls: string[] = [];
      Object.assign(window, { waveScrollBehaviors: calls });
      Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
        calls.push(typeof arg === 'object' ? arg.behavior || 'unspecified' : 'unspecified');
        return original.call(this, arg);
      };
    });
    await mockPlannerApi(page); await page.goto('/planner'); await chooseTripConditions(page);
    const row = page.locator('.simple-place-row').first();
    await row.locator('.simple-place-add').click();
    await expect(row.locator('.simple-place-add')).toHaveAttribute('aria-pressed', 'true');
    // Adding stays in the current results. The old five-stage scroll is removed.
    await expect(page.locator("#conditions")).toBeVisible();
    await expect(row).toBeInViewport();
    await openItinerary(page, { start: '2026-10-08' });
    await expect(page.locator('.simple-stops > li')).toHaveCount(1);
    await expect(page.locator("#itinerary")).toBeVisible();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const calls = await page.evaluate(() => (window as unknown as { waveScrollBehaviors: string[] }).waveScrollBehaviors);
    expect(calls).not.toContain('smooth');
    if (reducedMotion === 'reduce') expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  });
}
