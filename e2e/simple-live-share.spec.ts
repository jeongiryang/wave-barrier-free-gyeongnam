import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';
import type { TripIdentity } from '../lib/trip-identity.js';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
const shareId = 'abcdef123456', tripId = '12345678-1234-4123-8123-123456789abc';
const start = '2026-09-20', end = '2026-09-21';
const original = { ...plan.places[0], image: '', accessibility: [{ key: 'restroom', label: '장애인 화장실', detail: '합성 시설 근거', state: 'confirmed' as const }] };
type PublicSnapshot = { live: boolean; origin: { label: string }; selections: { region: string; theme: string; profiles: string[]; locale: string; travelStart: string; travelEnd: string; dayStartTime: string; travelMode: string; selectedPlaceIds: string[]; scheduleAssignments: Record<string, string>; visitMinutesByPlaceId: Record<string, number>; fixedVisits: Record<string, unknown>; dayDeadlines: Record<string, unknown>; breakMinutesByPlaceId: Record<string, number>; restPurposeByPlaceId: Record<string, string> } };
type ShareRequest = Partial<PublicSnapshot> & { revision?: number; operation?: string };
type Post = { path: string; body: ShareRequest };
type Remote = { revision: number; expiresAt: number; revoked: boolean; payload: PublicSnapshot };
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
function publicSnapshot(time = '09:30'): PublicSnapshot {
  return { live: true, origin: { label: '' }, selections: { region: '창원', theme: '', profiles: [], locale: 'ko', travelStart: start, travelEnd: end,
    dayStartTime: time, travelMode: 'transit', selectedPlaceIds: ['1001'], scheduleAssignments: { '1001': start }, visitMinutesByPlaceId: { '1001': 60 },
    fixedVisits: {}, dayDeadlines: {}, breakMinutesByPlaceId: { '1001': 15 }, restPurposeByPlaceId: {} } };
}
async function localState(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    const schedule = JSON.parse(values['wave-trip-schedule-v1'] || '{}');
    return { identity: JSON.parse(values['wave-trip-identity-v1'] || 'null') as TripIdentity | null, time: String(schedule.dayStartTime || ''),
      ids: JSON.parse(values['wave-saved-places'] || '[]') as string[], profiles: JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]') as string[] };
  });
}
async function copied(page: Page) { return page.evaluate(() => JSON.parse(sessionStorage.getItem('test-live-share-copied') || '[]') as string[]); }
async function setup(page: Page, options: { createGate?: ReturnType<typeof deferred>; restored?: boolean } = {}) {
  const context = page.context();
  await context.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic live-share API' } }));
  await mockPlannerApi(page, { preserveView: true, savedPlaces: [original] });
  await mockPublicShellApi(page);
  await page.clock.install();
  const expiresAt = Date.now() + 30 * 86_400_000;
  let remote: Remote | null = options.restored ? { revision: 4, expiresAt, revoked: false, payload: publicSnapshot() } : null;
  let updateGate: ReturnType<typeof deferred> | undefined;
  const posts: Post[] = [], gets: Array<{ id: string; revoked: boolean }> = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route(/\/api\/trips(?:\/[^/?]+)?(?:\?.*)?$/, async route => {
    const req = route.request(), url = new URL(req.url()), target = url.pathname.split('/')[3] || '';
    if (req.method() === 'GET') {
      gets.push({ id: target, revoked: !remote || remote.revoked });
      if (!remote || remote.revoked) return route.fulfill({ status: 404, json: { error: '공유가 종료됐어요. 이전 링크로는 볼 수 없어요.' }, headers: { 'cache-control': 'no-store' } });
      return route.fulfill({ json: { id: shareId, ...remote.payload, revision: remote.revision, createdAt: expiresAt - 30 * 86_400_000, expiresAt,
        plan: { ...plan, mode: 'live', places: [original], stops: [plan.stops[0]], statuses: plan.statuses.map(status => ({ ...status, state: 'live' })) },
        restoration: { requested: 1, restored: 1, missing: 0, mode: 'content-id' } }, headers: { 'cache-control': 'no-store' } });
    }
    const body = req.postDataJSON() as ShareRequest;
    posts.push({ path: url.pathname, body });
    const reply = () => ({ id: shareId, url: `${url.origin}/trip/${shareId}`, revision: remote!.revision, expiresAt, live: true });
    if (!target) {
      if (options.createGate) await options.createGate.promise;
      remote = { revision: 1, expiresAt, revoked: false, payload: structuredClone(body) as PublicSnapshot };
      return route.fulfill({ status: 201, json: reply() });
    }
    if (target !== shareId || !remote || remote.revoked) return route.fulfill({ status: 403, json: { error: '이 링크를 수정할 권한이 없거나 공유가 종료됐어요.' } });
    if (body.operation === 'status') return route.fulfill({ json: { revision: remote.revision, expiresAt, live: true } });
    const gate = updateGate;
    updateGate = undefined;
    if (gate) await gate.promise;
    if (body.revision !== remote.revision) return route.fulfill({ status: 409, json: { error: '다른 곳에서 공유 일정이 바뀌었어요. 원본을 확인한 뒤 다시 공유해 주세요.' } });
    remote.revision++;
    if (body.operation === 'revoke') remote.revoked = true;
    else remote.payload = structuredClone(body) as PublicSnapshot;
    return route.fulfill({ json: { ...reply(), revoked: remote.revoked } });
  });
  await page.addInitScript(({ restored, expiresAt, initial, tripId, shareId }) => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (url: string) => {
      sessionStorage.setItem('test-live-share-copied', JSON.stringify([...JSON.parse(sessionStorage.getItem('test-live-share-copied') || '[]'), url]));
    } } });
    if (localStorage.getItem('wave-current-trip-v1')) return;
    const values = { 'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001"]',
      'wave-saved-place-catalog-v1': JSON.stringify([initial]), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001"]}',
      'wave-trip-identity-v1': JSON.stringify({ version: 1, id: tripId, binding: null, share: restored ? { id: shareId, revision: 4, expiresAt, snapshotHash: 'a'.repeat(64) } : null }),
      'wave-trip-schedule-v1': JSON.stringify({ travelStart: '2026-09-20', travelEnd: '2026-09-21', dayStartTime: restored ? '11:30' : '09:30', travelMode: 'transit',
        scheduleAssignments: { '1001': '2026-09-20' }, visitMinutesByPlaceId: { '1001': 60 }, fixedVisits: {}, dayDeadlines: {}, breakMinutesByPlaceId: { '1001': 15 }, restPurposeByPlaceId: {},
        comfort: { maxWalkMinutes: null, breakEveryMinutes: null, breakMinutes: 15 } }) };
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values }));
    sessionStorage.setItem('wave-session-facilities-v1', '["restroom"]');
  }, { restored: Boolean(options.restored), expiresAt, initial: original, tripId, shareId });
  await page.goto('/planner');
  await itinerary(page);
  return { posts, gets, errors, remote: () => remote!, holdUpdate: (gate: ReturnType<typeof deferred>) => { updateGate = gate; },
    remoteEdit: (revision: number, time: string) => { remote!.revision = revision; remote!.payload.selections.dayStartTime = time; },
    creates: () => posts.filter(post => post.path === '/api/trips'), updates: () => posts.filter(post => post.path.endsWith(`/${shareId}`) && !post.body.operation),
    statuses: () => posts.filter(post => post.body.operation === 'status'), revokes: () => posts.filter(post => post.body.operation === 'revoke') };
}
async function itinerary(page: Page) {
  const views = page.getByRole('group', { name: '여행 설계 화면', exact: true });
  await expect(views.getByRole('button', { name: /^내 일정/ })).toBeEnabled();
  await views.getByRole('button', { name: /^내 일정/ }).click();
  await expect(page.locator('button[data-planner-tool=share]')).toBeVisible();
}
async function openMenu(page: Page) {
  await page.locator('button[data-planner-tool=share]').click();
  const menu = page.getByRole('dialog', { name: '여행 공유', exact: true });
  await expect(menu).toBeVisible(); return menu;
}
async function closeMenu(menu: Locator) { await menu.getByRole('button', { name: '공유 닫기', exact: true }).click(); }
async function createShare(page: Page) {
  const menu = await openMenu(page);
  await expect(menu.getByRole('link', { name: '공유 일정 보기', exact: true })).toHaveAttribute('href', new RegExp(`/trip/${shareId}$`));
  await expect.poll(async () => (await localState(page)).identity?.share?.revision).toBe(1);
  return menu;
}
async function editTime(page: Page, value: string) {
  await page.getByRole('button', { name: '여행 설정', exact: true }).click();
  const settings = page.getByRole('dialog', { name: '여행 설정', exact: true });
  await settings.getByLabel('하루 시작', { exact: true }).fill(value);
  await settings.getByRole('button', { name: '적용', exact: true }).click();
  await expect(settings).toHaveCount(0);
  await expect.poll(async () => (await localState(page)).time).toBe(value);
}
async function passDebounce(page: Page) { await page.clock.runFor(2000); }

