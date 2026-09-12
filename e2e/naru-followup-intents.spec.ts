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
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
}
async function setup(page: Page) {
  // Fixture the upstream mistake, then use the same grounding/action validation as the API.
  // No local model, tourism provider or external service is reachable from these tests.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic API' } }));
  await mockPlannerApi(page, { plannerView: 'guided' });
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
    sessionStorage.setItem('wave-session-facilities-v1', '["wheel","senior"]');
  }, { 'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '["nature","history"]',
    'wave-saved-places': '["1001","1002"]', 'wave-saved-place-catalog-v1': JSON.stringify(plan.places),
    'wave-trip-order-v1': '{"mode":"manual","ids":["1001","1002"]}', 'wave-trip-schedule-v1': JSON.stringify(schedule) });
  await page.goto('/planner');
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
    const confirm = app.chat.getByRole('button', { name: '자동차 이동으로 변경', exact: true });
    await expect(confirm).toBeEnabled();
    expect(await snapshot(page)).toEqual(before); expect(app.requests).toHaveLength(3);
    await confirm.click();
    await expect(app.chat.getByRole('button', { name: '확인한 작업', exact: true })).toBeFocused();
    await expect.poll(() => app.requests.length).toBe(6);
    expect(app.requests.slice(3).map(url => Object.fromEntries(url.searchParams))).toEqual(baseline.map(item => ({ ...item, mode: 'car' })));
    expect(app.completed()).toBe(3);
    expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule, travelMode: 'car' } });
    await expect(app.chat.getByRole('log')).toContainText('이동수단을 바꿨어요');
    await expect(app.chat.getByRole('log')).not.toContainText('경로 조회를 마쳤어요');
    gate.release(); await expect.poll(app.completed).toBe(6);
    await app.chat.getByRole('button', { name: '지도·일정 보기', exact: true }).click();
    await app.chat.locator('.reference-itinerary-details > summary').click();
    await expect(app.chat.locator('.itinerary-route-coverage').getByRole('combobox', { name: '이동수단', exact: true })).toHaveValue('car');
    await expect(app.chat.locator('.itinerary-route-coverage')).toContainText('전체 2구간 중 2구간 확인');
    expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule, travelMode: 'car' } }); expect(app.journeyCalls()).toBe(0);
  } finally { gate.release(); }
});

test('같은 이동수단의 재확인은 실제 응답을 기다리고 휴식만 변경하면 체류시간을 유지한다', async ({ page }) => {
  const app = await setup(page), before = await snapshot(page), gate = deferred();
  app.hold(gate);
  try {
    await send(app.chat, '대중교통으로 이동할게.');
    await app.chat.getByRole('button', { name: '대중교통 이동으로 경로 다시 확인', exact: true }).click();
    await expect.poll(() => app.requests.length).toBe(5);
    await expect(app.chat.getByRole('log')).not.toContainText('경로 조회를 마쳤어요');
    expect(app.requests.map(url => url.searchParams.get('mode'))).toEqual(['transit', 'transit', 'transit', 'transit', 'transit']);
    expect(await snapshot(page)).toEqual(before);
    gate.release(); await expect.poll(app.completed).toBe(5);
    await expect(app.chat.getByRole('log')).toContainText('경로 조회를 마쳤어요');
    await send(app.chat, '용지호수공원에서 쉬는 시간만 30분으로 바꿔줘.');
    await expect(app.chat.locator('.naru-proposal').last()).toContainText('용지호수공원 휴식 30분');
    await app.chat.getByRole('button', { name: '확인하고 적용', exact: true }).click();
    await expect.poll(async () => (await snapshot(page)).schedule.breakMinutesByPlaceId['1002']).toBe(30);
    expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule, breakMinutesByPlaceId: { ...before.schedule.breakMinutesByPlaceId, '1002': 30 } } });
    expect(app.journeyCalls()).toBe(0); expect(app.requests).toHaveLength(5);
  } finally { gate.release(); }
});

