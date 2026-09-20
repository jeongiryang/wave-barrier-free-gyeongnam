import { openNaruTool } from './naru-tool-fixtures';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, openItinerary } from './fixtures';
import type { Place, PlanData } from '../features/planner/types';

const place = { id: '3003', contentTypeId: '14', city: '창원', name: '검증용 관광지', address: '경상남도 창원시', summary: '공식 설명', image: '', mapX: '128.691', mapY: '35.238', score: 30, accessibility: [{ key: 'restroom', label: '장애인 화장실', state: 'unknown', detail: '' }], features: [], details: [], source: '한국관광공사' } satisfies Place;
const item = { id: 'OFFICIAL-1', name: '중앙 공중화장실', address: '경상남도 창원시 중앙대로 1', distanceFromPlaceMeters: 125, openingHours: '09:00–18:00', phoneNumber: '055-123-4567', evidence: { accessibleToilet: 'confirmed', entranceStep: 'unknown', entranceDoor: 'unknown', grabBars: 'unknown', turningSpace: 'unknown', sinkAccess: 'unknown', elevatorRequired: 'unknown', emergencyBell: 'unknown' }, sources: [{ type: 'official', provider: '행정안전부', referenceDate: '2026-09-13' }], destination: { latitude: 35.2385, longitude: 128.6915 } };
type RestroomAuditWindow = Window & { restroomGpsCalls: () => number };

