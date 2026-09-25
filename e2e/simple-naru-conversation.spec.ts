import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';
import type { Place, PlanData } from '../features/planner/types';
import type { NaruJourney } from '../lib/naru-journey.js';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

const start = '2026-09-20', end = '2026-09-21';
const places: Place[] = plan.places.map(place => ({ ...place, image: '', accessibility: [
  { key: 'restroom', label: '장애인 화장실', detail: '합성 fixture: 공식 시설 원문 확인', state: 'confirmed' },
  { key: 'parking', label: '장애인 주차구역', detail: '합성 fixture: 공식 시설 원문 확인', state: 'confirmed' },
] }));
const added: Place = { ...places[0], id: '2001', name: '합성 후속 전시관' };
// Deliberately reverse the fixture catalog: ordinals must use the displayed result order.
const shown = [places[1], places[0]];
function resultPlan(keys: string[] = [], records = shown): PlanData {
  return { ...plan, mode: 'live', places: records, criteria: { facilityKeys: keys },
    statuses: plan.statuses.map(status => ({ ...status, state: 'live' })),
    stops: records.map(place => ({ id: place.id, title: place.name, note: place.summary, source: place.source, mapX: place.mapX, mapY: place.mapY, contentTypeId: place.contentTypeId })) };
}
function draft(): NaruJourney {
  return { action: 'create-itinerary', region: '창원', start, end, themes: [], profiles: ['restroom'], transport: 'transit', relaxed: true,
    generatedAt: '2026-09-13T02:00:00.000Z', weather: null, warnings: ['합성 응답 검증: 경로 통행 가능성을 보장하지 않습니다.'],
    stops: [{ place: added, date: end, minutes: 60, breakMinutes: 25, reasons: ['조회한 장소의 시설 정보 확인'], unknown: [] }],
    plan: resultPlan(['restroom'], [places[0], added]) };
}
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
type AssistantRequest = { messages: Array<{ role: string; content: string }>; context: { resultIds?: string[]; focusedPlaceId?: string; profiles?: string } };
type Answer = { proposal?: unknown; reply?: string };
type Setup = { seeded?: boolean; assistant?: (text: string, payload: AssistantRequest) => Answer | Promise<Answer>; journeyGate?: ReturnType<typeof deferred>; duplicateResult?: boolean };
const seedValues = {
  'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001"]',
  'wave-saved-place-catalog-v1': JSON.stringify([places[0]]), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001"]}',
  'wave-trip-schedule-v1': JSON.stringify({ travelStart: start, travelEnd: end, dayStartTime: '09:30', travelMode: 'transit',
    scheduleAssignments: { '1001': start }, visitMinutesByPlaceId: { '1001': 75 }, breakMinutesByPlaceId: { '1001': 35 }, restPurposeByPlaceId: {},
    fixedVisits: { '1001': { kind: 'visit', time: '11:00', position: 0 } }, dayDeadlines: { [start]: { time: '18:00', returnMinutes: 30, bufferMinutes: 15 } },
    comfort: { maxWalkMinutes: 10, breakEveryMinutes: 45, breakMinutes: 15 } }),
};
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    const schedule = JSON.parse(values['wave-trip-schedule-v1'] || '{}');
    return { ids: JSON.parse(values['wave-saved-places'] || '[]') as string[], region: values['wave-planner-region-v1'] || '',
      themes: JSON.parse(values['wave-trip-themes-v1'] || '[]') as string[], profiles: JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]') as string[],
      order: JSON.parse(values['wave-trip-order-v1'] || '{"mode":"auto","ids":[]}'),
      schedule: { travelStart: schedule.travelStart || '', travelEnd: schedule.travelEnd || '', dayStartTime: schedule.dayStartTime || '10:00', travelMode: schedule.travelMode || 'transit',
        scheduleAssignments: schedule.scheduleAssignments || {}, visitMinutesByPlaceId: schedule.visitMinutesByPlaceId || {}, breakMinutesByPlaceId: schedule.breakMinutesByPlaceId || {},
        restPurposeByPlaceId: schedule.restPurposeByPlaceId || {}, fixedVisits: schedule.fixedVisits || {}, dayDeadlines: schedule.dayDeadlines || {},
        comfort: schedule.comfort || { maxWalkMinutes: null, breakEveryMinutes: null, breakMinutes: 15 } } };
  });
}
async function setup(page: Page, options: Setup = {}) {
  // Everything, including accidental assistant/provider requests, is synthetic in this spec.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic conversation API' } }));
  await mockPlannerApi(page, { preserveView: true, savedPlaces: [...places, added] });
  await mockPublicShellApi(page);
  const assistantRequests: AssistantRequest[] = [], planRequests: URL[] = [], errors: string[] = [];
  let journeyCalls = 0, assistantCompletions = 0, journeyCompleted = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/wave?*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('action') !== 'plan') return route.fallback();
    planRequests.push(url);
    return route.fulfill({ json: resultPlan((url.searchParams.get('facilityKeys') || '').split(',').filter(Boolean)) });
  });
  await page.route('**/api/assistant', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const payload = route.request().postDataJSON() as AssistantRequest;
    assistantRequests.push(payload);
    const text = payload.messages.at(-1)!.content;
    const answer = await options.assistant?.(text, payload) ?? (text.includes('찾아') ? { proposal: { action: 'settings', region: '창원' } }
      : text.includes(places[1].name) && /담|추가/.test(text) ? { proposal: { action: 'add', placeId: '1002' } }
      : text.includes(places[0].name) && /담|추가/.test(text) ? { proposal: { action: 'add', placeId: '1001' } }
      : { proposal: null, reply: '요청을 확인했어요. 변경할 내용을 구체적으로 알려주세요.' });
    try { await route.fulfill({ json: { reply: '합성 모델 응답', ...answer } }); }
    catch { /* A deliberately stopped response may already be detached from the browser. */ }
    assistantCompletions++;
  });
  await page.route('**/api/assistant/journey', async route => {
    journeyCalls++;
    if (options.journeyGate) await options.journeyGate.promise;
    const events = [{ type: 'progress', phase: 'checking', text: '합성 관광 정보를 확인하고 있어요.' }, { type: 'result', draft: draft() }];
    if (options.duplicateResult) events.push({ type: 'result', draft: draft() });
    try { await route.fulfill({ contentType: 'application/x-ndjson', body: events.map(event => JSON.stringify(event)).join('\n') + '\n' }); }
    catch { /* A deliberately stopped response may already be detached from the browser. */ }
    journeyCompleted = true;
  });
  if (options.seeded) await page.addInitScript(values => {
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values }));
    sessionStorage.setItem('wave-session-facilities-v1', '["restroom"]');
  }, seedValues);
  await page.goto('/planner');
  const launcher = page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true });
  await expect(launcher).toBeEnabled();
  if (options.seeded) {
    await expect.poll(() => planRequests.length).toBe(1);
    await expect(page.locator('.simple-searching')).toHaveCount(0);
  }
  await launcher.click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return { chat, launcher, input: chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }), assistantRequests, planRequests, errors,
    journeyCalls: () => journeyCalls, assistantCompletions: () => assistantCompletions, journeyCompleted: () => journeyCompleted };
}
async function send(chat: Locator, text: string) {
  await chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill(text);
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
}
async function idle(chat: Locator) { await expect(chat.getByRole('button', { name: '나루에게 보내기', exact: true })).toBeVisible(); }
async function search(chat: Locator) {
  await send(chat, '창원 여행지를 찾아줘');
  await expect(chat.getByLabel('대화에서 찾은 여행지').last().locator('.naru-place-name')).toHaveText(shown.map(place => place.name));
  await idle(chat);
}
async function changeFacilities(page: Page, chat: Locator) {
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await page.locator(".wave-header").locator(".night-search-link").click();
  await page.locator('.simple-facility-trigger').click();
  const chooser = page.getByRole('dialog', { name: '필요한 편의', exact: true });
  await chooser.getByRole('checkbox', { name: '장애인 주차구역', exact: true }).check();
  await chooser.getByRole('button', { name: /^적용/ }).click();
  await expect(chooser).toHaveCount(0);
  await expect.poll(async () => (await snapshot(page)).profiles.includes('parking')).toBe(true);
}

