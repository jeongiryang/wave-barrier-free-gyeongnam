import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, plan } from './fixtures';
import type { AccountTripPayload, TripDetail } from '../features/account-travel/types';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

const tripId = '12345678-1234-4123-8123-123456789012';
const ownerId = 'account-home-owner';
const draftKey = `wave-account-draft-v1:${ownerId}:${tripId}`;
const start = '2026-09-20', end = '2026-09-21';
const payload: AccountTripPayload = {
  version: 1, title: '계정에 보관한 창원 여행', region: '창원', travelStart: start, travelEnd: end,
  dayStartTime: '09:30', themes: ['history', 'nature'], placeIds: ['1904774', '1748884'],
  scheduleAssignments: { '1904774': start, '1748884': end }, note: '첫날 과학관, 둘째 날 공연장', status: 'planned',
  visitMinutesByPlaceId: { '1904774': 90, '1748884': 75 }, breakMinutesByPlaceId: { '1904774': 25 },
  restPurposeByPlaceId: { '1904774': 'rest' }, fixedVisits: { '1748884': { kind: 'event', position: 0, time: '14:00' } },
  dayDeadlines: { [end]: { time: '18:00', returnMinutes: 30, bufferMinutes: 15 } },
};
// IDs and names are representative stored references; these HTTP responses are synthetic, not provider evidence.
const resolvedPlaces = [
  { ...plan.places[0], id: '1748884', name: '3·15 아트센터', image: '' },
  { ...plan.places[0], id: '1904774', name: '창원과학체험관', image: '' },
];
const oldSchedule = {
  travelStart: '2026-09-18', travelEnd: '2026-09-19', dayStartTime: '11:00',
  scheduleAssignments: { '1001': '2026-09-19', '1002': '2026-09-18' },
  visitMinutesByPlaceId: { '1001': 60, '1002': 45 }, breakMinutesByPlaceId: { '1002': 20 },
  fixedVisits: { '1002': { kind: 'visit', position: 0, time: '12:00' } },
  dayDeadlines: { '2026-09-19': { time: '17:00', returnMinutes: 40, bufferMinutes: 10 } },
};
const oldValues = {
  'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '["nature"]',
  'wave-saved-places': '["1001","1002"]', 'wave-saved-place-catalog-v1': JSON.stringify(plan.places),
  'wave-trip-order-v1': '{"mode":"manual","ids":["1002","1001"]}', 'wave-trip-schedule-v1': JSON.stringify(oldSchedule),
};
function detail(): TripDetail { return { id: tripId, payload: structuredClone(payload), role: 'owner', revision: 4, updatedAt: 1789200000000, members: [], votes: [], comments: [], invitationActive: false }; }
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function setup(page: Page, seedCurrent = true) {
  // No account, map, tourism, or LLM request can escape the fixtures.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic test API' } }));
  await mockPlannerApi(page, { plannerView: 'guided' });
  const state = { userId: ownerId, name: '바다여행자', signedIn: true, trip: detail(), listRequests: 0, placeRequests: 0, writes: 0, lookupFailure: false, missing: false, saveExpired: false, savedPayload: null as AccountTripPayload | null };
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: state.signedIn ? { user: { id: state.userId, name: state.name, email: 'synthetic@example.com' }, session: { id: 'synthetic-session' } } : null }));
  await page.route('**/api/account/travel**', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path.endsWith('/places')) {
      state.placeRequests++;
      expect(request.method()).toBe('POST');
      if (state.lookupFailure) return route.fulfill({ status: 503, json: { error: '최신 장소 정보를 잠시 확인할 수 없어요. 다시 시도해 주세요.' } });
      return route.fulfill({ json: { places: state.missing ? resolvedPlaces.slice(0, 1) : resolvedPlaces, missing: state.missing ? 1 : 0 } });
    }
    if (request.method() === 'GET') {
      if (path.endsWith(tripId)) return route.fulfill({ json: state.trip });
      state.listRequests++;
      return route.fulfill({ json: { trips: [state.trip] } });
    }
    state.writes++;
    state.savedPayload = request.postDataJSON().payload;
    if (state.saveExpired) return route.fulfill({ status: 401, json: { error: '로그인이 만료됐어요. 다시 로그인해 주세요.' } });
    state.trip = { ...state.trip, payload: state.savedPayload!, revision: state.trip.revision + 1 };
    return route.fulfill({ json: state.trip });
  });
  await page.route('**/api/wave?**', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('action') !== 'places') return route.fallback();
    const ids = (params.get('ids') || '').split(',');
    return route.fulfill({ json: { places: [...plan.places, ...resolvedPlaces].filter(place => ids.includes(place.id)), missing: [] } });
  });
  if (seedCurrent) await page.addInitScript(values => {
    if (!localStorage.getItem('wave-current-trip-v1')) localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values }));
    if (!sessionStorage.getItem('wave-session-facilities-v1')) sessionStorage.setItem('wave-session-facilities-v1', '["wheel"]');
  }, oldValues);
  return state;
}
async function stored(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('wave-current-trip-v1');
    const values = raw ? JSON.parse(raw).values : {};
    return { raw, ids: JSON.parse(values['wave-saved-places'] || '[]'), catalog: JSON.parse(values['wave-saved-place-catalog-v1'] || '[]'),
      schedule: JSON.parse(values['wave-trip-schedule-v1'] || '{}'), order: JSON.parse(values['wave-trip-order-v1'] || '{}'),
      region: values['wave-planner-region-v1'], themes: JSON.parse(values['wave-trip-themes-v1'] || '[]'),
      profiles: JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]'), books: JSON.parse(localStorage.getItem('wave-travel-book-v1') || '[]') };
  });
}
async function accessible(page: Page, selector = '#account-travel') {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).include(selector).analyze()).violations).toEqual([]);
}

