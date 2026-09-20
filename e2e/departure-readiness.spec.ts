import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { mockPlannerApi, chooseTripConditions, openItinerary } from './fixtures';
import { departureItem, openDeparture, routeTools, validShareApi } from './departure-fixtures';
test('departure disclosures distinguish partial evidence and keyboard calendar keeps Korea time', async ({ page, baseURL }) => {
  await page.clock.setFixedTime(new Date('2026-10-08T01:00:00Z')); const today = '2026-10-08';
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mockPlannerApi(page);
  await page.route('**/api/wave?*', async route => new URL(route.request().url()).searchParams.get('action') !== 'crowd' ? route.fallback() : route.fulfill({ json: { crowd: { place: '경남도립미술관', rate: 24, baseYmd: today.replaceAll('-', '') } } }));
  await page.route('**/api/weather**', route => route.fulfill({ json: { region: '창원', source: '기상청 단기예보', updatedAt: `${today}T01:00:00.000Z`, current: { temperature: 27, apparent: 29, code: 1, label: '대체로 맑음', windMps: 2, precipitation: 0, isDay: true }, days: [{ date: today, code: 1, label: '맑음', max: 30, min: 23, rainProbability: 10, rain: 0, snow: 0, uv: 6, advice: [] }], advice: [] } }));
  await validShareApi(page); await page.goto('/planner'); await chooseTripConditions(page);
  await expect(page.locator('.simple-planner-tabs button').nth(1)).toBeDisabled(); await expect(page.locator('button[data-planner-tool=share]')).not.toBeVisible();
  await page.locator('.simple-place-row').first().locator('.simple-place-add').click(); await openItinerary(page, { start: today, end: today });
  await page.getByRole('button', { name: '여행 설정', exact: true }).click(); const settings = page.getByRole('dialog', { name: '여행 설정', exact: true });
  await settings.getByLabel('하루 시작', { exact: true }).fill('09:30'); await settings.getByRole('button', { name: '적용', exact: true }).click();
  const card = await openDeparture(page); const weather = await departureItem(page, '날씨'); await expect(weather.locator('summary')).toContainText('조회한 정보 있음');
  const crowd = await departureItem(page, '관광 집중률'); await expect(crowd).toContainText('실시간 방문자 수가 아닙니다');
  const journeys = await departureItem(page, '이동 경로·시간'); await expect(journeys).toContainText('전체 1구간 중 0구간');
  const coverage = await routeTools(page); await coverage.locator('select').selectOption('car'); await expect(journeys).toContainText('전체 1구간 중 1구간');
  await expect(journeys.locator('summary')).toContainText('조회한 정보 있음'); const mobility = await departureItem(page, '이동 편의'); await expect(mobility.locator('summary')).toContainText('확인할 정보 있음');
  expect((await new AxeBuilder({ page }).include('.simple-readiness').analyze()).violations).toEqual([]);
  await page.locator('button[data-planner-tool=share]').click(); const menu = page.getByRole('dialog', { name: '여행 공유', exact: true });
  const calendar = menu.getByRole('button', { name: '캘린더', exact: true }); await expect(calendar).toBeEnabled(); await calendar.focus();
  const downloading = page.waitForEvent('download'); await page.keyboard.press('Enter'); const download = await downloading;
  expect(download.suggestedFilename()).toBe('wave-trip.ics'); const contents = (await readFile((await download.path())!, 'utf8')).replaceAll('\r\n ', '');
  expect(contents).toContain('TZID:Asia/Seoul'); expect(contents).toContain('DTSTART;TZID=Asia/Seoul:20261008T093000'); expect(contents).toContain(`URL:${new URL('/trip/abcdef123456', baseURL).href}`);
  await menu.getByRole('button', { name: '공유 닫기' }).click(); await expect(card).toBeVisible();
});
test('past trips and forecast failures never claim departure readiness', async ({ page }) => {
  await mockPlannerApi(page); await page.route('**/api/weather**', route => route.fulfill({ status: 503, json: { error: '지연' } }));
  await page.goto('/planner?travelStart=2026-08-01&travelEnd=2026-08-01'); await chooseTripConditions(page);
  await page.locator('.simple-place-row').first().locator('.simple-place-add').click(); await openItinerary(page); await openDeparture(page);
  const weather = await departureItem(page, '날씨'); await expect(weather.locator('summary')).toContainText('확인할 정보 있음'); await expect(weather).toContainText('해당 날짜 예보가 없거나');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-trip-schedule-v1') || '{}').travelStart)).toBe('2026-08-01');
});

test('optional trip precautions stay local to the view and link to existing planner screens', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-08T01:00:00Z'));
  await mockPlannerApi(page);
  await page.goto('/planner');
  await chooseTripConditions(page);
  await page.locator('.simple-place-row').first().locator('.simple-place-add').click();
  await openItinerary(page, { start: '2026-10-08', end: '2026-10-08' });
  const card = await openDeparture(page);
  const checks = card.locator('.simple-readiness-precautions input[type=checkbox]');
  await expect(checks).toHaveCount(4);
  await expect(card.getByText('그날 날씨를 확인하고 실내 대안을 준비했나요?')).toBeVisible();
  await expect(card.getByText('이동 수단의 편의시설을 미리 확인했나요?')).toBeVisible();
  await expect(card.getByText('보조기기가 고장 났을 때 연락할 곳을 알고 있나요?')).toBeVisible();
  await expect(card.getByText('급할 때 연락할 곳을 저장해 두었나요?')).toBeVisible();

  const before = await page.evaluate(() => JSON.stringify(localStorage));
  await checks.nth(0).check();
  await checks.nth(3).check();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
  await expect(page.locator('.simple-planner-tabs button').nth(1)).toBeEnabled();

  await card.getByRole('link', { name: '날씨 확인' }).click();
  await expect(page).toHaveURL(/#layers$/);
  await expect(page.locator('#layers')).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.simple-readiness').analyze()).violations).toEqual([]);
  await card.getByRole('link', { name: '도움 요청 확인' }).click();
  await expect(page).toHaveURL(/#more-trip-tools$/);
  await expect(page.locator('#more-trip-tools')).toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: '도움이 필요해요' })).toBeVisible();
  if (testInfo.project.name === 'desktop-chromium') for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
