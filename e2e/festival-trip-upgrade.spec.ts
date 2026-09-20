import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, plan, showItineraryMap } from './fixtures';

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
  await mockPlannerApi(page, { preserveView: true });
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
  const filters = page.getByRole('region', { name: '축제 찾기', exact: true });
  await expect(page.getByRole('button', { name: '주류 행사 제외', exact: true })).toBeVisible();
  await expect(filters.getByLabel('언제부터', { exact: true })).toHaveValue('2026-09-12');
  await expect(filters.getByLabel('언제까지', { exact: true })).toHaveValue('2026-10-12');
  await expect(page.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
  const card = page.locator('.festival-card').filter({ has: page.getByRole('heading', { name: event.name, exact: true }) });
  await card.locator('.night-festival-more > summary').click();
  return card;
}

test('축제 현장 정보는 쉬는 곳과 화장실 예시만 실제 지도에 표시한다', async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', route => route.fulfill({ status: 204 }));
  const card = await setup(page);
  await expect(card.getByTestId('festival-amenity-map')).toHaveCount(0);
  await card.getByRole('button', { name: '지금 현장·감각 정보', exact: true }).click();
  const dialog = page.getByTestId('festival-amenity-dialog');
  await expect(dialog).toBeVisible();
  const map = dialog.getByTestId('festival-amenity-map');
  await expect(map).toBeVisible();
  await expect(dialog.getByRole('button', { name: '쉬는 곳', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.locator('[data-amenity-marker="rest"]')).toHaveCount(3);
  await expect(dialog.getByRole('button', { name: '쉬는 곳 입구 벤치', exact: true })).toBeVisible();

  await dialog.getByRole('button', { name: '화장실', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '화장실', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.locator('[data-amenity-marker="restroom"]')).toHaveCount(3);
  await expect(dialog.getByRole('button', { name: '화장실 컨테이너 화장실', exact: true })).toBeVisible();
  await expect(dialog.getByText('임의의 데이터를 사용하여 표시한 마크입니다. 실제 지도를 확인해 주세요.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: '쉬는 곳', exact: true }).focus();
  await expect(dialog.getByRole('button', { name: '쉬는 곳', exact: true })).toBeFocused();

  for (const removed of ['소리', '혼잡', '휠체어 이동', '빛', '현장 정보 새로 확인', '내 근처 일정 장소 찾기']) {
    await expect(dialog.getByRole('button', { name: removed, exact: true })).toHaveCount(0);
  }
  await expect(dialog.getByText('공식정보 재확인 목록', { exact: false })).toHaveCount(0);
  await expect(dialog.getByText('지금 이 장소에서 직접 본 정보 공유', { exact: true })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('[data-testid="festival-amenity-dialog"]').analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('festival-amenities.png'), fullPage: true });

  for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
});

test('축제 포스터나 제목을 누르면 포스터와 기본 정보가 나란히 열린다', async ({ page }) => {
  const posterEvent = { ...event, image: '/media/night/festival.webp' };
  const card = await setup(page, route => route.fulfill({ json: result([posterEvent]) }));
  const opener = card.getByRole('button', { name: `${event.name} 축제 상세 보기`, exact: true });
  await opener.click();
  const dialog = page.getByTestId('festival-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
  await expect(dialog.getByRole('img', { name: `${event.name} 축제 포스터`, exact: true })).toBeVisible();
  await expect(dialog.getByText('2026-09-19 – 2026-09-22', { exact: true })).toBeVisible();
  await expect(dialog.getByText(event.address, { exact: true })).toBeVisible();
  const columns = await dialog.locator('> div').evaluate(element => getComputedStyle(element).gridTemplateColumns);
  if ((page.viewportSize()?.width || 0) > 700) expect(columns.split(' ').length).toBeGreaterThan(1);
  else expect(columns.split(' ').length).toBe(1);
  expect((await new AxeBuilder({ page }).include('[data-testid="festival-detail-dialog"]').analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('festival-detail.png'), fullPage: true });
  await dialog.getByRole('button', { name: '축제 상세 정보 닫기', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

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
  await dates.getByRole('button', { name: /^2일차/ }).click();
  await expect(page.getByRole('region', { name: '날짜별 여행 일정', exact: true }).getByRole('button', { name: event.name, exact: true })).toBeVisible();
  await showItineraryMap(page); await expect(page.locator('.simple-itinerary-map .leaflet-container')).toBeVisible();
  await expect(page.locator('.simple-itinerary-map .wave-map-icon.place[data-place-id="3001"]')).toBeVisible();
  await expect(page.locator('.simple-itinerary-map .wave-map-icon.place[data-place-id="1001"]')).toHaveCount(0);
});

test('날짜 입력칸 어디를 눌러도 달력 열기를 요청한다', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    HTMLInputElement.prototype.showPicker = function showPicker() { this.dataset.pickerOpened = 'true'; };
  });
  const filters = page.getByRole('region', { name: '축제 찾기', exact: true });
  for (const name of ['언제부터', '언제까지']) {
    const input = filters.getByLabel(name, { exact: true });
    const box = await input.boundingBox();
    await input.click({ position: { x: 12, y: Math.max(2, (box?.height || 46) / 2) } });
    await expect(input).toHaveAttribute('data-picker-opened', 'true');
  }
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
    if (change === 'region') await filters.getByRole('combobox', { name: '지역 선택', exact: true }).selectOption('통영');
    else await filters.getByLabel('언제부터', { exact: true }).fill('2026-09-25');
    await expect(page.locator('#festival-results')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('heading', { name: event.name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '내 일정에 담기', exact: true })).toHaveCount(0);
    await expect.poll(() => delayed).toBe(1);
    if (change === 'region') await filters.getByRole('combobox', { name: '지역 선택', exact: true }).selectOption('거제');
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
