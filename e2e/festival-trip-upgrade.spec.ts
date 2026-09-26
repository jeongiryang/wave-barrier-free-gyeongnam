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
  const compactFilters = page.getByRole('button', { name: '축제 검색 조건', exact: false });
  if (page.viewportSize()!.width <= 600) {
    await expect(compactFilters).toBeEnabled();
    await compactFilters.click();
    await expect(compactFilters).toHaveAttribute('aria-expanded', 'true');
  }
  const filters = page.getByRole('region', { name: '축제 찾기', exact: true });
  await expect(page.getByRole('button', { name: '주류 행사 제외', exact: true })).toBeVisible();
  await expect(filters.getByLabel('언제부터', { exact: true })).toHaveValue('2026-09-12');
  await expect(filters.getByLabel('언제까지', { exact: true })).toHaveValue('2026-10-12');
  await expect(page.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
  const card = page.locator('.festival-card').filter({ has: page.getByRole('heading', { name: event.name, exact: true }) });
  await card.locator('.night-festival-more > summary').click();
  return card;
}

// Official API-shaped fixtures only; these tests do not call a real provider.
const restroomItem = { id: 'fixture-restroom-1', name: '합성 등록 화장실', address: '경상남도 창원시 중앙대로 1', openingHours: '09:00–18:00', distanceFromPlaceMeters: 210,
  evidence: { accessibleToilet: 'confirmed' }, sources: [{ type: 'official', provider: '전국공중화장실표준데이터', referenceDate: '2026-09-15' }], destination: { latitude: 35.2385, longitude: 128.6915 } };
const restroomResponse = { status: 'available', contentId: event.id, radiusKm: 5, checkedAt: '2026-09-15T14:04:23.624Z', source: '전국공중화장실표준데이터', items: [restroomItem] };
async function restroomRoute(page: Page, handler: (route: Route) => Promise<void> = route => route.fulfill({ json: restroomResponse })) {
  const requests: string[] = [];
  await page.route('https://*.tile.openstreetmap.org/**', route => route.abort());
  await page.route('**/api/wave?action=restroom-alternatives&**', route => { requests.push(route.request().url()); return handler(route); });
  return requests;
}

test('축제 현장 편의 지도는 공식 응답의 위치와 같은 목록을 표시하고 쉼터는 미확인으로 남긴다', async ({ page }) => {
  const beforeOpen: string[] = [];
  page.on('request', request => { if (request.url().includes('action=restroom-alternatives')) beforeOpen.push(request.url()); });
  const officialEvent = { ...event, websiteUrl: 'https://festival.example.org/guide', phone: '055-123-4567' };
  const card = await setup(page, route => route.fulfill({ json: result([officialEvent]) }));
  const safeTextItem = { ...restroomItem, name: '<img src=x onerror=alert(1)> 합성 화장실' };
  const requests = await restroomRoute(page, route => route.fulfill({ json: { ...restroomResponse, items: [safeTextItem] } }));
  expect(requests).toEqual([]);
  expect(beforeOpen).toEqual([]);
  const opener = card.getByRole('button', { name: '현장 편의 지도', exact: true });
  await opener.click();
  const dialog = page.getByTestId('festival-amenity-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: `${event.name} 현장 편의 정보`, exact: true })).toBeVisible();
  await expect(dialog.getByTestId('festival-amenity-map')).toBeVisible();
  await expect(dialog.locator('[data-amenity-marker="restroom"]')).toHaveCount(1);
  await expect(dialog.locator('[data-amenity-list-id]')).toHaveCount(1);
  await expect(dialog).toContainText('직선거리 210m');
  await expect(dialog).toContainText('기준일 2026-09-15');
  await expect(dialog).toContainText('현재 운영 여부는 방문 전에 확인');
  await dialog.getByRole('button', { name: `${safeTextItem.name} · 등록된 공중화장실`, exact: true }).click();
  await expect(dialog.locator('.leaflet-popup-content')).toContainText(safeTextItem.name);
  await expect(dialog.locator('.leaflet-popup-content img')).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: '축제 공식 안내 열기' })).toHaveAttribute('href', officialEvent.websiteUrl);
  await dialog.getByRole('button', { name: '쉬는 곳', exact: true }).click();
  await expect(dialog).toContainText('쉼터의 공식 위치는 확인되지 않았어요.');
  await expect(dialog.getByTestId('festival-amenity-map')).toHaveCount(0);
  await expect(dialog.locator('[data-amenity-marker="rest"]')).toHaveCount(0);
  await dialog.getByRole('button', { name: '화장실', exact: true }).click();
  await expect(dialog.locator('[data-amenity-marker="restroom"]')).toHaveCount(1);
  expect(requests).toHaveLength(1);
  await expect(dialog).toContainText('축제 주최 측의 공식 현장 지도');
  expect((await new AxeBuilder({ page }).include('[data-testid="festival-amenity-dialog"]').analyze()).violations).toEqual([]);
  for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('축제 편의 조회의 정상 0건과 제공처 오류를 구분하고 오류 후 다시 확인한다', async ({ page }) => {
  const card = await setup(page);
  let fail = true;
  const requests = await restroomRoute(page, route => fail ? route.fulfill({ status: 502, json: { status: 'provider-error', contentId: event.id } }) : route.fulfill({ json: { ...restroomResponse, status: 'empty', items: [] } }));
  await card.getByRole('button', { name: '현장 편의 지도', exact: true }).click();
  const dialog = page.getByTestId('festival-amenity-dialog');
  await expect(dialog.getByRole('alert')).toContainText('조회 실패는 시설이 없다는 뜻이 아닙니다.');
  await expect(dialog.getByTestId('festival-amenity-map')).toHaveCount(0);
  fail = false;
  await dialog.getByRole('button', { name: '다시 확인', exact: true }).click();
  await expect(dialog).toContainText('5km 안에 확인된 화장실 기록이 없어요.');
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await expect(dialog.getByTestId('festival-amenity-map')).toHaveCount(0);
  expect(requests).toHaveLength(2);
});

