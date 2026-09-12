import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, plan } from './fixtures';
import type { AccountTripPayload } from '../features/account-travel/types';

test.use({ contextOptions: { reducedMotion: 'reduce' } });
const start = '2026-10-08', end = '2026-10-09';
const ids = ['1002', '1001'];
const schedule = { travelStart: start, travelEnd: end, dayStartTime: '09:30', scheduleAssignments: { '1002': start, '1001': end }, visitMinutesByPlaceId: { '1001': 120, '1002': 120 } };
const values = { 'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '["nature"]', 'wave-saved-places': JSON.stringify(ids), 'wave-saved-place-catalog-v1': JSON.stringify(plan.places), 'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids }), 'wave-trip-schedule-v1': JSON.stringify(schedule) };
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
function bundle(mode: string, label = `current ${mode}`) {
  return { configured: true, providers: [], context: { nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] },
    alternatives: [{ id: label, label, provider: 'Synthetic route fixture', mode, configured: true, totalTime: mode === 'car' ? 57 : 99, totalDistance: 8800, totalWalk: 0, payment: 0, transfers: 0, segments: [], geometry: [] }],
  };
}
async function setup(page: Page, mode?: unknown) {
  await mockPlannerApi(page, { plannerView: 'overview' });
  await page.addInitScript(({ values, schedule, mode }) => {
    if (!localStorage.getItem('wave-current-trip-v1')) localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: { ...values, 'wave-trip-schedule-v1': JSON.stringify({ ...schedule, ...(mode === undefined ? {} : { travelMode: mode }) }) } }));
    sessionStorage.setItem('wave-session-facilities-v1', '["wheel"]');
  }, { values, schedule, mode });
  const calls: string[] = [];
  await page.route('**/api/route?*', route => {
    const value = new URL(route.request().url()).searchParams.get('mode') || '';
    calls.push(value); return route.fulfill({ json: bundle(value) });
  });
  return calls;
}
async function stored(page: Page) {
  return page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    return { schedule: JSON.parse(data['wave-trip-schedule-v1'] || '{}'), ids: JSON.parse(data['wave-saved-places'] || '[]'), order: JSON.parse(data['wave-trip-order-v1'] || '{}'), profiles: JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]'), books: JSON.parse(localStorage.getItem('wave-travel-book-v1') || '[]') };
  });
}
async function settled(page: Page, mode: string) {
  const coverage = page.locator('.itinerary-route-coverage');
  await expect(coverage.locator('select')).toHaveValue(mode);
  await expect(coverage.getByRole('status')).toContainText('전체 2구간 중 2구간 확인');
  await expect(coverage.locator('.coverage-actions > button').first()).toHaveAttribute('aria-busy', 'false');
  await expect.poll(async () => (await stored(page)).schedule.travelMode).toBe(mode);
}

