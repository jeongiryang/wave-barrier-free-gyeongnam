import { test, expect } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const width of [390, 960, 1440]) test(`navigation stays in document flow and returns to keyboard focus at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await mockPlannerApi(page);
  await page.goto('/');
  const header = page.locator('.landing-page > .wave-header');
  await expect(header).toBeVisible();
  for (const selector of ['#regions', '#story', '#community', '#closing']) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // The approved header scrolls with the page, without covering story content.
    await expect(header).toHaveCSS('position', 'relative');
    await expect(header).toHaveCSS('transform', 'none');
    expect(await header.evaluate(node => node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await header.locator('.wave-wordmark').focus();
  await expect(header.locator('.wave-wordmark')).toBeFocused();
  await expect(header).toBeInViewport();
  const state = await header.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { background: getComputedStyle(node).backgroundImage,
      covered: !node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) };
  });
  expect(state.background).toBe('none');
  expect(state.covered).toBe(false);
  await page.getByRole('button', { name: 'WAVE 이용 안내 메뉴', exact: true }).click();
  await expect(page.locator('.wave-support-panel')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`header-${width}.png`) });
  await page.keyboard.press('Escape');
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '커뮤니티', exact: true }).click();
  await expect(page).toHaveURL(/\/community/);
});