test('공유 메뉴를 다시 열거나 반복 복사해도 최초 링크를 한 번만 만든다', async ({ page }) => {
  const gate = deferred(), app = await setup(page, { createGate: gate });
  try {
    let menu = await openMenu(page);
    await expect.poll(() => app.creates().length).toBe(1);
    await expect(menu.getByRole('button', { name: '링크 복사', exact: true })).toBeDisabled();
    await closeMenu(menu); menu = await openMenu(page);
    expect(app.creates()).toHaveLength(1);
    gate.release();
    await expect.poll(async () => (await localState(page)).identity?.share?.revision).toBe(1);
    await expect(menu.getByRole('button', { name: '링크 복사', exact: true })).toBeEnabled();
    for (let index = 0; index < 2; index++) await menu.getByRole('button', { name: '링크 복사', exact: true }).click();
    await expect.poll(() => copied(page)).toEqual([`${new URL(page.url()).origin}/trip/${shareId}`, `${new URL(page.url()).origin}/trip/${shareId}`]);
    await passDebounce(page);
    expect(app.creates()).toHaveLength(1); expect(app.updates()).toHaveLength(0);
    expect(app.creates()[0].body.selections?.profiles).toEqual([]);
    expect(app.creates()[0].body.origin).toEqual({ label: '' });
    expect((await localState(page)).profiles).toEqual(['restroom']);
    expect((await localState(page)).identity?.share?.snapshotHash).toMatch(/^[a-f\d]{64}$/);
    expect(app.errors).toEqual([]);
  } finally { gate.release(); }
});