test('조회 결과의 실제 순서로 첫 번째를 바로 담고 날짜 없는 초안까지 되돌린다', async ({ page }) => {
  const app = await setup(page);
  await search(app.chat);
  expect(app.planRequests).toHaveLength(1);
  expect(app.planRequests[0].searchParams.get('themes')).toBe('');
  expect(app.planRequests[0].searchParams.has('date')).toBe(false);
  const before = await snapshot(page);
  expect(before.schedule.travelStart).toBe('');
  await send(app.chat, '첫 번째를 일정에 담아줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1002']);
  expect(app.assistantRequests.at(-1)!.messages.at(-1)!.content).toBe(`${places[1].name}를 일정에 담아줘`);
  expect(app.assistantRequests.at(-1)!.context.resultIds).toEqual(['1002', '1001']);
  await expect(app.chat.locator('.naru-change-button')).toHaveCount(0);
  await expect(app.chat.getByLabel('대화에서 찾은 여행지').getByRole('button', { name: '✓ 담았음', exact: true })).toBeDisabled();
  await app.chat.getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect.poll(() => snapshot(page)).toEqual(before);
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('상세에서 본 장소를 거기로 참조하고 닫고 열어도 입력과 대화를 보존한다', async ({ page }) => {
  const app = await setup(page);
  await search(app.chat);
  await app.input.fill('아직 보내지 않은 질문');
  await app.chat.getByLabel('대화에서 찾은 여행지').getByRole('button', { name: places[0].name, exact: true }).click();
  const details = page.getByRole('dialog', { name: places[0].name, exact: true });
  await expect(details).toBeVisible(); await expect(app.chat).toHaveCount(0);
  await details.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(app.chat).toBeVisible(); await expect(app.input).toHaveValue('아직 보내지 않은 질문');
  await send(app.chat, '거기를 일정에 담아줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001']);
  expect(app.assistantRequests.at(-1)!.messages.at(-1)!.content).toBe(`${places[0].name}를 일정에 담아줘`);
  expect(app.assistantRequests.at(-1)!.context.focusedPlaceId).toBe('1001');
  await idle(app.chat); await app.input.fill('돌아와서 이어 쓸 질문');
  const count = app.assistantRequests.length;
  await app.chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await app.launcher.click();
  await expect(app.input).toHaveValue('돌아와서 이어 쓸 질문');
  await expect(app.chat.getByRole('log')).toContainText('거기를 일정에 담아줘');
  await expect(app.chat.getByRole('log')).toContainText(`${places[0].name}을 일정에 담았어요.`);
  expect(app.assistantRequests).toHaveLength(count); expect(app.errors).toEqual([]);
});

