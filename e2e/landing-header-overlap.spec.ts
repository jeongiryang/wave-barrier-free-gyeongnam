import { test, expect } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const width of [390, 960, 1440]) test(`navigation stays above photographs while scrolling at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await mockPlannerApi(page);
  await page.goto('/');
  const header = page.locator('.landing-page > .wave-header');
  await expect(header).toBeVisible();
  for (const selector of ['#regions', '#story', '#community', '#closing']) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Downward scrolling intentionally hides navigation; upward scrolling reveals it.
    await page.mouse.wheel(0, -160);
    await expect(header).toHaveAttribute('data-hidden', 'false');
    await expect(header).toHaveCSS('transform', 'none');
    const state = await header.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return { top: rect.top, background: getComputedStyle(node).backgroundImage,
        covered: !node.contains(document.elementFromPoint(rect.width / 2, rect.height / 2)),
        overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(Math.abs(state.top)).toBeLessThan(1);
    expect(state.background).toBe('none');
    expect(state.covered).toBe(false);
    expect(state.overflow).toBe(false);
  }
  await page.getByRole('button', { name: 'WAVE 이용 안내 메뉴', exact: true }).click();
  await expect(page.locator('.wave-support-panel')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`header-${width}.png`) });
  await page.keyboard.press('Escape');
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '커뮤니티', exact: true }).click();
  await expect(page).toHaveURL(/\/community/);
});