test('일정 수정은 같은 공유 ID와 보관기한을 유지하며 다음 revision에 자동 반영된다', async ({ page }) => {
  const app = await setup(page), menu = await createShare(page), before = (await localState(page)).identity!.share!;
  await closeMenu(menu); await editTime(page, '11:00');
  await expect.poll(() => app.updates().length).toBe(1);
  await expect.poll(async () => (await localState(page)).identity?.share?.revision).toBe(2);
  expect(app.updates()[0].path).toBe(`/api/trips/${shareId}`);
  expect(app.updates()[0].body.revision).toBe(1);
  expect(app.updates()[0].body.selections?.dayStartTime).toBe('11:00');
  const after = (await localState(page)).identity!.share!;
  expect(after.id).toBe(before.id); expect(after.expiresAt).toBe(before.expiresAt); expect(after.snapshotHash).not.toBe(before.snapshotHash);
  const reopened = await openMenu(page);
  await reopened.getByRole('button', { name: '링크 복사', exact: true }).click();
  await passDebounce(page);
  expect(app.creates()).toHaveLength(1); expect(app.updates()).toHaveLength(1);
  expect(app.remote().payload.selections.dayStartTime).toBe('11:00'); expect(app.errors).toEqual([]);
});

test('갱신 응답을 기다리며 다시 편집하면 순차 갱신으로 가장 최신 일정에 수렴한다', async ({ page }) => {
  const app = await setup(page), menu = await createShare(page), gate = deferred();
  await closeMenu(menu); app.holdUpdate(gate);
  try {
    await editTime(page, '11:00'); await expect.poll(() => app.updates().length).toBe(1);
    await editTime(page, '12:00'); await editTime(page, '13:00');
    expect(app.updates()).toHaveLength(1);
    expect((await localState(page)).identity?.share?.revision).toBe(1);
    gate.release();
    await expect.poll(() => app.updates().length).toBe(2);
    await expect.poll(async () => (await localState(page)).identity?.share?.revision).toBe(3);
    expect(app.updates().map(post => post.body.revision)).toEqual([1, 2]);
    expect(app.updates().map(post => post.body.selections?.dayStartTime)).toEqual(['11:00', '13:00']);
    expect(app.remote().payload.selections.dayStartTime).toBe('13:00');
    expect((await localState(page)).time).toBe('13:00');
    await passDebounce(page);
    expect(app.creates()).toHaveLength(1); expect(app.updates()).toHaveLength(2); expect(app.errors).toEqual([]);
  } finally { gate.release(); }
});

