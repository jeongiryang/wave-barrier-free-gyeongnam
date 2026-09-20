import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { chooseTripConditions, mockPlannerApi, openItinerary } from './fixtures';
import { departureItem, openDeparture } from './departure-fixtures';

const rainyWeather = {
  region: '창원', updatedAt: '2026-08-25T23:00:00.000Z', source: 'Open-Meteo',
  current: { temperature: 23, apparent: 24, code: 61, label: '비', windMps: 2, precipitation: 1, isDay: true },
  days: [{ date: '2026-08-26', code: 61, label: '비', max: 25, min: 20, rainProbability: 80, rain: 6, snow: 0, uv: 2, advice: [] }],
  advice: [],
};

test('confirmed forecast and indoor evidence appear without changing the itinerary or adding a provider request', async ({ page }, testInfo) => {
  await mockPlannerApi(page);
  await page.route('**/api/weather?*', route => route.fulfill({ json: rainyWeather }));
  const apiRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
  await page.goto('/planner?travelStart=2026-08-26&travelEnd=2026-08-26');
  await chooseTripConditions(page);

  const rows = page.locator('.simple-place-row');
  await expect(rows.first().locator('.scenery-hint')).toContainText('이 날은 비 소식이 있어요. 실내에서 볼 수 있는 곳이에요.');
  await expect(rows.first().locator('.scenery-hint')).toContainText('Open-Meteo 예보 · 관광정보 설명 기준');
  await expect(rows.nth(1).locator('.scenery-hint')).toHaveCount(0);
  expect(apiRequests.filter(url => new URL(url).searchParams.get('action') === 'visit-info')).toEqual([]);
  await rows.first().locator('.simple-place-add').click();
  const scheduleBefore = await page.evaluate(() => localStorage.getItem('wave-trip-schedule-v1'));
  await openItinerary(page);
  await openDeparture(page);
  await expect
    .poll(() => apiRequests.filter(url => new URL(url).searchParams.get('action') === 'visit-info').length)
    .toBe(1);
  const visitInfoBeforeWeather = apiRequests.filter(url => new URL(url).searchParams.get('action') === 'visit-info').length;
  const weather = await departureItem(page, '날씨');
  await weather.getByRole('link', { name: /상세 정보 확인/ }).click();
  await expect(page.locator('.weather-scenery-hint')).toContainText('경남도립미술관 · 이 날은 비 소식이 있어요. 실내에서 볼 수 있는 곳이에요.');
  await expect(page.locator('.weather-scenery-hint small')).toHaveText('Open-Meteo 예보 · 관광정보 설명 기준');
  expect(await page.evaluate(() => localStorage.getItem('wave-trip-schedule-v1'))).toBe(scheduleBefore);
  expect(apiRequests.filter(url => new URL(url).searchParams.get('action') === 'visit-info')).toHaveLength(visitInfoBeforeWeather);
  expect((await new AxeBuilder({ page }).include('.weather-scenery-hint').analyze()).violations).toEqual([]);

  if (testInfo.project.name === 'desktop-chromium') for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test('weather failure leaves both hint locations absent', async ({ page }) => {
  await mockPlannerApi(page);
  await page.route('**/api/weather?*', route => route.fulfill({ status: 503, json: { error: 'fixture failure' } }));
  await page.goto('/planner?travelStart=2026-08-26&travelEnd=2026-08-26');
  await chooseTripConditions(page);
  await expect(page.locator('.simple-place-row .scenery-hint')).toHaveCount(0);
  await page.locator('.simple-place-row').first().locator('.simple-place-add').click();
  await openItinerary(page);
  await openDeparture(page);
  const weather = await departureItem(page, '날씨');
  await weather.getByRole('link', { name: /상세 정보 확인/ }).click();
  await expect(page.locator('.weather-empty')).toBeVisible();
  await expect(page.locator('.weather-scenery-hint')).toHaveCount(0);
});
