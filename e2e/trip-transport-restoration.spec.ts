import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { openNaruTool, closeNaruTool } from './naru-tool-fixtures';
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
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic API' } }));
  await mockPlannerApi(page, { preserveView: true });
  await page.route('**/api/kakao/share', route => route.fulfill({ json: { javascriptKey: '' } }));
  await page.addInitScript(({ values, schedule, mode }) => {
    if (!localStorage.getItem('wave-current-trip-v1')) localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: { ...values, 'wave-trip-schedule-v1': JSON.stringify({ ...schedule, ...(mode === undefined ? {} : { travelMode: mode }) }) } }));
    if (!sessionStorage.getItem('wave-session-facilities-v1')) sessionStorage.setItem('wave-session-facilities-v1', '["parking","route","wheelchair","elevator","restroom"]');
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
  await page.locator('#itinerary').waitFor();
  await openNaruTool(page, '이동 구간 확인');
  const coverage = page.locator('.itinerary-route-coverage');
  await expect(coverage.locator('select')).toHaveValue(mode);
  await expect(coverage.getByRole('status')).toContainText('전체 2구간 중 2구간 확인');
  await expect(coverage.locator('.coverage-actions > button').first()).toHaveAttribute('aria-busy', 'false');
  await expect.poll(async () => (await stored(page)).schedule.travelMode).toBe(mode);
  await closeNaruTool(page);
}
async function chooseMode(page: Page, mode: string) {
  await page.getByRole('button', { name: '여행 설정', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '여행 설정', exact: true });
  await editor.getByRole('combobox', { name: '이동 수단', exact: true }).selectOption(mode);
  await editor.getByRole('button', { name: '적용', exact: true }).click();
}

test('the chosen car mode survives reload, archive restore, sharing and calendar export with the same itinerary', async ({ page }) => {
  const calls = await setup(page);
  await page.goto('/planner#itinerary');
  await settled(page, 'transit');
  await chooseMode(page, 'car');
  await settled(page, 'car');
  await expect(page.locator('.simple-stops').getByText(/이동 57분/).first()).toBeVisible();
  calls.length = 0;
  await page.reload();
  await settled(page, 'car');
  expect(calls.length).toBeGreaterThanOrEqual(2);
  expect(calls.every(mode => mode === 'car')).toBe(true);
  await page.getByRole('button', { name: '내 여행에 저장', exact: true }).click();
  await expect(page.locator('.simple-save-control [role=status]')).toContainText('내 여행에 저장했어요');
  expect((await stored(page)).books[0]).toMatchObject({ ...schedule, travelMode: 'car' });
  await page.goto('/travel-book');
  calls.length = 0;
  await page.getByRole('button', { name: '이 일정 다시 열기', exact: true }).click();
  await settled(page, 'car');
  expect(calls.length).toBeGreaterThanOrEqual(2);
  expect(calls.every(mode => mode === 'car')).toBe(true);
  const current = await stored(page);
  expect(current.schedule).toMatchObject({ ...schedule, travelMode: 'car' });
  expect(current.ids).toEqual(ids); expect(current.order).toEqual({ mode: 'manual', ids }); expect(current.profiles).toEqual(['parking', 'route', 'wheelchair', 'elevator', 'restroom']);
  await page.getByRole('group', { name: '일정 날짜', exact: true }).getByRole('button', { name: /^2일차/ }).click();
  await page.getByRole('button', { name: '경남도립미술관 일정 수정', exact: true }).click();
  const stop = page.getByRole('dialog', { name: '경남도립미술관 수정', exact: true });
  await expect(stop.getByLabel('경남도립미술관 머무는 시간', { exact: true })).toHaveValue('120');
  await stop.getByRole('button', { name: '취소', exact: true }).click();
  await openNaruTool(page, '이동 구간 확인');
  expect((await new AxeBuilder({ page }).include('.itinerary-route-coverage').analyze()).violations).toEqual([]);
  await closeNaruTool(page);
  const shares: Array<{ selections: { travelMode: string; selectedPlaceIds: string[] } }> = [];
  await page.route('**/api/trips', route => { shares.push(route.request().postDataJSON()); return route.fulfill({ json: { id: '123456789abc', url: `${new URL(page.url()).origin}/trip/123456789abc`, revision: 1, expiresAt: Date.now() + 86_400_000 } }); });
  await page.getByRole('button', { name: '공유', exact: true }).click();
  { const create = page.getByRole('button', { name: '공개 링크 만들기', exact: true }); if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); } }
  const menu = page.getByRole('dialog', { name: '여행 공유', exact: true });
  await expect(menu.getByRole('link', { name: '공유 일정 보기', exact: true })).toHaveAttribute('href', /123456789abc$/);
  expect(shares[0].selections.travelMode).toBe('car'); expect(shares[0].selections.selectedPlaceIds).toEqual(ids);
  expect(JSON.stringify(shares[0])).not.toMatch(/mapX|mapY|geometry|credentials/);
  const pending = page.waitForEvent('download');
  await menu.getByRole('button', { name: '캘린더', exact: true }).click();
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
    await chooseMode(page, 'bicycle');
    gate.release();
    await settled(page, 'bicycle');
    await expect(page.locator('.route-options').filter({ hasText: 'obsolete car route' })).toHaveCount(0);
    await expect(page.locator('.simple-stops')).not.toContainText('이동 57분');
    calls.length = 0;
    await page.reload();
    await settled(page, 'bicycle');
    expect(calls.length).toBeGreaterThanOrEqual(2); expect(calls.every(mode => mode === 'bicycle')).toBe(true);
  } finally { gate.release(); }
});