test('날짜만 바꾸면 새 일정 없이 방문일 충돌을 날짜 도구로 안내하고 기존 여행을 보존한다', async ({ page }) => {
  const app = await setup(page), before = await snapshot(page);
  await send(app.chat, '여행 날짜만 내일로 바꿔줘.');
  await expect(app.chat.locator('.naru-proposal').last()).toContainText('2026-09-13 – 2026-09-13 여행 기간');
  expect(await snapshot(page)).toEqual(before); expect(app.journeyCalls()).toBe(0);
  await app.chat.getByRole('button', { name: '확인하고 적용', exact: true }).click();
  await expect(app.chat.locator('.naru-tool-host[data-tool=dates]')).toBeVisible();
  await expect(app.chat.locator('input[type=date]').first()).toHaveValue(start);
  expect(await snapshot(page)).toEqual(before); expect(app.journeyCalls()).toBe(0);
  await app.chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  // On mobile the active tool intentionally replaces the conversation pane.
  await expect(app.chat.getByRole('log')).toContainText('기존 장소의 방문일이 새 기간 밖에 있어요');
  await send(app.chat, '여행 기간을 9월 20일부터 22일까지로 바꿔줘.');
  await expect(app.chat.locator('.naru-proposal').last()).toContainText('2026-09-20 – 2026-09-22 여행 기간');
  await app.chat.getByRole('button', { name: '확인하고 적용', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).schedule.travelEnd).toBe('2026-09-22');
  expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule, travelEnd: '2026-09-22' } });
  expect(app.journeyCalls()).toBe(0);
});

test('채팅 검색은 제공처 실패·미확인 후보와 실제 빈 결과를 구분하고 편의를 유지한다', async ({ page }) => {
  const app = await setup(page), before = await snapshot(page);
  let scenario = 'unavailable';
  await page.route('**/api/wave?*', route => {
    if (new URL(route.request().url()).searchParams.get('action') !== 'plan') return route.fallback();
    const unavailable = scenario === 'unavailable';
    return route.fulfill({ json: { ...plan, mode: unavailable ? 'partial' : 'live', criteria: { facilityKeys: ['restroom'] }, places: [], stops: [],
      explorationPlaces: scenario !== 'empty' ? plan.places.map((place, index) => ({ ...place, score: 0, facilityLookupState: unavailable ? 'error' : 'available', accessibility: [{ key: 'restroom', label: '화장실', detail: '', state: scenario === 'mismatch' && index ? 'negative' : 'unknown' }] })) : [],
      statuses: plan.statuses.map(status => ({ ...status, state: unavailable ? 'error' : scenario === 'empty' ? 'empty' : 'live', count: 0, note: unavailable ? '제공처 요청 제한' : '결과 확인',
        ...(unavailable ? { failure: { provider: 'kto', operation: 'KorWithService2/detailWithTour2', kind: 'rate_limited', httpStatus: 429, code: null, retryAfterMs: 60000, resetAt: null, retryable: true } } : {}) })) } });
  });
  await send(app.chat, '현재 조건으로 여행지 찾아줘');
  await app.chat.getByRole('button', { name: '열기 / 실행', exact: true }).click();
  const results = app.chat.locator('.naru-result-list');
  await expect(results).toContainText('제공처에 연결하지 못했거나 응답을 모두 받지 못했어요');
  await expect(results).toContainText('미확인인 후보 2곳');
  await expect(results).not.toContainText('맞는 여행지가 없어요');
  await expect(results.getByRole('button', { name: '일정에 담기', exact: true })).toHaveCount(0);
  await results.getByRole('button', { name: '다른 방법으로 찾기', exact: true }).click();
  await expect(app.chat.locator('.naru-tool-host[data-tool=places]')).toBeVisible();
  await expect(app.chat.locator('.naru-workspace')).toContainText('제공처의 요청 제한');
  expect((await snapshot(page)).profiles).toEqual(before.profiles);
  await app.chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  scenario = 'mismatch';
  await send(app.chat, '현재 조건으로 여행지 찾아줘');
  await app.chat.getByRole('button', { name: '열기 / 실행', exact: true }).click();
  await expect(results).toContainText('미확인인 후보 1곳');
  await expect(results).toContainText('필요한 편의와 맞지 않는 후보 1곳은 일정 추가에서 제외');
  await expect(results).not.toContainText('제공처에 연결하지 못했거나');
  scenario = 'empty';
  await send(app.chat, '현재 조건으로 여행지 찾아줘');
  await app.chat.getByRole('button', { name: '열기 / 실행', exact: true }).click();
  await expect(results).toContainText('맞는 여행지가 없어요');
  await expect(results).not.toContainText('제공처에 연결하지 못했거나');
  await expect(results).not.toContainText('미확인인 후보');
  expect(await snapshot(page)).toEqual(before);
});
