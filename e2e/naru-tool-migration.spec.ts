import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';
import { alternativePlan } from './alternative-fixtures';
import { closeNaruTool, naruDialog, openNaruTool } from './naru-tool-fixtures';
import { openRouteDetails } from './nearby-fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
async function setup(page: Page, dated = true, hash = '') {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'synthetic only' } }));
  await mockPublicShellApi(page); await mockPlannerApi(page, { preserveView: true, savedPlaces: alternativePlan.places });
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: false } }));
  await page.addInitScript(({ dated, places }) => {
    localStorage.setItem('wave-naru-starter-v1', 'done');
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: {
      'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001","1002","1003"]',
      'wave-saved-place-catalog-v1': JSON.stringify(places), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001","1002","1003"]}',
      'wave-trip-schedule-v1': JSON.stringify({ travelStart: dated ? '2026-10-14' : '', travelEnd: dated ? '2026-10-14' : '', dayStartTime: '09:00', travelMode: 'car', scheduleAssignments: {}, fixedVisits: {}, dayDeadlines: {}, comfort: { maxWalkMinutes: 15, breakEveryMinutes: 60, breakMinutes: 15 } }),
    } }));
  }, { dated, places: alternativePlan.places.map(place => ({ ...place, image: '' })) });
  await page.goto(`/planner${hash}`);
  if (!hash) await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toBeEnabled();
  else await expect(naruDialog(page)).toBeVisible();
}
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('wave-current-trip-v1')!).values['wave-trip-schedule-v1']);

test('a place restroom action mounts Naru and preserves the requested stop on first use', async ({ page }) => {
  await setup(page); const before = await stored(page);
  await expect(page.locator('dialog.naru-panel')).toHaveCount(0);
  await page.locator('.simple-place-row h3 button').filter({ hasText: '경남도립미술관' }).click();
  const detail = page.locator('dialog.place-modal');
  await detail.locator('summary').filter({ hasText: /^주차·입구·시설 미리보기$/ }).click();
  await detail.getByRole('button', { name: '3. 시설', exact: true }).click();
  await detail.getByRole('button', { name: '주변 공중화장실', exact: true }).click();
  const chat = naruDialog(page), finder = chat.locator('#restroom-alternatives-entry');
  await expect(detail).toBeHidden(); await expect(chat).toBeVisible();
  await expect(finder).toHaveAttribute('open', '');
  await expect(finder.getByRole('combobox', { name: '이 장소 다음에 들르기', exact: true })).toHaveValue('1001');
  await expect(finder.getByRole('combobox', { name: '필요한 곳', exact: true })).toHaveValue('restroom');
  expect(await stored(page)).toBe(before);
});

test('an internal route action dismisses Naru and exposes the selected shared journey on the map', async ({ page }) => {
  await setup(page); const before = await stored(page);
  const chat = await openNaruTool(page, '이동 구간 확인');
  const second = chat.locator('.itinerary-route-coverage li').nth(1);
  await expect(second).toContainText('경남도립미술관 → 용지호수공원');
  await expect(second.getByRole('button', { name: '이 구간 지도에서 보기', exact: true })).toBeEnabled();
  await second.getByRole('button', { name: '이 구간 지도에서 보기', exact: true }).click();
  await expect(chat).toBeHidden(); await expect(page.locator('#navigation')).toBeVisible();
  await openRouteDetails(page);
  await expect(page.locator('.route-compare-panel a[href^="https://map.kakao.com/"]')).toHaveAttribute('href', `https://map.kakao.com/link/by/car/${encodeURIComponent('경남도립미술관')},35.238,128.691/${encodeURIComponent('용지호수공원')},35.229,128.683`);
  expect(await stored(page)).toBe(before);
});

test('undated internal tools explain the prerequisite and focus date entry without inventing dates', async ({ page }) => {
  await setup(page, false); const before = await stored(page);
  const chat = await openNaruTool(page, '이동 부담·휴식');
  await expect(chat.getByRole('status').filter({ hasText: '여행 날짜를 정하면' })).toBeVisible();
  expect(await stored(page)).toBe(before);
  await chat.getByRole('button', { name: '날짜·출발지 정하기', exact: true }).click();
  await expect(chat).toBeHidden(); await expect(page.locator('#itinerary-setup input').first()).toBeFocused();
  expect(await stored(page)).toBe(before);
});

