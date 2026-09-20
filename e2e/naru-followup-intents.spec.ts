import { openNaruTool } from './naru-tool-fixtures';
import { expect, test, type Page, type Locator } from '@playwright/test';
import { mockPlannerApi, plan } from './fixtures';
import { groundAssistantProposal } from '../lib/assistant-grounding.js';
import { validateAssistantAction } from '../lib/assistant-actions.js';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
const start = '2026-09-20', end = '2026-09-21';
const schedule = { travelStart: start, travelEnd: end, dayStartTime: '09:30',
  scheduleAssignments: { '1001': start, '1002': end }, visitMinutesByPlaceId: { '1001': 75, '1002': 90 },
  breakMinutesByPlaceId: { '1001': 35, '1002': 25 }, restPurposeByPlaceId: { '1002': 'rest' },
  fixedVisits: { '1001': { kind: 'visit', time: '11:00', position: 0 } },
  dayDeadlines: { [start]: { time: '18:00', returnMinutes: 30, bufferMinutes: 15 } },
  comfort: { maxWalkMinutes: 10, breakEveryMinutes: 45, breakMinutes: 20 } };

function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    return { ids: JSON.parse(values['wave-saved-places'] || '[]'), schedule: JSON.parse(values['wave-trip-schedule-v1'] || '{}'),
      order: JSON.parse(values['wave-trip-order-v1'] || '{}'), region: values['wave-planner-region-v1'],
      themes: values['wave-trip-themes-v1'], profiles: sessionStorage.getItem('wave-session-facilities-v1') };
  });
}
async function send(chat: Locator, text: string) {
  await chat.getByRole('textbox').fill(text);
  await chat.getByRole('textbox').press('Enter');
}
async function setup(page: Page) {
  // Fixture the upstream mistake, then use the same grounding/action validation as the API.
  // No local model, tourism provider or external service is reachable from these tests.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic API' } }));
  await mockPlannerApi(page, { preserveView: true });
  const requests: URL[] = [];
  let completed = 0, journeyCalls = 0, hold: ReturnType<typeof deferred> | null = null;
  await page.route('**/api/route?*', async route => {
    const url = new URL(route.request().url());
    requests.push(url); const gate = hold;
    if (gate) await gate.promise;
    await route.fallback(); completed++;
  });
  await page.route('**/api/assistant/journey', route => { journeyCalls++; return route.fulfill({ status: 500, json: { error: 'A follow-up must not request a new itinerary' } }); });
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const body = route.request().postDataJSON(), latest: string = body.messages.at(-1).content;
    const mistaken = /날짜|기간/.test(latest) ? { action: 'adapt-itinerary', start: '2027-01-01', end: '2027-01-01', region: '진주', profiles: ['baby'] }
      : /쉬는 시간/.test(latest) ? { action: 'visit', placeId: '1002', minutes: 30 }
      : /찾아줘/.test(latest) ? { action: 'search' } : { action: 'adapt-itinerary', transport: 'car', reason: 'change' };
    const proposal = validateAssistantAction(groundAssistantProposal(mistaken, body.messages, { ...body.context, today: '2026-09-12' }), body.context.places.map((place: { id: string }) => place.id));
    return route.fulfill({ json: { reply: '기존 일정을 유지하며 요청한 내용만 확인해 주세요.', proposal } });
  });
  await page.addInitScript(initial => {
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: initial }));
    sessionStorage.setItem('wave-session-facilities-v1', '["restroom"]');
  }, { 'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '["nature","history"]',
    'wave-saved-places': '["1001","1002"]', 'wave-saved-place-catalog-v1': JSON.stringify(plan.places),
    'wave-trip-order-v1': '{"mode":"manual","ids":["1001","1002"]}', 'wave-trip-schedule-v1': JSON.stringify(schedule) });
  await page.goto('/planner');
  await page.getByRole('group', { name: '여행 설계 화면', exact: true }).getByRole('button', { name: /^내 일정/ }).click();
  // The map loads the selected first leg; automatic coverage checks both days.
  await expect.poll(() => completed).toBe(3);
  expect(requests.map(url => url.searchParams.get('endLat') + ',' + url.searchParams.get('endLng')).sort()).toEqual(['35.229,128.683', '35.238,128.691', '35.238,128.691']);
  expect(requests.every(url => url.searchParams.get('startLat') === '35.2422' && url.searchParams.get('startLng') === '128.6982')).toBe(true);
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '1002']);
  const launcher = page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true });
  await launcher.click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return { chat, requests, completed: () => completed, journeyCalls: () => journeyCalls, hold: (gate: ReturnType<typeof deferred> | null) => { hold = gate; } };
}

