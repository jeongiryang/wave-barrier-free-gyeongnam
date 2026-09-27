import { test, expect } from '@playwright/test';
import { mockPlannerApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
for (const width of [390, 960, 1440]) for (const route of ['/', '/planner', '/community', '/festivals']) {
  test(`continuous scenery ${route} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await mockPlannerApi(page);
    await page.goto(route);
    const main = page.locator('main.scenic-page');
    await expect(main).toBeVisible();
    await expect(main.locator('.scenic-background')).toHaveCSS('position', 'fixed');
    await expect(main.locator('.scenic-background img.is-current')).toBeVisible();
    await expect(page.locator('.naru-story-stage,.naru-hint')).toHaveCount(0);
    await page.locator('.simple-footer').scrollIntoViewIfNeeded();
    await expect(main.locator('.scenic-background')).toHaveCSS('position', 'fixed');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (route === '/') {
      await page.locator('#story').scrollIntoViewIfNeeded();
      await page.locator('.journey-map-preview').scrollIntoViewIfNeeded();
      await expect(page.locator('.journey-paper-map path[data-featured]')).toHaveCount(18);
      await expect(page.locator('.night-itinerary-map')).toHaveCount(0);
      await expect(page.locator('.night-itinerary-number')).toHaveCount(0);
    }
    await page.screenshot({ path: testInfo.outputPath(`scenic-${route.replace('/','') || 'home'}-${width}.png`) });
  });
}