test('the chosen car mode survives reload, archive restore, sharing and calendar export with the same itinerary', async ({ page }) => {
  const calls = await setup(page);
  await page.goto('/planner#itinerary');
  await settled(page, 'transit');
  await page.locator('.itinerary-route-coverage select').selectOption('car');
  await settled(page, 'car');
  await expect(page.locator('.day-planner-grid').getByText(/이동 57분/).first()).toBeVisible();
  calls.length = 0;
  await page.reload();
  await settled(page, 'car');
  expect(calls.length).toBeGreaterThanOrEqual(2);
  expect(calls.every(mode => mode === 'car')).toBe(true);
  await page.getByRole('button', { name: '내 일정에 저장', exact: true }).click();
  await expect(page.locator('.travel-book-archive-action [role=status]')).toContainText('내 일정에 저장했어요');
  expect((await stored(page)).books[0]).toMatchObject({ ...schedule, travelMode: 'car' });
  await page.goto('/travel-book');
  calls.length = 0;
  await page.getByRole('button', { name: '이 일정 다시 열기', exact: true }).click();
  await settled(page, 'car');
  expect(calls.length).toBeGreaterThanOrEqual(2);
  expect(calls.every(mode => mode === 'car')).toBe(true);
  const current = await stored(page);
  expect(current.schedule).toMatchObject({ ...schedule, travelMode: 'car' });
  expect(current.ids).toEqual(ids); expect(current.order).toEqual({ mode: 'manual', ids }); expect(current.profiles).toEqual(['wheel']);
  await expect(page.getByLabel('경남도립미술관 머무는 시간', { exact: true })).toHaveValue('120');
  expect((await new AxeBuilder({ page }).include('.itinerary-route-coverage').analyze()).violations).toEqual([]);
  const shares: Array<{ selections: { travelMode: string; selectedPlaceIds: string[] } }> = [];
  await page.route('**/api/trips', route => { shares.push(route.request().postDataJSON()); return route.fulfill({ json: { url: `${new URL(page.url()).origin}/trip/123456789abc` } }); });
  await page.locator('.itinerary-primary-actions').getByRole('button').click();
  await expect(page.locator('.itinerary-primary-actions').getByRole('link')).toHaveAttribute('href', /123456789abc$/);
  expect(shares[0].selections.travelMode).toBe('car'); expect(shares[0].selections.selectedPlaceIds).toEqual(ids);
  expect(JSON.stringify(shares[0])).not.toMatch(/mapX|mapY|geometry|credentials/);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '캘린더(.ics) 저장', exact: true }).click();
  const download = await pending;
  expect((await readFile((await download.path())!, 'utf8')).replace(/\r\n /g, '')).toContain('선택한 이동수단: 자동차');
  expect(shares).toHaveLength(1);
});

for (const [name, value] of [['legacy', undefined], ['invalid', { mode: 'car', latitude: 35 }]] as const) test(`${name} transport defaults to transit without changing dates, order or visits`, async ({ page }) => {
  const calls = await setup(page, value);
  await page.goto('/planner#itinerary');
  await settled(page, 'transit');
  expect(calls.every(mode => mode === 'transit')).toBe(true);
  const current = await stored(page);
  expect(current.schedule).toMatchObject({ ...schedule, travelMode: 'transit' }); expect(current.ids).toEqual(ids); expect(current.order.ids).toEqual(ids);
  expect(JSON.stringify(current.schedule)).not.toContain('latitude');
});

test('a delayed response for a restored mode cannot replace a newer choice or its saved value', async ({ page }) => {
  const calls = await setup(page, 'car'), gate = deferred();
  let held = 0;
  await page.route('**/api/route?*', async route => {
    const mode = new URL(route.request().url()).searchParams.get('mode') || '';
    if (mode !== 'car') return route.fallback();
    held++; await gate.promise;
    await route.fulfill({ json: bundle('car', 'obsolete car route') }).catch(() => {});
  });
  try {
    await page.goto('/planner#itinerary');
    await expect.poll(() => held).toBeGreaterThanOrEqual(2);
    await page.locator('.itinerary-route-coverage select').selectOption('bicycle');
    gate.release();
    await settled(page, 'bicycle');
    await expect(page.locator('.route-options')).not.toContainText('obsolete car route');
    await expect(page.locator('.day-planner-grid')).not.toContainText('이동 57분');
    calls.length = 0;
    await page.reload();
    await settled(page, 'bicycle');
    expect(calls.length).toBeGreaterThanOrEqual(2); expect(calls.every(mode => mode === 'bicycle')).toBe(true);
  } finally { gate.release(); }
});

