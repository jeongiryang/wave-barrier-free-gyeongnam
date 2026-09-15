import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
import type { Place, PlanData } from '../features/planner/types';

const place = { id: '3003', contentTypeId: '14', city: '창원', name: '검증용 관광지', address: '경상남도 창원시', summary: '공식 설명', image: '', mapX: '128.691', mapY: '35.238', score: 30, accessibility: [{ key: 'parking', label: '주차', state: 'unknown', detail: '' }], features: [], details: [], source: '한국관광공사' } satisfies Place;
const item = { id: 'P1', name: '검증 공영주차장', address: '경상남도 창원시 중앙대로', distanceMeters: 125, accessibleZone: 'confirmed', operatingHours: '평일 09:00–18:00', feeInformation: '유료', institutionName: '창원시', phoneNumber: '055-123-4567', referenceDate: '2026-07-01', destination: { latitude: 35.2385, longitude: 128.6915 } };

async function openParking(page: Page) {
  await mockPlannerApi(page, { plannerView: 'overview', savedPlaces: [place] });
  await page.route('**/api/wave?action=plan*', route => route.fulfill({ json: { mode: 'live', generatedAt: '2026-09-15T00:00:00Z', baseYm: '202609', places: [place], course: null, audio: null, stops: [], statuses: [] } satisfies PlanData }));
  await page.goto('/planner');
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await page.locator('.simple-place-row h3 button').first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('summary').filter({ hasText: /^주차·입구·시설 미리보기$/ }).click();
  return dialog.getByRole('region', { name: '주변 주차장', exact: true });
}

test('parking is delayed until explicit open, keeps itinerary, and exposes destination-only actions', async ({ page }, info) => {
  const calls: string[] = [];
  await page.route('**/api/wave?action=parking-alternatives*', route => { calls.push(route.request().url() + (route.request().postData() || '')); return route.fulfill({ json: { status: 'available', contentId: place.id, checkedAt: '2026-09-15T05:20:00Z', source: '전국주차장정보표준데이터', items: [item] } }); });
  const panel = await openParking(page), before = await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'));
  expect(calls).toEqual([]);
  await panel.getByRole('button', { name: '주변 주차장 보기', exact: true }).click();
  await expect(panel).toContainText('등록 정보가 있는 주차장 1곳');
  await expect(panel).toContainText('공식 데이터에 보유로 등록');
  await expect(panel).toContainText('실시간 빈자리와 입구까지의 계단 없는 길은 확인되지 않았어요.');
  expect(calls).toHaveLength(1); expect(calls[0]).toMatch(/action=parking-alternatives&contentId=3003$/);
  const map = panel.getByRole('link', { name: '지도에서 보기', exact: true });
  await expect(map).toHaveAttribute('href', 'https://map.kakao.com/link/map/%EA%B2%80%EC%A6%9D%20%EA%B3%B5%EC%98%81%EC%A3%BC%EC%B0%A8%EC%9E%A5,35.2385,128.6915');
  expect(await map.getAttribute('href')).not.toMatch(/from|sLat|sLng|origin/i);
  await panel.getByRole('button', { name: '도착지로 선택', exact: true }).click();
  await expect(panel).toContainText('일정과 시간은 바꾸지 않고 도착 참고정보로 선택했어요.');
  expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(before);
  await panel.getByRole('button', { name: '목록 접기', exact: true }).click();
  await panel.getByRole('button', { name: '주변 주차장 보기', exact: true }).click(); expect(calls).toHaveLength(1);
  for (const width of info.project.name.includes('desktop') ? [1440, 960] : [390, 320]) { await page.setViewportSize({ width, height: 960 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); }
  await page.setViewportSize({ width: 1280, height: 960 });
  for (const zoom of ['2', '4']) { await page.evaluate(value => { document.documentElement.style.zoom = value; }, zoom); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); }
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  await map.focus(); await expect(map).toBeFocused(); await page.keyboard.press('Shift+Tab'); await expect(panel.getByRole('link', { name: '전화로 물어보기', exact: true })).toBeFocused();
  expect((await new AxeBuilder({ page }).include('.parking-alternatives').analyze()).violations).toEqual([]);
});

