import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan, showItineraryMap } from './fixtures';
import { chooseWaveOption } from './wave-select-fixture';
import type { Place } from '../features/planner/types';

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });

// Synthetic place evidence deliberately differs, so selecting a new stop must
// update its facilities as well as its title and calculated time.
const places: Place[] = plan.places.map((place, index) => ({
  ...place,
  accessibility: [
    { key: 'parking', label: '장애인 주차구역', state: 'confirmed', detail: '합성 주차 정보' },
    { key: 'restroom', label: '장애인 화장실', state: index ? 'unknown' : 'confirmed', detail: '합성 화장실 정보' },
  ],
}));

async function currentTrip(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    const parse = (key: string, fallback: string) => JSON.parse(values[key] || fallback);
    return {
      ids: parse('wave-saved-places', '[]'), order: parse('wave-trip-order-v1', '{}'),
      schedule: parse('wave-trip-schedule-v1', '{}'), facilities: parse('wave-trip-facilities-v1', '[]'),
      region: values['wave-planner-region-v1'], identity: parse('wave-trip-identity-v1', 'null'),
    };
  });
}

async function openSavedTrip(page: Page, info: TestInfo, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const origin = new URL(String(info.project.use.baseURL)).origin;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === origin && !url.pathname.startsWith('/api/')
      ? route.continue()
      : route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic request' } });
  });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true, savedPlaces: places });
  await page.route('**/api/wave?*', route => new URL(route.request().url()).searchParams.get('action') === 'plan'
    ? route.fulfill({ json: { ...plan, places } }) : route.fallback());
  await page.addInitScript(savedPlaces => {
    const values = {
      'wave-saved-places': JSON.stringify(savedPlaces.map(place => place.id)),
      'wave-saved-place-catalog-v1': JSON.stringify(savedPlaces),
      'wave-planner-region-v1': '창원', 'wave-trip-facilities-v1': '["parking"]', 'wave-trip-themes-v1': '[]',
      'wave-trip-identity-v1': JSON.stringify({ version: 1, id: '00000000-0000-4000-8000-000000000736', binding: null, share: null }),
      'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: savedPlaces.map(place => place.id) }),
      'wave-trip-schedule-v1': JSON.stringify({
        travelStart: '2026-10-08', travelEnd: '2026-10-09', dayStartTime: '10:00', travelMode: 'car',
        scheduleAssignments: { '1001': '2026-10-08', '1002': '2026-10-08' }, visitMinutesByPlaceId: { '1001': 60, '1002': 90 },
        fixedVisits: {}, dayDeadlines: {}, comfort: { maxWalkMinutes: 15, breakEveryMinutes: 60, breakMinutes: 15 },
        breakMinutesByPlaceId: { '1001': 15 }, restPurposeByPlaceId: { '1001': 'rest' },
      }),
    };
    // Seed once: reload must restore the actual edits made through the UI.
    if (!localStorage.getItem('wave-current-trip-v1')) localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values }));
    localStorage.setItem('wave-planner-stage-view-v2', 'guided');
    sessionStorage.setItem('wave-planner-active-step-v1', 'itinerary');
  }, places);
  await page.goto('/planner#itinerary');
  await expect(page.locator('.simple-stops > li')).toHaveCount(2);
  await page.locator('.wave-header .wave-my-trips').click();
  await timeboard(page);
  await expect(page.locator('#itinerary-stop-1002')).toBeVisible();
}

async function timeboard(page: Page) {
  const view = page.getByRole('group', { name: '일정 보기 방식', exact: true });
  if (await view.isVisible()) await view.getByRole('button', { name: '시간표', exact: true }).click();
}

