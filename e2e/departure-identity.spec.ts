import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
import { enterDeparture, departureItem } from './departure-fixtures';
for (const locale of ['ko', 'en']) test(`departure follows the saved place instead of the first recommendation (${locale})`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await page.clock.setFixedTime(new Date('2026-10-08T01:00:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mockPlannerApi(page);
  await page.addInitScript(locale => localStorage.setItem('wave-locale', locale), locale);
  await page.route('**/api/wave?*', async route => {
    if (new URL(route.request().url()).searchParams.get('action') !== 'crowd') return route.fallback();
    return route.fulfill({ json: { crowd: { place: '용지호수공원', rate: 31.5, baseYmd: '20261008' } } });
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/planner?travelStart=2026-10-08&travelEnd=2026-10-08'); await enterDeparture(page, '용지호수공원');
  const forecast = await departureItem(page, '관광 집중률');
  await expect(forecast).toContainText('용지호수공원 31.5%'); await expect(forecast).toContainText('2026-10-08');
  await expect(forecast.locator('summary')).toContainText('조회한 정보 있음');
  await expect(forecast).not.toContainText('경남도립미술관'); await expect(forecast).not.toContainText('24.0%');
  await expect(forecast).toContainText('실시간 방문자 수가 아닙니다');
  expect(await forecast.evaluate(el => el.closest('[lang]')?.getAttribute('lang'))).toBe('ko');
  await forecast.getByRole('link').focus(); await expect(forecast.getByRole('link')).toBeFocused();
  await page.locator('#departure-readiness').screenshot({ path: test.info().outputPath(`departure-identity-${locale}.png`) });
  expect((await new AxeBuilder({ page }).include('#departure-readiness').analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1); expect(errors).toEqual([]);
});