async function openFinder(page: Page) {
  await mockPlannerApi(page, { plannerView: 'overview', savedPlaces: [place] });
  await page.route('**/api/wave?action=plan*', route => route.fulfill({ json: { mode: 'live', generatedAt: '2026-09-15T00:00:00Z', baseYm: '202609', places: [place], course: null, audio: null, stops: [], statuses: [] } satisfies PlanData }));
  await page.addInitScript(place => { if (localStorage.getItem('wave-current-trip-v1')) return; localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: { 'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': JSON.stringify([place.id]), 'wave-saved-place-catalog-v1': JSON.stringify([place]), 'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: [place.id] }), 'wave-trip-schedule-v1': JSON.stringify({ travelStart: '2026-09-15', travelEnd: '2026-09-15', dayStartTime: '10:00', scheduleAssignments: { [place.id]: '2026-09-15' } }) } })); }, place);
  await page.goto('/planner'); await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원'); await openItinerary(page);
  await openNaruTool(page, '이동 부담·휴식');
  const options = page.locator('.simple-day-options');
  await options.getByRole('button', { name: '화장실 찾기', exact: true }).click();
  return page.getByRole('region', { name: '주변 공중화장실', exact: true });
}

test('explicit lookup keeps official evidence separate and add requires preview, confirmation and exact undo', async ({ page }, info) => {
  const calls: string[] = []; await page.route('**/api/wave?action=restroom-alternatives*', route => { calls.push(route.request().url()); return route.fulfill({ json: { status: 'available', contentId: place.id, checkedAt: '2026-09-15T00:00:00Z', items: [item] } }); });
  const panel = await openFinder(page); expect(calls).toEqual([]);
  await panel.getByRole('button', { name: '공중화장실 더 보기', exact: true }).click(); await expect(panel).toContainText('중앙 공중화장실'); expect(calls).toHaveLength(1);
  await expect(panel).toContainText('등록 정보 있음 · 장애인용 대변기 등록'); await expect(panel).toContainText('문턱·문폭·회전공간과 현재 운영 여부는 전화로 확인해 주세요.');
  const map = panel.getByRole('link', { name: item.address, exact: true }); expect(await map.getAttribute('href')).not.toMatch(/from|origin|sLat|sLng/i);
  await panel.getByRole('button', { name: '경유지로 추가', exact: true }).click(); await expect(panel).toContainText(`${item.name}을 ${place.name} 다음에 추가할까요?`);
  await panel.getByRole('button', { name: '취소', exact: true }).click(); await expect(panel.getByText(/다음에 추가할까요/)).toHaveCount(0);
  await panel.getByRole('button', { name: '경유지로 추가', exact: true }).click(); await panel.getByRole('button', { name: '추가', exact: true }).click(); await expect(panel.getByRole('status')).toContainText('화장실 경유지를 일정에 추가했어요.');
  const stored = await page.evaluate(() => localStorage.getItem('wave-saved-place-catalog-v1') || ''); expect(stored).toContain('official-restroom'); expect(stored).toContain('2026-09-13');
  await panel.getByRole('button', { name: '되돌리기', exact: true }).click(); await expect(panel.getByRole('status')).toContainText('되돌렸어요');
  for (const width of info.project.name.startsWith('desktop') ? [1440, 960] : [390, 320]) { await page.setViewportSize({ width, height: 960 }); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); }
  await page.setViewportSize({ width: 1280, height: 960 }); for (const zoom of ['2', '4']) { await page.evaluate(value => { document.documentElement.style.zoom = value; }, zoom); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); } await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  expect((await new AxeBuilder({ page }).include('.restroom-alternatives').analyze()).violations).toEqual([]);
});

test('GPS is requested only by 가까운 순 and never leaves memory; denial and API failure preserve itinerary', async ({ page }) => {
  const point = { latitude: 35.12345678, longitude: 128.87654321 }, requests: string[] = [], logs: string[] = []; page.on('request', request => requests.push(request.url() + (request.postData() || ''))); page.on('console', message => logs.push(message.text()));
  await page.addInitScript(point => { let calls = 0; Object.assign(window, { restroomGpsCalls: () => calls }); Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(success: PositionCallback) { calls++; success({ coords: point } as GeolocationPosition); } } }); }, point);
  await page.route('**/api/wave?action=restroom-alternatives*', route => route.fulfill({ json: { status: 'available', contentId: place.id, checkedAt: '2026-09-15T00:00:00Z', items: [item] } }));
  const panel = await openFinder(page), before = await page.evaluate(() => localStorage.getItem('wave-current-trip-v1')); expect(await page.evaluate(() => (window as unknown as RestroomAuditWindow).restroomGpsCalls())).toBe(0);
  await panel.getByRole('button', { name: '공중화장실 더 보기', exact: true }).click(); expect(await page.evaluate(() => (window as unknown as RestroomAuditWindow).restroomGpsCalls())).toBe(0);
  await panel.getByRole('button', { name: '현재 위치에서 가까운 순', exact: true }).click(); await expect(panel.getByRole('status')).toContainText('기기 메모리에서만'); expect(await page.evaluate(() => (window as unknown as RestroomAuditWindow).restroomGpsCalls())).toBe(1);
  const snapshot = await page.evaluate(() => ({ url: location.href, local: { ...localStorage }, session: { ...sessionStorage }, links: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'), a => a.href) }));
  for (const coordinate of Object.values(point).map(String)) { expect(requests.join(' ')).not.toContain(coordinate); expect(logs.join(' ')).not.toContain(coordinate); expect(JSON.stringify(snapshot)).not.toContain(coordinate); }
  expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(before);
});

test('empty and provider failure keep the current itinerary', async ({ page }) => {
  let mode: 'empty'|'error' = 'empty'; await page.route('**/api/wave?action=restroom-alternatives*', route => mode === 'error' ? route.fulfill({ status: 502, json: { error: 'unavailable' } }) : route.fulfill({ json: { status: 'empty', contentId: place.id, checkedAt: '2026-09-15T00:00:00Z', items: [] } }));
  let panel = await openFinder(page); const before = await page.evaluate(() => localStorage.getItem('wave-current-trip-v1')); await panel.getByRole('button', { name: '공중화장실 더 보기', exact: true }).click(); await expect(panel).toContainText('공식 데이터에서 주변 공중화장실을 찾지 못했어요.'); expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(before);
  mode = 'error'; await page.reload(); panel = await openFinder(page); await panel.getByRole('button', { name: '공중화장실 더 보기', exact: true }).click(); await expect(panel.getByRole('alert')).toContainText('일정은 그대로예요.');
});

test('location denial retains the place-based order and complete manual controls', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(_success: PositionCallback, failure: PositionErrorCallback) { failure({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'denied' } as GeolocationPositionError); } } }));
  await page.route('**/api/wave?action=restroom-alternatives*', route => route.fulfill({ json: { status: 'available', contentId: place.id, checkedAt: '2026-09-15T00:00:00Z', items: [item] } }));
  const panel = await openFinder(page); await panel.getByRole('button', { name: '공중화장실 더 보기', exact: true }).click(); await panel.getByRole('button', { name: '현재 위치에서 가까운 순', exact: true }).click(); await expect(panel.getByRole('status')).toContainText('위치 권한 없이 일정 장소 기준 순서를 유지해요.'); await expect(panel.getByRole('combobox', { name: '기준 장소 선택', exact: true })).toBeEnabled(); await expect(panel.getByRole('button', { name: '경유지로 추가', exact: true })).toBeEnabled();
});