test('재진입한 로컬 일정의 snapshot hash가 다르면 같은 링크를 갱신하고 다음 reload에서는 중복 쓰지 않는다', async ({ page }) => {
  const app = await setup(page, { restored: true });
  await expect.poll(() => app.updates().length).toBe(1);
  await expect.poll(async () => (await localState(page)).identity?.share?.revision).toBe(5);
  expect(app.creates()).toHaveLength(0);
  expect(app.updates()[0].body.revision).toBe(4);
  expect(app.updates()[0].body.selections?.dayStartTime).toBe('11:30');
  const synced = (await localState(page)).identity!.share!;
  expect(synced.snapshotHash).toMatch(/^[a-f\d]{64}$/); expect(synced.snapshotHash).not.toBe('a'.repeat(64));
  await page.reload(); await itinerary(page); await passDebounce(page);
  expect((await localState(page)).identity!.share).toEqual(synced);
  expect(app.updates()).toHaveLength(1); expect(app.creates()).toHaveLength(0); expect(app.errors).toEqual([]);
});

test('409 충돌은 양쪽 일정을 보존하고 명시적인 현재 일정 갱신 뒤에만 최신 버전으로 쓴다', async ({ page }) => {
  const app = await setup(page), menu = await createShare(page), gate = deferred();
  await closeMenu(menu); app.remoteEdit(7, '14:00'); app.holdUpdate(gate);
  try {
    await editTime(page, '11:00'); await expect.poll(() => app.updates().length).toBe(1);
    const conflict = await openMenu(page); gate.release();
    await expect(conflict).toContainText('다른 곳에서 공유 일정이 바뀌었어요');
    await passDebounce(page);
    expect(app.remote().payload.selections.dayStartTime).toBe('14:00'); expect(app.remote().revision).toBe(7);
    expect((await localState(page)).time).toBe('11:00'); expect((await localState(page)).identity?.share?.revision).toBe(1);
    expect(app.updates()).toHaveLength(1); expect(app.statuses()).toHaveLength(0);
    await conflict.getByRole('button', { name: /현재.*일정.*갱신/ }).click();
    await expect.poll(() => app.statuses().length).toBe(1);
    await expect.poll(() => app.updates().length).toBe(2);
    await expect.poll(async () => (await localState(page)).identity?.share?.revision).toBe(8);
    expect(app.updates()[1].body.revision).toBe(7);
    expect(app.remote().payload.selections.dayStartTime).toBe('11:00');
    expect(app.creates()).toHaveLength(1); expect(app.errors).toEqual([]);
  } finally { gate.release(); }
});

test('공유 종료 뒤 편집과 reload가 링크를 재생성하지 않고 기존 뷰어도 폐기된 내용을 숨긴다', async ({ page, context }) => {
  const app = await setup(page), menu = await createShare(page);
  const viewerPromise = context.waitForEvent('page');
  await menu.getByRole('link', { name: '공유 일정 보기', exact: true }).click();
  const viewer = await viewerPromise;
  viewer.on('pageerror', error => app.errors.push(error.message));
  try {
    await expect(viewer.getByRole('heading', { name: original.name, level: 2, exact: true })).toBeVisible();
    await menu.getByRole('button', { name: '공유 종료', exact: true }).click();
    await expect(menu).toContainText('공유를 종료했어요');
    await expect(menu.getByRole('link', { name: '공유 일정 보기', exact: true })).toHaveCount(0);
    expect((await localState(page)).identity?.share).toBeNull(); expect(app.revokes()).toHaveLength(1);
    await closeMenu(menu); await editTime(page, '11:00'); await passDebounce(page);
    expect(app.creates()).toHaveLength(1); expect(app.updates()).toHaveLength(0);
    const reads = app.gets.length;
    await viewer.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => app.gets.length).toBeGreaterThan(reads);
    await expect(viewer.getByRole('alert')).toContainText('공유가 종료됐어요');
    await expect(viewer.locator('.shared-content')).toHaveCount(0);
    await expect(viewer.getByRole('heading', { name: original.name, exact: true })).toHaveCount(0);
    await page.bringToFront();
    await page.reload({ waitUntil: 'domcontentloaded' }); await itinerary(page); await passDebounce(page);
    expect((await localState(page)).identity?.share).toBeNull();
    expect(app.creates()).toHaveLength(1); expect(app.updates()).toHaveLength(0); expect(app.revokes()).toHaveLength(1); expect(app.errors).toEqual([]);
  } finally { await viewer.close(); }
});