test('모델이 변경을 잘못 제안해도 추가·삭제 부정문은 현재 여행을 바꾸지 않는다', async ({ page }) => {
  const app = await setup(page, { assistant: text => text.includes('찾아') ? { proposal: { action: 'settings', region: '창원' } }
    : { proposal: { action: text.includes('빼') ? 'remove' : 'add', placeId: text.includes(places[1].name) ? '1002' : '1001' } } });
  await search(app.chat); await send(app.chat, '첫 번째를 일정에 담아줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1002']);
  const before = await snapshot(page);
  for (const text of ['첫 번째는 빼지 마', '두 번째는 일정에 추가하지 말아줘', '두 번째를 추가하면 안 돼.']) {
    await send(app.chat, text); await idle(app.chat);
    await expect(app.chat.getByRole('log')).toContainText('일정은 변경하지 않았어요');
    expect(await snapshot(page)).toEqual(before);
  }
  await expect(app.chat.locator('.naru-change-button')).toHaveCount(0);
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

const createAnswer = () => ({ proposal: { action: 'create-itinerary', region: '창원', start, end, profiles: ['restroom'], transport: 'transit' } });
test('새 일정은 미리보기 뒤 자연어로 한 번 승인하고 중복 NDJSON에도 고정 방문과 편의까지 되돌린다', async ({ page }) => {
  const app = await setup(page, { seeded: true, duplicateResult: true, assistant: text => text.includes('추가 코스') ? createAnswer() : { proposal: null } });
  const before = await snapshot(page);
  await send(app.chat, '기존 약속은 유지하고 추가 코스를 만들어줘');
  const proposal = app.chat.getByRole('region', { name: '나루의 실제 일정안', exact: true });
  await expect(proposal).toContainText('09-21 · 합성 후속 전시관');
  await expect(proposal).toHaveCount(1);
  expect(await snapshot(page)).toEqual(before);
  const modelCalls = app.assistantRequests.length;
  await send(app.chat, '좋아');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '2001']);
  const applied = await snapshot(page);
  expect(applied.schedule.fixedVisits).toEqual(before.schedule.fixedVisits);
  expect(applied.schedule.scheduleAssignments).toEqual({ '1001': start, '2001': end });
  expect(applied.schedule.breakMinutesByPlaceId).toEqual({ '1001': 35, '2001': 25 });
  expect(applied.profiles).toEqual(before.profiles);
  expect(app.assistantRequests).toHaveLength(modelCalls);
  await expect(proposal.getByRole('button', { name: '내 일정에 반영했어요', exact: true })).toBeDisabled();
  await send(app.chat, '그대로 적용해줘'); await idle(app.chat);
  expect(await snapshot(page)).toEqual(applied); expect(app.journeyCalls()).toBe(1);
  await app.chat.getByRole('button', { name: '마지막 일정안 적용 되돌리기', exact: true }).click();
  await expect.poll(() => snapshot(page)).toEqual(before);
  expect(app.errors).toEqual([]);
});