test('개인 홈에서 닉네임 저장 실패 뒤 입력을 유지하고 재시도한 이름을 즉시 표시한다', async ({ page }) => {
  const state = await setup(page);
  let nicknameRequests = 0;
  await page.route('**/api/auth/update-user', route => {
    nicknameRequests++;
    expect(route.request().postDataJSON()).toEqual({ name: '느긋한 파도' });
    if (nicknameRequests === 1) return route.fulfill({ status: 503, json: { message: 'Synthetic temporary failure' } });
    state.name = '느긋한 파도';
    return route.fulfill({ json: { status: true } });
  });
  await page.goto('/my-trips');
  await expect(page.getByRole('heading', { name: '창원, 이어서 준비할까요?', exact: true })).toBeVisible();
  await expect(page.locator('.current-trip-card')).toContainText('2026-09-18 – 2026-09-19 · 2곳');
  await expect(page.locator('.current-trip-card')).toContainText('용지호수공원 · 경남도립미술관');
  await expect(page.locator('.current-trip-card')).toContainText('필요한 편의:');
  const openBounds = await page.getByRole('button', { name: '지도·나루와 이어서 편집 →', exact: true }).boundingBox();
  expect(openBounds?.height).toBeGreaterThanOrEqual(44);
  expect(openBounds?.width).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: '닉네임 수정', exact: true }).click();
  const input = page.getByLabel('WAVE에서 부를 이름', { exact: true });
  await input.fill('느긋한 파도');
  await page.getByRole('button', { name: '닉네임 저장', exact: true }).click();
  await expect(page.getByText('닉네임을 저장하지 못했어요. 입력 내용은 유지되니 다시 시도해 주세요.')).toBeVisible();
  await expect(input).toHaveValue('느긋한 파도');
  await accessible(page);
  await page.getByRole('button', { name: '닉네임 저장', exact: true }).click();
  await expect(page.getByRole('region', { name: 'WAVE 닉네임' })).toContainText('느긋한 파도님, 반가워요.');
  await expect(input).toHaveCount(0);
  expect(nicknameRequests).toBe(2);
  expect(state.writes).toBe(0);
  await page.screenshot({ path: test.info().outputPath('personal-home.png'), fullPage: true });
});

