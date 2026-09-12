import { expect, test } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test('workspace keeps navigation and trip summary usable across desktop, half-window and mobile', async ({ page }, testInfo) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/planner');
  const navigation = page.locator('.planner-navigation');
  const currentWork = page.locator('.journey-stage-stream');
  const summary = page.locator('.condition-trip-summary');
  await expect(page.getByRole('heading', { name: '경남, 어디부터 가볼까요?', exact: true })).toBeVisible();
  await expect(page.locator('.reference-region-card')).toHaveCount(3);
  for (const width of [1440, 1180, 960, 641, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(navigation).toHaveCSS('position', width > 960 ? 'fixed' : 'static');
    await expect(summary).toBeVisible();
    const navBox = (await navigation.boundingBox())!;
    const workBox = (await currentWork.boundingBox())!;
    const summaryBox = (await summary.boundingBox())!;
    if (width > 960) expect(navBox.x + navBox.width).toBeLessThan(workBox.x);
    else expect(navBox.y + navBox.height).toBeLessThan(workBox.y);
    if (width > 1180) expect(workBox.x + workBox.width).toBeLessThan(summaryBox.x);
    else expect(workBox.y + workBox.height).toBeLessThan(summaryBox.y);
    expect(summaryBox.x + summaryBox.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(navigation.getByRole('button', { name: /여행 조건/ })).toBeEnabled();
    if (width > 640 && width <= 1180) {
      const launcherBox = (await page.locator('.naru-launcher').boundingBox())!;
      const nextBox = (await page.locator('.condition-actions > button').boundingBox())!;
      expect(launcherBox.y + launcherBox.height).toBeLessThan(nextBox.y);
    }
    await page.screenshot({ path: testInfo.outputPath(`workspace-${width}.png`) });
  }
});