test('a changed travel mode invalidates a pending shared itinerary before a new link can be used', async ({ page }) => {
  await setup(page, 'car');
  const gate = deferred(), modes: string[] = [];
  await page.route('**/api/trips', async route => {
    modes.push(route.request().postDataJSON().selections.travelMode);
    if (modes.length === 1) await gate.promise;
    await route.fulfill({ json: { url: `${new URL(page.url()).origin}/trip/${modes.length === 1 ? 'obsolete-car' : 'current-bicycle'}` } });
  });
  try {
    await page.goto('/planner#itinerary'); await settled(page, 'car');
    const actions = page.locator('.itinerary-primary-actions');
    await actions.getByRole('button').click(); await expect.poll(() => modes.length).toBe(1);
    await page.locator('.itinerary-route-coverage select').selectOption('bicycle');
    gate.release(); await settled(page, 'bicycle');
    await expect(actions.getByRole('link')).toHaveCount(0);
    await actions.getByRole('button').click();
    await expect(actions.getByRole('link')).toHaveAttribute('href', /current-bicycle$/);
    expect(modes).toEqual(['car', 'bicycle']);
  } finally { gate.release(); }
});

test('an account itinerary restores its transport and backs up the previous trip with its own mode', async ({ page }) => {
  await setup(page, 'walk');
  const id = '12345678-1234-4123-8123-123456789012';
  const payload: AccountTripPayload = { version: 1, title: '자동차로 가는 창원', region: '창원', ...schedule, travelMode: 'car', themes: ['nature'], placeIds: ids, status: 'planned', note: '' };
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: { user: { id: 'mode-owner', name: '여행자', email: 'synthetic@example.com' }, session: { id: 'mode-session' } } }));
  await page.route('**/api/account/travel/**', route => {
    if (route.request().url().endsWith('/preferences')) return route.fulfill({ json: { selectedIds: [], revision: 0 } });
    if (route.request().url().endsWith('/places')) return route.fulfill({ json: { places: plan.places, missing: 0 } });
    expect(route.request().method()).toBe('GET');
    expect(new URL(route.request().url()).pathname).toBe(`/api/account/travel/${id}`);
    return route.fulfill({ json: { id, payload, role: 'owner', revision: 2, updatedAt: Date.now(), members: [], votes: [], comments: [], invitationActive: false } });
  });
  await page.goto(`/my-trips/${id}`);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '여행 파일로 내보내기', exact: true }).click();
  const download = await pending;
  expect(JSON.parse(await readFile((await download.path())!, 'utf8')).travelMode).toBe('car');
  await page.getByRole('button', { name: '지도·나루와 이어서 편집 →', exact: true }).click();
  await settled(page, 'car');
  const current = await stored(page);
  expect(current.schedule).toMatchObject({ ...schedule, travelMode: 'car' }); expect(current.ids).toEqual(ids);
  expect(current.books).toHaveLength(1); expect(current.books[0]).toMatchObject({ ...schedule, travelMode: 'walk' });
});

test('a failed transport save exports the current choice and retries without replacing the itinerary', async ({ page }) => {
  await setup(page, 'transit'); await page.goto('/planner#itinerary'); await settled(page, 'transit');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, { allowTravelSave: () => { Storage.prototype.setItem = original; } });
    Storage.prototype.setItem = function (key, value) {
      if (key === 'wave-current-trip-v1') throw new DOMException('Synthetic quota', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.locator('.itinerary-route-coverage select').selectOption('car');
  const warning = page.getByRole('alert').filter({ hasText: '이 탭에만 남아 있는 변경 사항이 있어요.' });
  await expect(warning).toBeVisible();
  expect((await stored(page)).schedule.travelMode).toBe('transit');
  const pending = page.waitForEvent('download');
  await warning.getByRole('button', { name: '여행 파일 내려받기', exact: true }).click();
  const download = await pending;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(JSON.parse(exported.values['wave-trip-schedule-v1'])).toMatchObject({ ...schedule, travelMode: 'car' });
  await page.evaluate(() => (window as unknown as { allowTravelSave: () => void }).allowTravelSave());
  await warning.getByRole('button', { name: '저장 다시 시도', exact: true }).click();
  await expect(warning).toHaveCount(0); await settled(page, 'car');
  expect((await stored(page)).ids).toEqual(ids);
  await page.reload(); await settled(page, 'car');
});