test('current-position sorting requests permission only on its named action and leaks zero coordinates', async ({ page }) => {
  const position = { latitude: 35.12345678, longitude: 128.87654321 }, requests: string[] = [], logs: string[] = [];
  page.on('request', request => requests.push(request.url() + (request.postData() || '')));
  page.on('console', message => logs.push(message.text()));
  await page.addInitScript(position => { let calls = 0; Object.assign(window, { parkingLocationCalls: () => calls }); Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(success: PositionCallback) { calls++; success({ coords: position } as GeolocationPosition); } } }); }, position);
  await page.route('**/api/wave?action=parking-alternatives*', route => route.fulfill({ json: { status: 'available', contentId: place.id, checkedAt: '2026-09-15T05:20:00Z', source: '전국주차장정보표준데이터', items: [item] } }));
  const panel = await openParking(page);
  expect(await page.evaluate(() => (window as unknown as { parkingLocationCalls: () => number }).parkingLocationCalls())).toBe(0);
  await panel.getByRole('button', { name: '주변 주차장 보기', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { parkingLocationCalls: () => number }).parkingLocationCalls())).toBe(0);
  await panel.getByRole('combobox', { name: '기준 장소 선택', exact: true }).selectOption('parking:P1');
  expect(await page.evaluate(() => (window as unknown as { parkingLocationCalls: () => number }).parkingLocationCalls())).toBe(0);
  await panel.getByRole('button', { name: '현재 위치에서 가까운 순', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('이 기기 안에서만 비교');
  expect(await page.evaluate(() => (window as unknown as { parkingLocationCalls: () => number }).parkingLocationCalls())).toBe(1);
  const snapshot = await page.evaluate(() => ({ url: location.href, local: { ...localStorage }, session: { ...sessionStorage }, links: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'), a => a.href) }));
  for (const coordinate of Object.values(position).map(String)) { expect(requests.join(' ')).not.toContain(coordinate); expect(logs.join(' ')).not.toContain(coordinate); expect(JSON.stringify(snapshot)).not.toContain(coordinate); }
});

test('permission denial, empty and provider error preserve manual sorting and parking evidence', async ({ page }) => {
  let mode: 'available' | 'empty' | 'error' = 'available';
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(_success: PositionCallback, failure: PositionErrorCallback) { failure({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'denied' } as GeolocationPositionError); } } }));
  await page.route('**/api/wave?action=parking-alternatives*', route => mode === 'error' ? route.fulfill({ status: 502, json: { error: 'Unavailable' } }) : route.fulfill({ json: { status: mode, contentId: place.id, checkedAt: '2026-09-15T05:20:00Z', source: '전국주차장정보표준데이터', items: mode === 'available' ? [item] : [] } }));
  let panel = await openParking(page); await panel.getByRole('button', { name: '주변 주차장 보기', exact: true }).click(); await panel.getByRole('button', { name: '현재 위치에서 가까운 순', exact: true }).click(); await expect(panel.getByRole('status')).toContainText('위치 권한 없이'); await expect(panel.getByRole('combobox', { name: '기준 장소 선택' })).toBeEnabled();
  await page.keyboard.press('Escape'); mode = 'empty'; panel = await openParking(page); await panel.getByRole('button', { name: '주변 주차장 보기', exact: true }).click(); await expect(panel).toContainText('조건에 맞는 주변 주차장을 찾지 못했어요.');
  await page.keyboard.press('Escape'); mode = 'error'; panel = await openParking(page); await panel.getByRole('button', { name: '주변 주차장 보기', exact: true }).click(); await expect(panel.getByRole('alert')).toContainText('관광지의 주차 안내는 계속 볼 수 있어요.'); await expect(page.getByRole('dialog')).toContainText('주차: 미확인');
});

test('closing place details aborts an unfinished parking request and preserves the itinerary', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    let parkingAborts = 0;
    Object.assign(window, { parkingAbortCount: () => parkingAborts });
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('action=parking-alternatives')) init?.signal?.addEventListener('abort', () => parkingAborts++, { once: true });
      return originalFetch(input, init);
    };
  });
  await page.route('**/api/wave?action=parking-alternatives*', async route => {
    await new Promise(resolve => setTimeout(resolve, 10_000));
    await route.fulfill({ json: { status: 'empty', contentId: place.id, checkedAt: '2026-09-15T05:20:00Z', source: '전국주차장정보표준데이터', items: [] } });
  });
  const panel = await openParking(page);
  const before = await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'));
  await panel.getByRole('button', { name: '주변 주차장 보기', exact: true }).click();
  await expect(panel.getByRole('button', { name: '주변 주차장을 찾고 있어요.', exact: true })).toHaveAttribute('aria-busy', 'true');
  await page.getByRole('dialog').getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as { parkingAbortCount: () => number }).parkingAbortCount())).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(before);
});