test('마지막 장소를 제거하면 기존 라이브 링크를 종료하고 이미 열린 뷰어에서도 내용을 지운다', async ({ page, context }) => {
  const app = await setup(page), menu = await createShare(page);
  const viewerPromise = context.waitForEvent('page');
  await menu.getByRole('link', { name: '공유 일정 보기', exact: true }).click();
  const viewer = await viewerPromise;
  viewer.on('pageerror', error => app.errors.push(error.message));
  try {
    await expect(viewer.getByRole('heading', { name: original.name, level: 2, exact: true })).toBeVisible();
    await closeMenu(menu);
    await page.getByRole('button', { name: `${original.name} 일정 수정`, exact: true }).click();
    await page.getByRole('dialog', { name: `${original.name} 수정`, exact: true }).getByRole('button', { name: '일정에서 빼기', exact: true }).click();
    await expect.poll(async () => (await localState(page)).ids).toEqual([]);
    await passDebounce(page);
    await expect.poll(() => app.revokes().length).toBe(1);
    await expect.poll(async () => (await localState(page)).identity?.share).toBeNull();
    expect(app.revokes()[0]).toEqual({ path: `/api/trips/${shareId}`, body: { operation: 'revoke', revision: 1 } });
    expect(app.remote().revoked).toBe(true);
    expect(app.creates()).toHaveLength(1); expect(app.updates()).toHaveLength(0);

    const reads = app.gets.length;
    await viewer.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => app.gets.length).toBeGreaterThan(reads);
    await expect(viewer.getByRole('alert')).toContainText('공유가 종료됐어요');
    await expect(viewer.locator('.shared-content')).toHaveCount(0);
    await expect(viewer.getByRole('heading', { name: original.name, exact: true })).toHaveCount(0);
    await passDebounce(page);
    expect(app.creates()).toHaveLength(1); expect(app.updates()).toHaveLength(0); expect(app.revokes()).toHaveLength(1);
    expect(app.errors).toEqual([]);
  } finally { await viewer.close(); }
});

test('마지막 장소 제거를 850ms 전에 되돌리면 공유 종료를 취소하고 같은 링크를 보존한다', async ({ page }) => {
  const app = await setup(page), menu = await createShare(page), before = (await localState(page)).identity!.share!;
  await closeMenu(menu);
  await page.getByRole('button', { name: `${original.name} 일정 수정`, exact: true }).click();
  const editor = page.getByRole('dialog', { name: `${original.name} 수정`, exact: true });
  await expect(editor).toBeVisible();
  // Pause only after hydration; real UI commands run while the 850ms grace timer is controlled.
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 100);
  await editor.getByRole('button', { name: '일정에서 빼기', exact: true }).click();
  await expect.poll(async () => (await localState(page)).ids).toEqual([]);
  await page.clock.runFor(500);
  expect(app.revokes()).toHaveLength(0);
  await page.getByRole('status').filter({ hasText: `${original.name}을 일정에서 뺐어요.` }).getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect.poll(async () => (await localState(page)).ids).toEqual(['1001']);
  await passDebounce(page);
  expect((await localState(page)).identity!.share).toEqual(before);
  expect(app.remote().revoked).toBe(false);
  expect(app.remote().payload.selections.selectedPlaceIds).toEqual(['1001']);
  expect(app.creates()).toHaveLength(1); expect(app.updates()).toHaveLength(0); expect(app.revokes()).toHaveLength(0);
  expect(app.errors).toEqual([]);
});