test('이동수단만 바꾸면 새 일정 없이 저장한 장소·기간·순서·고정 방문·휴식·편의를 유지한다', async ({ page }) => {
  const app = await setup(page), before = await snapshot(page), gate = deferred();
  const baseline = app.requests.map(url => Object.fromEntries(url.searchParams));
  expect(baseline.map(item => item.mode)).toEqual(['transit', 'transit', 'transit']);
  app.hold(gate);
  try {
    await send(app.chat, '자동차로 이동할게.');
    const confirm = app.chat.getByRole('button', { name: '자동차 이동 경로 확인 · 기존 일정 유지', exact: true });
    await expect(confirm).toBeEnabled();
    expect(await snapshot(page)).toEqual(before); expect(app.requests).toHaveLength(3);
    await confirm.click();
    await expect(app.chat.getByRole('button', { name: '되돌리기', exact: true })).toBeEnabled();
    // The shared schedule command checks both legs once. Selecting the first
    // checked leg below must consume this coverage, without a duplicate fetch.
    await expect.poll(() => app.requests.length).toBe(5);
    const changed = app.requests.slice(3).map(url => Object.fromEntries(url.searchParams));
    expect(changed.every(item => item.mode === 'car' && item.startLat === '35.2422' && item.startLng === '128.6982')).toBe(true);
    expect(changed.map(item => `${item.endLat},${item.endLng}`).sort()).toEqual(['35.229,128.683', '35.238,128.691']);
    expect(app.completed()).toBe(3);
    expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule, travelMode: 'car' } });
    await expect(app.chat.getByRole('log')).toContainText('여행 설정을 수정했어요');
    await expect(app.chat.getByRole('log')).not.toContainText('조회한 이동 구간을 지도에서 볼 수 있어요');
    gate.release(); await expect.poll(app.completed).toBe(5);
    await app.chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
    await openNaruTool(page, '이동 구간 확인');
    await expect(page.locator('.itinerary-route-coverage').getByRole('combobox', { name: '이동수단', exact: true })).toHaveValue('car');
    await expect(page.locator('.itinerary-route-coverage')).toContainText('전체 2구간 중 2구간 확인');
    await page.locator('.itinerary-route-coverage').getByRole('button', { name: '이 구간 지도에서 보기', exact: true }).first().click();
    await page.locator('#navigation .reference-route-details > summary').click();
    await expect(page.locator('#navigation .route-mode-sections').getByRole('button', { name: /자동차/ })).toHaveAttribute('aria-pressed', 'true');
    expect(app.requests).toHaveLength(5);
    expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule, travelMode: 'car' } }); expect(app.journeyCalls()).toBe(0);
  } finally { gate.release(); }
});

test('같은 이동수단의 재확인은 실제 응답을 기다리고 휴식만 변경하면 체류시간을 유지한다', async ({ page }) => {
  const app = await setup(page), before = await snapshot(page), gate = deferred();
  app.hold(gate);
  try {
    await send(app.chat, '대중교통으로 이동할게.');
    await app.chat.getByRole('button', { name: '대중교통 이동 경로 확인 · 기존 일정 유지', exact: true }).click();
    await expect.poll(() => app.requests.length).toBe(5);
    await expect(app.chat.getByRole('log')).not.toContainText('조회한 이동 구간을 지도에서 볼 수 있어요');
    expect(app.requests.map(url => url.searchParams.get('mode'))).toEqual(['transit', 'transit', 'transit', 'transit', 'transit']);
    expect(await snapshot(page)).toEqual(before);
    gate.release(); await expect.poll(app.completed).toBe(5);
    await expect(app.chat.getByRole('log')).toContainText('조회한 이동 구간을 지도에서 볼 수 있어요');
    await send(app.chat, '용지호수공원에서 쉬는 시간만 30분으로 바꿔줘.');
    await expect.poll(async () => (await snapshot(page)).schedule.breakMinutesByPlaceId['1002']).toBe(30);
    await expect(app.chat.getByRole('button', { name: '되돌리기', exact: true })).toBeEnabled();
    expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule, breakMinutesByPlaceId: { ...before.schedule.breakMinutesByPlaceId, '1002': 30 } } });
    expect(app.journeyCalls()).toBe(0); expect(app.requests).toHaveLength(5);
  } finally { gate.release(); }
});