test('계정 일정을 Planner로 열면 조회된 실제 ID 순서·날짜·편의를 보존하고 이전 여행을 백업한다', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/my-trips');
  await page.getByRole('button', { name: '지도·나루와 이어서 편집 →', exact: true }).click();
  await expect(page).toHaveURL(/\/planner\?from=account#itinerary$/);
  await expect(page.locator('.reference-day-list #itinerary-stop-1904774')).toContainText('창원과학체험관');
  const current = await stored(page);
  expect(state.placeRequests).toBe(1);
  expect(state.writes).toBe(0);
  expect(current.ids).toEqual(payload.placeIds);
  expect(current.order).toEqual({ mode: 'manual', ids: payload.placeIds });
  expect(current.region).toBe(payload.region);
  expect([...current.themes].sort()).toEqual([...payload.themes].sort());
  expect(current.profiles).toEqual(['wheel']);
  expect(current.catalog.map((place: { id: string; name: string }) => [place.id, place.name])).toEqual([['1904774', '창원과학체험관'], ['1748884', '3·15 아트센터']]);
  expect(current.schedule).toMatchObject({ travelStart: start, travelEnd: end, dayStartTime: payload.dayStartTime,
    scheduleAssignments: payload.scheduleAssignments, visitMinutesByPlaceId: payload.visitMinutesByPlaceId,
    fixedVisits: payload.fixedVisits, breakMinutesByPlaceId: payload.breakMinutesByPlaceId, dayDeadlines: payload.dayDeadlines });
  expect(current.books).toHaveLength(1);
  expect(current.books[0].places.map((place: { id: string }) => place.id)).toEqual(['1002', '1001']);
  expect(current.books[0]).toMatchObject(oldSchedule);
  await accessible(page, '#itinerary');
  await page.screenshot({ path: test.info().outputPath('account-trip-in-planner.png'), fullPage: true });
});

test('계정 장소 조회가 실패하면 현재 여행을 유지하고 같은 버튼으로 안전하게 재시도한다', async ({ page }) => {
  const state = await setup(page); state.lookupFailure = true;
  await page.goto('/my-trips');
  const before = await stored(page);
  const open = page.getByRole('button', { name: '지도·나루와 이어서 편집 →', exact: true });
  await open.click();
  await expect(page.getByText('최신 장소 정보를 잠시 확인할 수 없어요. 다시 시도해 주세요.')).toBeVisible();
  await expect(page).toHaveURL('/my-trips');
  expect(await stored(page)).toEqual(before);
  await expect(open).toBeEnabled();
  state.lookupFailure = false;
  await open.click();
  await expect(page).toHaveURL(/\/planner\?from=account#itinerary$/);
  expect((await stored(page)).ids).toEqual(payload.placeIds);
  expect(state.placeRequests).toBe(2);
});

test('일부 계정 장소 정보가 없어도 저장한 ID와 날짜를 삭제하지 않는다', async ({ page }) => {
  const state = await setup(page); state.missing = true;
  await page.goto('/my-trips');
  await page.getByRole('button', { name: '지도·나루와 이어서 편집 →', exact: true }).click();
  await expect(page).toHaveURL(/\/planner\?from=account#itinerary$/);
  const current = await stored(page);
  expect(current.ids).toEqual(payload.placeIds);
  expect(current.schedule.scheduleAssignments).toEqual(payload.scheduleAssignments);
  expect(current.order.ids).toEqual(payload.placeIds);
  expect(current.catalog.some((place: { id: string }) => place.id === '1904774')).toBe(true);
  expect(state.writes).toBe(0);
});

test('저장 중 401이 나면 수정본을 탭에 보존하고 재로그인 복귀 후 이어서 저장한다', async ({ page }) => {
  const state = await setup(page); state.saveExpired = true;
  let loginRequests = 0;
  await page.route('**/api/auth/sign-in/email', route => {
    loginRequests++;
    expect(route.request().postDataJSON().email).toBe('synthetic@example.com');
    state.signedIn = true; state.saveExpired = false;
    return route.fulfill({ json: { user: { id: ownerId, name: state.name, email: 'synthetic@example.com' }, token: 'synthetic-test-token' } });
  });
  await page.goto(`/my-trips/${tripId}`);
  const title = page.getByLabel('여행 이름', { exact: true });
  const note = page.getByRole('textbox', { name: '동행자와 공유하는 여행 메모', exact: true });
  await title.fill('로그인 뒤 이어 쓸 여행');
  await note.fill('세션 만료 중에도 지켜야 할 준비물');
  await page.getByRole('button', { name: '변경 사항 저장', exact: true }).click();
  await expect(page.getByRole('link', { name: '다시 로그인하고 이어가기', exact: true })).toHaveAttribute('href', `/login?next=${encodeURIComponent(`/my-trips/${tripId}`)}`);
  await expect(title).toHaveValue('로그인 뒤 이어 쓸 여행');
  await expect(note).toHaveValue('세션 만료 중에도 지켜야 할 준비물');
  await expect.poll(() => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || '{}').payload?.title, draftKey)).toBe('로그인 뒤 이어 쓸 여행');
  await accessible(page);
  state.signedIn = false;
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('link', { name: '다시 로그인하고 이어가기', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  // A new page revalidates the expired auth cache, just as a real login return does.
  await page.reload();
  await page.getByRole('textbox', { name: '이메일', exact: true }).fill('synthetic@example.com');
  await page.getByLabel('비밀번호', { exact: true }).fill('synthetic-test-password');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(`/my-trips/${tripId}`);
  await expect(page.getByText('이 탭에서 저장하지 못한 수정 내용을 복구했어요.')).toBeVisible();
  await expect(title).toHaveValue('로그인 뒤 이어 쓸 여행');
  await expect(note).toHaveValue('세션 만료 중에도 지켜야 할 준비물');
  await page.getByRole('button', { name: '변경 사항 저장', exact: true }).click();
  await expect(page.getByText('여행 변경 사항을 계정에 저장했어요.')).toBeVisible();
  expect(state.writes).toBe(2);
  expect(loginRequests).toBe(1);
  expect(state.savedPayload?.scheduleAssignments).toEqual(payload.scheduleAssignments);
  await expect.poll(() => page.evaluate(key => sessionStorage.getItem(key), draftKey)).toBeNull();
});

test('다른 계정으로 복귀하면 이전 계정의 미저장 수정본을 읽지 않는다', async ({ page }) => {
  const state = await setup(page);
  await page.goto(`/my-trips/${tripId}`);
  const title = page.getByLabel('여행 이름', { exact: true });
  await title.fill('이전 계정에만 보이는 수정본');
  await expect.poll(() => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || '{}').payload?.title, draftKey)).toBe('이전 계정에만 보이는 수정본');
  state.userId = 'different-synthetic-account';
  page.on('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(title).toHaveValue(payload.title);
  await expect(page.getByText('이 탭에서 저장하지 못한 수정 내용을 복구했어요.')).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || '{}').payload?.title, draftKey)).toBe('이전 계정에만 보이는 수정본');
});