for (const width of [1440, 1280, 1024, 960, 390]) {
  test(`${width}px team itinerary keeps selection, facility evidence and map in sync`, async ({ page }, info) => {
    await openSavedTrip(page, info, width);
    const before = await currentTrip(page);
    const center = page.locator('.simple-focus-stop');
    const lake = page.locator('#itinerary-stop-1002');
    const lakeTitle = lake.getByRole('button', { name: '용지호수공원', exact: true });
    if (width >= 1280) {
      await expect(center).toBeVisible();
      await expect(center).toHaveAttribute('aria-label', '경남도립미술관 선택 일정 상세');
      // Use the real keyboard activation of the left title, not the hidden row controls.
      await lakeTitle.focus(); await lakeTitle.press('Enter');
      await expect(center).toHaveAttribute('aria-label', '용지호수공원 선택 일정 상세');
      await expect(page.getByRole('dialog', { name: '용지호수공원', exact: true })).toHaveCount(0);
      await expect(center.locator('.simple-focus-overlay time')).toHaveText(await lake.locator('.simple-stop > time').innerText());
      await expect(center.locator('.simple-focus-copy > p')).toHaveText(await lake.locator('.simple-stop-copy > p').innerText());
      await expect(center.locator('.simple-facility-summary')).toContainText('장애인 화장실 정보 없음');
      const columns = await page.locator('.simple-itinerary-board').evaluate(board => ['.simple-timeboard', '.simple-focus-stop', '.simple-itinerary-map'].map(selector => {
        const box = board.querySelector(selector)!.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width };
      }));
      expect(columns[0].right).toBeLessThanOrEqual(columns[1].left);
      expect(columns[1].right).toBeLessThanOrEqual(columns[2].left);
      for (const column of columns) expect(column.width).toBeGreaterThan(0);
      await center.getByRole('button', { name: '용지호수공원', exact: true }).click();
    } else {
      await expect(center).toBeHidden();
      await lakeTitle.click();
    }
    const detail = page.getByRole('dialog', { name: '용지호수공원', exact: true });
    await expect(detail).toBeVisible();
    await page.keyboard.press('Escape'); await expect(detail).toBeHidden();
    await timeboard(page);
    const controls = width >= 1280 ? center : lake;
    await controls.getByRole('button', { name: '용지호수공원 지도에서 보기', exact: true }).click();
    const map = page.locator('.simple-itinerary-map');
    await expect(map.locator('.wave-map-icon.place[data-place-id="1002"]')).toHaveAttribute('aria-current', 'location');
    await expect(lake).toHaveAttribute('data-selected', 'true');
    await map.locator('.wave-map-icon.place[data-place-id="1001"]').click();
    await expect(page.locator('#itinerary-stop-1001')).toHaveAttribute('data-selected', 'true');
    if (width >= 1280) {
      await expect(center).toHaveAttribute('aria-label', '경남도립미술관 선택 일정 상세');
      await expect(center.locator('.simple-facility-summary')).not.toContainText('정보 없음');
    } else await timeboard(page);
    expect(await currentTrip(page)).toEqual(before);
    await page.screenshot({ path: info.outputPath(`team-itinerary-${width}.png`) });
  });
}

test('selected center edits, reorders, moves and removes the same saved trip before returning to conditions', async ({ page }, info) => {
  await openSavedTrip(page, info, 1440);
  const before = await currentTrip(page), center = page.locator('.simple-focus-stop'), rows = page.locator('.simple-stops > li');
  await page.locator('#itinerary-stop-1002').getByRole('button', { name: '용지호수공원', exact: true }).click();
  await expect(center).toHaveAttribute('aria-label', '용지호수공원 선택 일정 상세');
  await center.getByRole('button', { name: '용지호수공원 같은 날 앞 순서로 이동', exact: true }).click();
  await expect(rows.first()).toHaveAttribute('id', 'itinerary-stop-1002');
  await expect(center.getByRole('button', { name: '용지호수공원 같은 날 앞 순서로 이동', exact: true })).toBeDisabled();
  await center.getByRole('button', { name: '용지호수공원 일정 수정', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '용지호수공원 수정', exact: true });
  await chooseWaveOption(editor.getByRole('combobox', { name: '용지호수공원 머무는 시간', exact: true }), '120');
  await editor.getByRole('button', { name: '적용', exact: true }).click();
  await expect(center.locator('.simple-focus-copy > p')).toContainText('120분 머물러요');
  await expect(center.locator('.simple-focus-copy > p')).toHaveText(await rows.first().locator('.simple-stop-copy > p').innerText());
  await center.getByRole('button', { name: '용지호수공원 일정 수정', exact: true }).click();
  await chooseWaveOption(editor.getByRole('combobox', { name: '방문 날짜', exact: true }), '2026-10-09');
  await editor.getByRole('button', { name: '적용', exact: true }).click();
  await expect(center).toHaveAttribute('aria-label', '경남도립미술관 선택 일정 상세');
  await page.getByRole('group', { name: '일정 날짜', exact: true }).getByRole('button', { name: /^2일차/ }).click();
  await expect(center).toHaveAttribute('aria-label', '용지호수공원 선택 일정 상세');
  await expect(rows).toHaveCount(1);
  const edited = await currentTrip(page);
  expect(edited.schedule).toMatchObject({ visitMinutesByPlaceId: { '1001': 60, '1002': 120 }, scheduleAssignments: { '1001': '2026-10-08', '1002': '2026-10-09' } });
  await page.getByRole('button', { name: '처음 화면으로 가기', exact: true }).click();
  await expect(page).toHaveURL(/#conditions$/); await expect(page.locator('#itinerary')).toBeHidden();
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toBeVisible();
  expect(await currentTrip(page)).toEqual(edited);
  await page.locator('.wave-header .wave-my-trips').click();
  await page.getByRole('group', { name: '일정 날짜', exact: true }).getByRole('button', { name: /^2일차/ }).click();
  await center.getByRole('button', { name: '용지호수공원 일정 수정', exact: true }).click();
  await editor.getByRole('button', { name: '일정에서 빼기', exact: true }).click();
  await expect(rows).toHaveCount(0); await expect(center).toHaveCount(0);
  const removed = await currentTrip(page);
  expect(removed.ids).toEqual(['1001']); expect(removed.identity).toEqual(before.identity);
  expect(removed.facilities).toEqual(before.facilities);
  expect(removed.schedule).toMatchObject({ travelStart: '2026-10-08', travelEnd: '2026-10-09', visitMinutesByPlaceId: { '1001': 60 }, breakMinutesByPlaceId: { '1001': 15 } });
  await page.reload();
  expect(await currentTrip(page)).toEqual(removed);
  await showItineraryMap(page);
});