test('축제 좌표가 없으면 임의 중심 지도나 시설 조회를 만들지 않는다', async ({ page }) => {
  const withoutPosition = { ...event, mapX: '', mapY: '', websiteUrl: 'javascript:alert(1)' };
  const card = await setup(page, route => route.fulfill({ json: result([withoutPosition]) }));
  const requests = await restroomRoute(page);
  await card.getByRole('button', { name: '현장 편의 지도', exact: true }).click();
  const dialog = page.getByTestId('festival-amenity-dialog');
  await expect(dialog).toContainText('축제의 공식 위치를 확인할 수 없어');
  await expect(dialog.getByTestId('festival-amenity-map')).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: '축제 공식 안내 열기' })).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('축제 편의 지도를 닫으면 조회를 취소하고 늦은 결과가 다시 연 화면을 덮지 않는다', async ({ page }) => {
  const card = await setup(page);
  const gate = deferred(), finished = deferred();
  let calls = 0;
  await restroomRoute(page, async route => {
    if (++calls === 1) {
      await gate.promise;
      await route.fulfill({ json: restroomResponse }).catch(() => undefined);
      finished.release();
    } else await route.fulfill({ json: { ...restroomResponse, status: 'empty', items: [] } });
  });
  const opener = card.getByRole('button', { name: '현장 편의 지도', exact: true });
  await opener.click();
  const dialog = page.getByTestId('festival-amenity-dialog');
  await expect.poll(() => calls).toBe(1);
  const aborted = page.waitForEvent('requestfailed', request => request.url().includes('action=restroom-alternatives'));
  await page.keyboard.press('Escape');
  await aborted;
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(dialog).toContainText('5km 안에 확인된 화장실 기록이 없어요.');
  gate.release(); await finished.promise;
  await expect(dialog.locator('[data-amenity-list-id]')).toHaveCount(0);
  await expect(dialog.getByTestId('festival-amenity-map')).toHaveCount(0);
  await expect(dialog).toContainText('5km 안에 확인된 화장실 기록이 없어요.');
});

test('축제 포스터나 제목을 누르면 포스터와 기본 정보가 나란히 열린다', async ({ page }) => {
  const posterEvent = { ...event, image: '/media/night/festival.webp' };
  const card = await setup(page, route => route.fulfill({ json: result([posterEvent]) }));
  const opener = card.getByRole('button', { name: `${event.name} 축제 상세 보기`, exact: true });
  // The full-card photograph shares its lower area with editable details.
  // Click the exposed photograph above the text, leaving those controls usable.
  await opener.click({ position: { x: 70, y: 65 } });
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

test('축제 상세 안에서 선택한 방문 날짜로 담고 기존 고정 방문과 휴식을 보존한다', async ({ page }) => {
  const card = await setup(page);
  await card.getByRole('button', { name: `${event.name} 축제 상세 보기`, exact: true }).click({ position: { x: 70, y: 65 } });
  const dialog = page.getByTestId('festival-detail-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('방문 날짜', { exact: true }).fill('2026-09-21');
  await dialog.getByRole('button', { name: '내 일정에 담기', exact: true }).click();
  await expect(page).toHaveURL(/\/planner\?region=.*#itinerary$/);
  await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true })).toBeEnabled();
  const after = JSON.parse((await records(page)).trip!).values;
  expect(JSON.parse(after['wave-saved-places'])).toEqual(['1001', '3001']);
  const current = JSON.parse(after['wave-trip-schedule-v1']);
  expect(current.scheduleAssignments).toEqual({ '1001': '2026-09-20', '3001': '2026-09-21' });
  expect(current.fixedVisits).toEqual(schedule.fixedVisits);
  expect(current.breakMinutesByPlaceId).toEqual(schedule.breakMinutesByPlaceId);
  expect(current.comfort).toEqual(schedule.comfort);
});

test('축제 날짜 입력과 달력 버튼은 같은 날짜를 사용하고 닫기 초점을 보존한다', async ({ page }) => {
  await setup(page);
  const filters = page.getByRole('region', { name: '축제 찾기', exact: true });
  for (const name of ['언제부터', '언제까지']) {
    const input = filters.getByLabel(name, { exact: true });
    const box = await input.boundingBox();
    await input.click({ position: { x: 12, y: Math.max(2, (box?.height || 46) / 2) } });
    await expect(input).toBeFocused();
    const date = await input.inputValue();
    const opener = filters.getByRole('button', { name: `${name} 달력 열기`, exact: true });
    await opener.click();
    const calendar = page.getByRole('dialog', { name: `${name} 날짜 선택`, exact: true });
    await expect(calendar).toBeVisible();
    await expect(calendar.locator('td[aria-selected="true"] button')).toHaveAttribute('data-date', date);
    await page.keyboard.press('Escape');
    await expect(calendar).not.toBeVisible();
    await expect(opener).toBeFocused();
    await expect(input).toHaveValue(date);
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