test('계정 편집 중 Planner 열기 응답이 늦어도 새로 입력한 시작 시간을 잃지 않는다', async ({ page }) => {
  await setup(page);
  await page.goto(`/my-trips/${tripId}`);
  await expect(page.getByText('공식 관광정보로 장소를 확인했어요.')).toBeVisible();
  const before = await stored(page);
  const gate = deferred();
  let requests = 0;
  await page.route(`**/api/account/travel/${tripId}/places`, async route => {
    requests++;
    await gate.promise;
    await route.fulfill({ json: { places: resolvedPlaces, missing: 0 } });
  });
  try {
    await page.getByRole('button', { name: '지도·나루와 이어서 편집 →', exact: true }).click();
    await expect.poll(() => requests).toBe(1);
    await page.getByLabel('하루 시작 시간', { exact: true }).fill('08:00');
    gate.release();
    await expect(page.getByText('여행을 여는 동안 일정이 수정됐어요. 변경한 내용을 확인하고 다시 열어 주세요.')).toBeVisible();
    await expect(page).toHaveURL(`/my-trips/${tripId}`);
    expect(await stored(page)).toEqual(before);
    await expect(page.getByLabel('하루 시작 시간', { exact: true })).toHaveValue('08:00');
    await page.getByRole('button', { name: '지도·나루와 이어서 편집 →', exact: true }).click();
    await expect(page).toHaveURL(/\/planner\?from=account#itinerary$/);
    expect((await stored(page)).schedule.dayStartTime).toBe('08:00');
    expect(requests).toBe(2);
  } finally { gate.release(); }
});