test('진행 중 편의가 바뀐 오래된 일정안은 자연어 승인으로도 적용되지 않는다', async ({ page }) => {
  const gate = deferred(), app = await setup(page, { seeded: true, journeyGate: gate, assistant: createAnswer });
  try {
    await send(app.chat, '기존 약속은 유지하고 추가 코스를 만들어줘');
    await expect.poll(app.journeyCalls).toBe(1);
    await changeFacilities(page, app.chat);
    await expect.poll(() => app.planRequests.length).toBe(2);
    await expect(page.locator('.simple-searching')).toHaveCount(0);
    const changed = await snapshot(page);
    gate.release(); await expect.poll(app.journeyCompleted).toBe(true);
    await app.launcher.click();
    const proposal = app.chat.getByRole('region', { name: '나루의 실제 일정안', exact: true });
    await expect(proposal.getByRole('button', { name: '여행이 바뀌었어요 · 다시 요청', exact: true })).toBeDisabled();
    await idle(app.chat); await send(app.chat, '좋아');
    expect(await snapshot(page)).toEqual(changed);
    expect(changed.profiles).toEqual(['restroom', 'parking']);
    expect(app.journeyCalls()).toBe(1); expect(app.errors).toEqual([]);
  } finally { gate.release(); }
});

test('장소 추가 응답을 기다리는 사이 조건을 바꾸면 늦은 자동 편집을 차단한다', async ({ page }) => {
  const gate = deferred(), app = await setup(page, { assistant: async text => {
    if (text.includes('찾아')) return { proposal: { action: 'settings', region: '창원' } };
    await gate.promise; return { proposal: { action: 'add', placeId: '1002' } };
  } });
  try {
    await search(app.chat); await send(app.chat, '첫 번째를 일정에 담아줘');
    await expect.poll(() => app.assistantRequests.length).toBe(2);
    await changeFacilities(page, app.chat);
    await expect.poll(() => app.planRequests.length).toBe(2);
    await expect(page.locator('.simple-searching')).toHaveCount(0);
    const changed = await snapshot(page);
    gate.release(); await expect.poll(app.assistantCompletions).toBe(2);
    await app.launcher.click();
    await expect(app.chat.getByRole('log')).toContainText('그동안 여행이 바뀌었어요');
    expect(await snapshot(page)).toEqual(changed);
    await expect(app.chat.getByRole('button', { name: '되돌리기', exact: true })).toHaveCount(0);
    expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
  } finally { gate.release(); }
});