test('날짜만 바꾸면 새 장소를 만들지 않고 기존 방문일을 기간 밖 목록에 보존한다', async ({ page }) => {
  const app = await setup(page), before = await snapshot(page);
  await send(app.chat, '여행 날짜만 내일로 바꿔줘.');
  await expect.poll(async () => (await snapshot(page)).schedule.travelStart).toBe('2026-09-13');
  expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule, travelStart: '2026-09-13', travelEnd: '2026-09-13' } });
  expect(app.journeyCalls()).toBe(0);
  await app.chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  const view = page.getByRole('group', { name: '일정 보기 방식', exact: true });
  if (await view.count()) await view.getByRole('button', { name: '시간표', exact: true }).click();
  const outside = page.locator('.simple-outside-dates');
  await expect(outside).toContainText(`경남도립미술관 · ${start}`);
  await expect(outside).toContainText(`용지호수공원 · ${end}`);
  await expect(outside.getByRole('button', { name: '날짜 수정', exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  await app.chat.getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect.poll(() => snapshot(page)).toEqual(before);
  await send(app.chat, '여행 기간을 9월 20일부터 22일까지로 바꿔줘.');
  await expect.poll(async () => (await snapshot(page)).schedule.travelEnd).toBe('2026-09-22');
  expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule, travelEnd: '2026-09-22' } });
  expect(app.journeyCalls()).toBe(0);
});

test('채팅 검색은 제공처 실패·미확인·시설 부재·실제 빈 결과를 구분하고 편의를 유지한다', async ({ page }) => {
  const app = await setup(page), before = await snapshot(page);
  let scenario = 'unavailable';
  await page.route('**/api/wave?*', route => {
    if (new URL(route.request().url()).searchParams.get('action') !== 'plan') return route.fallback();
    const unavailable = scenario === 'unavailable';
    const candidates = plan.places.map((place, index) => ({ ...place, id: `300${index + 1}`, name: index ? '합성 화장실 없는 장소' : '합성 편의 미확인 장소', image: '', score: 0,
      facilityLookupState: unavailable ? 'error' : 'available', accessibility: [{ key: 'restroom', label: '장애인 화장실', detail: '', state: scenario === 'mismatch' && index ? 'negative' : 'unknown' }] }));
    return route.fulfill({ json: { ...plan, mode: unavailable ? 'partial' : 'live', criteria: { facilityKeys: ['restroom'] }, places: [], stops: [],
      explorationPlaces: scenario === 'empty' ? [] : scenario === 'mismatch' ? [candidates[0]] : candidates,
      excludedPlaces: scenario === 'mismatch' ? [candidates[1]] : [],
      statuses: plan.statuses.map(status => ({ ...status, state: unavailable ? 'error' : scenario === 'empty' ? 'empty' : 'live', count: 0, note: unavailable ? '제공처 요청 제한' : '결과 확인',
        ...(unavailable ? { failure: { provider: 'kto', operation: 'KorWithService2/detailWithTour2', kind: 'rate_limited', httpStatus: 429, code: null, retryAfterMs: 60000, resetAt: null, retryable: true } } : {}) })) } });
  });
  await send(app.chat, '현재 조건으로 여행지 찾아줘');
  const answer = app.chat.locator('.naru-message.assistant').last(), results = app.chat.locator('.naru-result-list').last();
  await expect(answer).toContainText('일부 관광 정보를 불러오지 못했어요');
  await expect(results.locator('article')).toHaveCount(2);
  await expect(results.getByRole('button', { name: '담기', exact: true })).toHaveCount(0);
  await results.getByRole('button', { name: '시설 정보 확인', exact: true }).first().click();
  const details = page.getByRole('dialog', { name: '합성 편의 미확인 장소', exact: true });
  await expect(details).toContainText('편의정보 제공처에 연결하지 못했어요');
  await expect(details.getByRole('button', { name: '일정에 추가', exact: true })).toBeDisabled();
  await expect(details.getByRole('checkbox', { name: '방문 전 확인할 후보로 담기', exact: true })).not.toBeChecked();
  await details.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(app.chat).toBeVisible(); expect(await snapshot(page)).toEqual(before);
  scenario = 'mismatch'; await send(app.chat, '현재 조건으로 여행지 찾아줘');
  await expect(results.locator('article')).toHaveCount(1);
  await expect(answer).toContainText(/1곳.*제외|제외.*1곳/);
  await expect(answer).not.toContainText('일부 관광 정보를 불러오지 못했어요');
  await expect(results.getByRole('button', { name: '담기', exact: true })).toHaveCount(0);
  scenario = 'empty'; await send(app.chat, '현재 조건으로 여행지 찾아줘');
  await expect(answer).toContainText('조건에 맞는 후보가 없어요');
  await expect(answer).not.toContainText('일부 관광 정보를 불러오지 못했어요');
  await expect(answer).not.toContainText(/1곳.*제외|제외.*1곳/);
  await expect(results.getByRole('button', { name: '검색 조건 수정', exact: true })).toBeEnabled();
  expect(await snapshot(page)).toEqual(before); expect(app.journeyCalls()).toBe(0);
});
