import { expect, test, type Page, type Route } from '@playwright/test';
import { mockPlannerApi, plan } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

const original = { ...plan.places[0], image: '', accessibility: [] };
const event = { ...plan.places[1], id: '3001', contentTypeId: '15', name: '합성 가을문화 축제', image: '',
  startDate: '2026-09-19', endDate: '2026-09-22', phone: '', officialUrl: '', state: 'upcoming', facilityState: 'available', accessibility: [] };
const nextEvent = { ...event, id: '3002', city: '거제', name: '합성 새로운 조건 축제', startDate: '2026-09-25', endDate: '2026-09-26' };
const schedule = { travelStart: '2026-09-20', travelEnd: '2026-09-22', dayStartTime: '09:30', scheduleAssignments: { '1001': '2026-09-20' },
  visitMinutesByPlaceId: { '1001': 75 }, fixedVisits: { '1001': { kind: 'visit', position: 0, time: '11:00' } },
  breakMinutesByPlaceId: { '1001': 35 }, comfort: { maxWalkMinutes: 10, breakEveryMinutes: 45, breakMinutes: 20 } };
const values = { 'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '["nature"]', 'wave-saved-places': '["1001"]',
  'wave-saved-place-catalog-v1': JSON.stringify([original]), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001"]}', 'wave-trip-schedule-v1': JSON.stringify(schedule) };
const result = (items = [event]) => ({ items, state: 'live', partial: false, checkedAt: '2026-09-12T03:00:00.000Z' });
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function records(page: Page) { return page.evaluate(() => ({ trip: localStorage.getItem('wave-current-trip-v1'), books: localStorage.getItem('wave-travel-book-v1') })); }
async function setup(page: Page, handler?: (route: Route) => Promise<void>) {
  await page.clock.setFixedTime(new Date('2026-09-12T03:00:00.000Z'));
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic test API' } }));
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.route('**/api/wave?**', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('action') !== 'places') return route.fallback();
    const ids = (params.get('ids') || '').split(',');
    return route.fulfill({ json: { places: [original, event, nextEvent].filter(place => ids.includes(place.id)), missing: [] } });
  });
  await page.route('**/api/festivals?**', handler || (route => route.fulfill({ json: result() })));
  await page.addInitScript(initial => {
    if (!localStorage.getItem('wave-current-trip-v1')) localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: initial }));
    if (!sessionStorage.getItem('wave-session-facilities-v1')) sessionStorage.setItem('wave-session-facilities-v1', '["wheel"]');
  }, values);
  await page.goto('/festivals');
  await expect(page.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
  return page.locator('.festival-card').filter({ has: page.getByRole('heading', { name: event.name, exact: true }) });
}

test('축제의 실제 개최일을 골라 담으면 기존 방문일과 고정 약속을 유지한다', async ({ page }) => {
  const card = await setup(page);
  await expect(card).toContainText('2026-09-19 – 2026-09-22');
  await card.getByLabel('방문 날짜', { exact: true }).fill('2026-09-21');
  await card.getByRole('button', { name: '내 일정에 담기', exact: true }).click();
  await expect(page).toHaveURL(/\/planner\?region=.*#itinerary$/);
  await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true })).toBeEnabled();
  const after = JSON.parse((await records(page)).trip!).values;
  expect(JSON.parse(after['wave-saved-places'])).toEqual(['1001', '3001']);
  const current = JSON.parse(after['wave-trip-schedule-v1']);
  expect(current.scheduleAssignments).toEqual({ '1001': '2026-09-20', '3001': '2026-09-21' });
  expect(current.travelStart).toBe('2026-09-20'); expect(current.travelEnd).toBe('2026-09-22');
  expect(current.visitMinutesByPlaceId).toEqual({ '1001': 75, '3001': 120 });
  expect(current.fixedVisits).toEqual(schedule.fixedVisits); expect(current.breakMinutesByPlaceId).toEqual(schedule.breakMinutesByPlaceId);
  expect(current.comfort).toEqual(schedule.comfort);
  const dates = page.getByRole('group', { name: '일정 날짜', exact: true });
  await expect(page.getByRole('group', { name: '일정 보기 방식', exact: true }).getByRole('button', { name: '지도 함께 보기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.reference-board-map .leaflet-container')).toBeVisible();
  await dates.getByRole('button', { name: 'DAY 2 · 09/21', exact: true }).click();
  await expect(page.getByRole('region', { name: '날짜별 여행 일정', exact: true }).getByRole('button', { name: event.name, exact: true })).toBeVisible();
  await expect(page.locator('.reference-board-map [data-place-id="3001"]')).toBeVisible();
  await expect(page.locator('.reference-board-map [data-place-id="1001"]')).toHaveCount(0);
});

for (const change of ['region', 'date'] as const) test(`축제 ${change === 'region' ? '지역' : '날짜'} 변경 중 이전 결과를 담을 수 없고 늦은 응답은 최신 결과를 덮지 않는다`, async ({ page }) => {
  const gate = deferred(); let delayed = 0, completed = false;
  const handler = async (route: Route) => {
    const params = new URL(route.request().url()).searchParams;
    const waiting = change === 'region' ? params.get('region') === '통영' : params.get('start') === '2026-09-25';
    const latest = change === 'region' ? params.get('region') === '거제' : params.get('start') === '2026-09-26';
    if (waiting) { delayed++; await gate.promise; try { await route.fulfill({ json: result([{ ...event, id: '3999', name: '합성 오래된 응답 축제' }]) }); } catch { /* Superseded requests are deliberately aborted. */ } completed = true; return; }
    await route.fulfill({ json: result(latest ? [nextEvent] : [event]) });
  };
  try {
    await setup(page, handler); const before = await records(page);
    const filters = page.getByRole('region', { name: '축제 찾기', exact: true });
    if (change === 'region') await filters.getByRole('combobox', { name: '지역', exact: true }).selectOption('통영');
    else await filters.getByLabel('언제부터', { exact: true }).fill('2026-09-25');
    await expect(page.locator('#festival-results')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('heading', { name: event.name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '내 일정에 담기', exact: true })).toHaveCount(0);
    await expect.poll(() => delayed).toBe(1);
    if (change === 'region') await filters.getByRole('combobox', { name: '지역', exact: true }).selectOption('거제');
    else await filters.getByLabel('언제부터', { exact: true }).fill('2026-09-26');
    await expect(page.getByRole('heading', { name: nextEvent.name, exact: true })).toBeVisible();
    gate.release(); await expect.poll(() => completed).toBe(true);
    await expect(page.getByRole('heading', { name: '합성 오래된 응답 축제', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: nextEvent.name, exact: true })).toBeVisible();
    expect(await records(page)).toEqual(before);
  } finally { gate.release(); }
});

for (const fresh of [false, true]) test(`축제 ${fresh ? '새 여행' : '일정 추가'} 저장 실패는 기존 기록을 보존하고 화면에 이유를 알린다`, async ({ page }) => {
  const card = await setup(page); const before = await records(page);
  await card.getByLabel('방문 날짜', { exact: true }).fill('2026-09-21');
  await page.evaluate(() => { const native = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'wave-current-trip-v1' || key === 'wave-travel-book-v1') throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); native.call(this, key, value); }; });
  await card.getByRole('button', { name: fresh ? '이 축제로 새 여행' : '내 일정에 담기', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('기기에 저장하지 못했어요. 기존 여행은 유지됩니다');
  await expect(page).toHaveURL(/\/festivals$/);
  expect(await records(page)).toEqual(before);
  await expect(card.getByLabel('방문 날짜', { exact: true })).toHaveValue('2026-09-21');
});