test('중복 전송을 막고 중단한 이전 답변이 새 요청의 장소 추가를 덮지 않는다', async ({ page }) => {
  const gate = deferred(), app = await setup(page, { assistant: async text => {
    if (text.includes('찾아')) return { proposal: { action: 'settings', region: '창원' } };
    if (text.includes(places[1].name)) { await gate.promise; return { proposal: { action: 'add', placeId: '1002' } }; }
    return { proposal: { action: 'add', placeId: '1001' } };
  } });
  try {
    await search(app.chat); await send(app.chat, '첫 번째를 일정에 담아줘');
    await expect.poll(() => app.assistantRequests.length).toBe(2);
    await app.input.fill('첫 번째를 일정에 담아줘'); await app.input.press('Enter');
    expect(app.assistantRequests).toHaveLength(2);
    await app.chat.getByRole('button', { name: '중단', exact: true }).click();
    await idle(app.chat);
    await expect(app.input).toHaveValue('첫 번째를 일정에 담아줘');
    expect(app.assistantRequests).toHaveLength(2);
    await send(app.chat, '두 번째를 일정에 담아줘');
    await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001']);
    gate.release(); await expect.poll(app.assistantCompletions).toBe(3);
    expect((await snapshot(page)).ids).toEqual(['1001']);
    await expect(app.chat.getByRole('button', { name: '되돌리기', exact: true })).toHaveCount(1);
    await expect(app.chat.getByRole('log')).not.toContainText(`${places[1].name}을 일정에 담았어요.`);
    expect(app.assistantRequests).toHaveLength(3); expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
  } finally { gate.release(); }
});

test('번호가 범위 밖이거나 거기의 대상이 없으면 모델 호출 없이 대상을 다시 묻는다', async ({ page }) => {
  const app = await setup(page); await search(app.chat);
  const before = await snapshot(page), calls = app.assistantRequests.length;
  for (const text of ['세 번째를 담아줘', '거기를 일정에 담아줘']) {
    await send(app.chat, text);
    await expect(app.chat.getByRole('log')).toContainText('어느 장소인지 이름이나 목록의 번호를 알려주세요');
    await expect(app.input).toHaveValue(text);
    expect(await snapshot(page)).toEqual(before); expect(app.assistantRequests).toHaveLength(calls);
  }
  expect(app.errors).toEqual([]);
});

test('제안한 장소 추가를 거절한 뒤의 긍정 답변이 취소한 변경안을 다시 적용하지 않는다', async ({ page }) => {
  const app = await setup(page, { assistant: text => text.includes('찾아') ? { proposal: { action: 'settings', region: '창원' } }
    : text.includes('한 곳을 추천') ? { proposal: { action: 'add', placeId: '1001' } } : { proposal: null, reply: '원하는 내용을 더 알려주세요.' } });
  await search(app.chat); const before = await snapshot(page);
  await send(app.chat, '나한테 어울리는 한 곳을 추천해줘');
  await expect(app.chat.locator('.naru-change-button')).toContainText(places[0].name);
  expect(await snapshot(page)).toEqual(before);
  await send(app.chat, '아니, 그 변경은 취소해줘. 추가하지 마'); await idle(app.chat);
  expect(await snapshot(page)).toEqual(before);
  await send(app.chat, '좋아'); await idle(app.chat);
  expect(await snapshot(page)).toEqual(before);
  await expect(app.chat.getByRole('button', { name: '되돌리기', exact: true })).toHaveCount(0);
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});