test('readiness deep links, checklist state and place detail return remain inside the same Naru workspace', async ({ page }) => {
  await setup(page, true, '#departure-readiness'); const chat = naruDialog(page);
  await expect(chat).toBeVisible();
  const readiness = chat.locator('.simple-readiness'); await expect(readiness).toBeVisible();
  await readiness.getByRole('checkbox').first().check(); const before = await stored(page);
  await openNaruTool(page, '이동 부담·휴식'); await expect(chat.locator('.simple-day-options > summary')).toBeFocused();
  await closeNaruTool(page); await openNaruTool(page, '출발 전 확인');
  await expect(readiness.getByRole('checkbox').first()).toBeChecked(); expect(await stored(page)).toBe(before);
  const review = chat.getByRole('region', { name: '나루 여행 점검', exact: true });
  const hours = review.getByRole('region', { name: '변경한 일정의 운영시간 확인', exact: true }).locator('details');
  await expect(hours).toBeVisible();
  if (await hours.getAttribute('open') === null) await hours.locator('summary').click();
  await review.getByRole('button', { name: '이용 정보·문의', exact: true }).first().click();
  const detail = page.locator('dialog.place-modal'); await expect(detail).toBeVisible();
  await expect(chat).toBeHidden();
  await detail.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(chat).toBeVisible(); await expect(readiness).toBeVisible();
  await expect(readiness.getByRole('checkbox').first()).toBeChecked(); expect(await stored(page)).toBe(before);
});

test('day tools activate directly and retain progress undo and draft choices through close and nested help', async ({ page }) => {
  await setup(page); const before = await stored(page);
  const chat = await openNaruTool(page, '여행 당일 안내');
  const progress = chat.getByRole('region', { name: '여행 당일 진행', exact: true }); await expect(progress).toBeVisible();
  await progress.getByRole('button', { name: '여행 시작하기', exact: true }).click();
  await progress.getByRole('button', { name: '이곳 방문 완료', exact: true }).click();
  await closeNaruTool(page); await openNaruTool(page, '여행 당일 안내');
  await expect(progress.getByRole('button', { name: '직전 진행 되돌리기', exact: true })).toBeVisible();
  await chat.getByRole('button', { name: '도움이 필요해요', exact: true }).click();
  const help = page.locator('dialog[aria-labelledby="help-request-title"]'); await expect(help).toBeVisible();
  await page.keyboard.press('Escape'); await expect(help).toBeHidden(); await expect(chat).toBeVisible();
  await progress.getByRole('button', { name: '직전 진행 되돌리기', exact: true }).click();
  await expect(progress.getByRole('heading', { name: '경남도립미술관', exact: true })).toBeVisible();
  await openNaruTool(page, '동행·합류'); const split = chat.getByRole('region', { name: '동행과 합류 계획', exact: true });
  await split.getByRole('combobox', { name: 'B 출발 장소에서 더 머무는 시간', exact: true }).selectOption('60');
  await closeNaruTool(page); await openNaruTool(page, '출발 전 확인'); await openNaruTool(page, '동행·합류');
  await expect(split.getByRole('combobox', { name: 'B 출발 장소에서 더 머무는 시간', exact: true })).toHaveValue('60');
  expect(await stored(page)).toBe(before);
});
test('an empty trip opened from community returns to usable place search', async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page, { preserveView: true });
  await page.addInitScript(() => localStorage.setItem('wave-naru-starter-v1', 'done'));
  await page.goto('/community');
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  const chat = await openNaruTool(page, '이동 부담·휴식');
  await expect(chat.getByRole('status').filter({ hasText: '여행지를 일정에 담으면' })).toBeVisible();
  await chat.getByRole('button', { name: '여행지 찾기', exact: true }).click();
  await expect(chat).toBeHidden();
  await expect(page).toHaveURL(/\/planner#conditions$/);
  const region = page.getByRole('combobox', { name: '여행 지역', exact: true });
  await expect(region).toBeFocused();
  await region.selectOption('창원');
  await expect(page.locator('#places')).toBeVisible();
  await expect(page.getByRole('combobox', { name: '여행지 검색', exact: true })).toBeEnabled();
});