test('a changed travel mode updates pending shared content before the same live link can be used', async ({ page }) => {
  await setup(page, 'car');
  const gate = deferred(), modes: string[] = [];
  await page.route(/\/api\/trips(?:\/123456789abc)?$/, async route => {
    const body = route.request().postDataJSON();
    expect(new URL(route.request().url()).pathname).toBe(modes.length ? '/api/trips/123456789abc' : '/api/trips');
    if (modes.length) expect(body.revision).toBe(1);
    modes.push(body.selections.travelMode);
    if (modes.length === 1) await gate.promise;
    await route.fulfill({ json: { id: '123456789abc', url: `${new URL(page.url()).origin}/trip/123456789abc`, revision: modes.length, expiresAt: Date.now() + 86_400_000 } });
  });
  try {
    await page.goto('/planner#itinerary'); await settled(page, 'car');
    await page.getByRole('button', { name: '공유', exact: true }).click();
  { const create = page.getByRole('button', { name: '공개 링크 만들기', exact: true }); if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); } }
    const actions = page.getByRole('dialog', { name: '여행 공유', exact: true });
    await expect.poll(() => modes.length).toBe(1);
    await expect(actions.getByRole('button', { name: '링크 복사', exact: true })).toBeDisabled();
    await actions.getByRole('button', { name: '공유 닫기', exact: true }).click();
    await chooseMode(page, 'bicycle');
    await page.getByRole('button', { name: '공유', exact: true }).click();
  { const create = page.getByRole('button', { name: '공개 링크 만들기', exact: true }); if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); } }
    await expect(actions.getByRole('button', { name: '링크 복사', exact: true })).toBeDisabled();
    gate.release();
    await actions.getByRole('button', { name: '공유 닫기', exact: true }).click();
    await settled(page, 'bicycle');
    await page.getByRole('button', { name: '공유', exact: true }).click();
  { const create = page.getByRole('button', { name: '공개 링크 만들기', exact: true }); if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); } }
    await expect(actions.getByRole('button', { name: '링크 복사', exact: true })).toBeEnabled();
    await expect(actions.getByRole('link', { name: '공유 일정 보기', exact: true })).toHaveAttribute('href', /123456789abc$/);
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
  await page.getByRole('button', { name: '여행 설계에서 열기', exact: true }).click();
  await settled(page, 'car');
  const current = await stored(page);
  expect(current.schedule).toMatchObject({ ...schedule, travelMode: 'car' }); expect(current.ids).toEqual(ids);
  expect(current.books).toHaveLength(1); expect(current.books[0]).toMatchObject({ ...schedule, travelMode: 'walk' });
});

test('a failed atomic transport edit preserves the itinerary and draft until retry, then exports and restores the applied choice', async ({ page }) => {
  await setup(page, 'transit'); await page.goto('/planner#itinerary'); await settled(page, 'transit');
  const before = await stored(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, { allowTravelSave: () => { Storage.prototype.setItem = original; } });
    Storage.prototype.setItem = function (key, value) {
      if (key === 'wave-current-trip-v1') throw new DOMException('Synthetic quota', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await chooseMode(page, 'car');
  const editor = page.getByRole('dialog', { name: '여행 설정', exact: true });
  await expect(editor.getByRole('alert')).toHaveText('변경 내용을 저장하지 못했어요. 기존 일정은 그대로예요.');
  await expect(editor.getByRole('combobox', { name: '이동 수단', exact: true })).toHaveValue('car');
  await expect(page.locator('.itinerary-route-coverage select')).toHaveValue('transit');
  expect(await stored(page)).toEqual(before);
  // Cancel discards only the unapplied form draft, never the saved itinerary.
  await editor.getByRole('button', { name: '취소', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('button', { name: '여행 설정', exact: true })).toBeFocused();
  expect(await stored(page)).toEqual(before);
  await chooseMode(page, 'car');
  await expect(editor.getByRole('alert')).toHaveText('변경 내용을 저장하지 못했어요. 기존 일정은 그대로예요.');
  await expect(editor.getByRole('combobox', { name: '이동 수단', exact: true })).toHaveValue('car');
  expect(await stored(page)).toEqual(before);
  await page.evaluate(() => (window as unknown as { allowTravelSave: () => void }).allowTravelSave());
  await editor.getByRole('button', { name: '적용', exact: true }).click();
  await expect(editor).toHaveCount(0); await settled(page, 'car');
  const applied = await stored(page);
  expect(applied).toEqual({ ...before, schedule: { ...before.schedule, travelMode: 'car' } });
  await page.route('**/api/trips', route => route.fulfill({ json: { id: '123456789abc', url: `${new URL(page.url()).origin}/trip/123456789abc`, revision: 1, expiresAt: Date.now() + 86_400_000 } }));
  await page.getByRole('button', { name: '공유', exact: true }).click();
  { const create = page.getByRole('button', { name: '공개 링크 만들기', exact: true }); if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); } }
  const menu = page.getByRole('dialog', { name: '여행 공유', exact: true });
  await expect(menu.getByRole('link', { name: '공유 일정 보기', exact: true })).toHaveAttribute('href', /123456789abc$/);
  const pending = page.waitForEvent('download');
  await menu.getByRole('button', { name: '여행 파일', exact: true }).click();
  const download = await pending;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(JSON.parse(exported.values['wave-trip-schedule-v1'])).toEqual(applied.schedule);
  expect(JSON.parse(exported.values['wave-saved-places'])).toEqual(ids);
  expect(JSON.parse(exported.values['wave-trip-order-v1'])).toEqual(applied.order);
  expect(exported.values).not.toHaveProperty('wave-trip-identity-v1');
  await menu.getByRole('button', { name: '공유 닫기', exact: true }).click();
  await page.reload(); await settled(page, 'car');
  expect((await stored(page)).schedule).toEqual(applied.schedule);
  expect((await stored(page)).ids).toEqual(ids);
});
