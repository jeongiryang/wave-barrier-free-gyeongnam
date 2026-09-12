import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, plan } from './fixtures';
import type { NaruJourney } from '../lib/naru-journey.js';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

const start = '2026-09-20', end = '2026-09-21';
const original = { ...plan.places[0], image: '', accessibility: [] };
const additions = [
  { ...plan.places[0], id: '2001', name: '합성 바다 전시관', image: '', accessibility: [] },
  { ...plan.places[1], id: '2002', contentTypeId: '14', name: '합성 숲 문화관', image: '', accessibility: [] },
];
const schedule = {
  travelStart: start, travelEnd: end, dayStartTime: '09:30', scheduleAssignments: { '1001': start },
  visitMinutesByPlaceId: { '1001': 75 }, breakMinutesByPlaceId: { '1001': 35 }, restPurposeByPlaceId: {},
  fixedVisits: { '1001': { kind: 'visit', time: '11:00', position: 0 } },
  dayDeadlines: { [start]: { time: '18:00', returnMinutes: 30, bufferMinutes: 15 } },
  comfort: { maxWalkMinutes: 10, breakEveryMinutes: 45, breakMinutes: 15 },
};
const values = {
  'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '["nature"]',
  'wave-saved-places': '["1001"]', 'wave-saved-place-catalog-v1': JSON.stringify([original]),
  'wave-trip-order-v1': '{"mode":"manual","ids":["1001"]}', 'wave-trip-schedule-v1': JSON.stringify(schedule),
};
function journey(): NaruJourney {
  return {
    action: 'create-itinerary', region: '창원', start, end, themes: ['nature', 'history'], profiles: ['wheel', 'senior'],
    relaxed: true, transport: 'car', generatedAt: '2026-09-12T03:00:00.000Z', weather: null,
    warnings: ['승강기의 이용 가능 여부는 방문 전에 확인해 주세요.'],
    stops: additions.map((place, index) => ({ place, date: index ? end : start, minutes: index ? 90 : 60, breakMinutes: index ? 25 : 20,
      reasons: ['합성 관광 데이터로 확인한 일정'], unknown: index ? ['승강기 이용 가능 여부'] : [] })),
    plan: { ...plan, mode: 'live', statuses: plan.statuses.map(status => ({ ...status, state: 'live' })), places: [original, ...additions], stops: [original, ...additions].map(place => ({ id: place.id, contentTypeId: place.contentTypeId,
      mapX: place.mapX, mapY: place.mapY, title: place.name, note: place.summary, source: place.source, evidenceState: 'verified' })) },
  };
}
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const current = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    return { ids: JSON.parse(current['wave-saved-places'] || '[]'), schedule: JSON.parse(current['wave-trip-schedule-v1'] || '{}'),
      order: JSON.parse(current['wave-trip-order-v1'] || '{}'), region: current['wave-planner-region-v1'],
      themes: JSON.parse(current['wave-trip-themes-v1'] || '[]'), profiles: JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]') };
  });
}
async function setup(page: Page, gate?: ReturnType<typeof deferred>, prepare = journey) {
  // Every API request is intercepted; an omitted fixture can never reach a real LLM or tourism service.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic test API' } }));
  await mockPlannerApi(page, { plannerView: 'guided' });
  let lookups = 0, journeyCalls = 0, completed = false;
  await page.route('**/api/wave?**', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('action') !== 'places') return route.fallback();
    lookups++;
    const ids = (params.get('ids') || '').split(',');
    return route.fulfill({ json: { places: [original, ...additions].filter(place => ids.includes(place.id)), missing: [] } });
  });
  await page.route('**/api/assistant', route => route.fulfill({ json: route.request().method() === 'GET' ? { available: true } : {
    reply: '기존 일정을 유지하며 실제 일정안을 준비할게요.',
    proposal: { action: 'create-itinerary', region: '창원', start, end, pace: 'relaxed', transport: 'car', profiles: ['wheel', 'senior'], themes: ['nature', 'history'] },
  } }));
  await page.route('**/api/assistant/journey', async route => {
    journeyCalls++;
    if (gate) await gate.promise;
    try { await route.fulfill({ contentType: 'application/x-ndjson; charset=utf-8', body: [
      { type: 'progress', phase: 'checking', text: '합성 관광 정보와 편의를 확인하고 있어요.' },
      { type: 'progress', phase: 'planning', text: '방문 날짜와 휴식을 정리하고 있어요.' },
      { type: 'result', draft: prepare() },
    ].map(event => JSON.stringify(event)).join('\n') + '\n' }); } catch { /* A deliberate user cancellation may already have aborted this request. */ }
    completed = true;
  });
  await page.addInitScript(initial => {
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: initial }));
    sessionStorage.setItem('wave-session-facilities-v1', '["wheel"]');
  }, values);
  await page.goto('/planner');
  const launcher = page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true });
  await expect(launcher).toBeEnabled();
  await expect.poll(() => lookups).toBeGreaterThan(0);
  await launcher.click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return { launcher, chat, calls: () => journeyCalls, completed: () => completed };
}
async function send(page: Page) {
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('textbox').fill('기존 약속을 유지하고 이틀 동안 쉬엄쉬엄 갈 곳을 추가해줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
}

test('NDJSON 일정안을 확인하고 적용한 뒤 장소·날짜·휴식·편의까지 되돌린다', async ({ page }) => {
  const { chat } = await setup(page);
  const before = await snapshot(page);
  await send(page);
  const proposal = chat.getByRole('region', { name: '나루의 실제 일정안', exact: true });
  await expect(proposal).toContainText('09-20 · 합성 바다 전시관');
  await expect(proposal).toContainText('09-21 · 합성 숲 문화관');
  await expect(proposal).toContainText('방문 전 확인: 승강기 이용 가능 여부');
  expect(await snapshot(page)).toEqual(before);
  await proposal.getByRole('button', { name: '미확인 항목을 살펴보고 일정에 반영', exact: true }).click();
  await expect(proposal.getByRole('button', { name: '내 일정에 반영했어요', exact: true })).toBeDisabled();
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '2001', '2002']);
  const applied = await snapshot(page);
  expect(before.schedule.travelMode).toBe('transit');
  expect(applied.schedule.travelMode).toBe('car');
  expect(applied.schedule.scheduleAssignments).toEqual({ '1001': start, '2001': start, '2002': end });
  expect(applied.schedule.visitMinutesByPlaceId).toEqual({ '1001': 75, '2001': 60, '2002': 90 });
  expect(applied.schedule.breakMinutesByPlaceId).toEqual({ '1001': 35, '2001': 20, '2002': 25 });
  expect(applied.schedule.fixedVisits).toEqual(before.schedule.fixedVisits);
  expect(applied.schedule.dayDeadlines).toEqual(before.schedule.dayDeadlines);
  expect(applied.schedule.comfort).toEqual({ maxWalkMinutes: 10, breakEveryMinutes: 45, breakMinutes: 20 });
  expect(applied.profiles).toEqual(['wheel', 'senior']);
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(page.getByRole('group', { name: '일정 보기 방식', exact: true }).getByRole('button', { name: '지도 함께 보기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.reference-board-map .leaflet-container')).toBeVisible();
  await expect(page.locator('.reference-day-list #itinerary-stop-2001')).toContainText('합성 바다 전시관');
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  await chat.getByRole('button', { name: '마지막 일정안 적용 되돌리기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('편의 조건·출발지·이동수단을 복원했어요');
  await expect.poll(() => snapshot(page)).toEqual(before);
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '필요한 편의', exact: true }).click();
  const facilities = chat.getByRole('group', { name: '여행 편의 조건 선택', exact: true });
  await expect(facilities.getByRole('button', { name: /휠체어 편의시설/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(facilities.getByRole('button', { name: /접근로와 승강기/ })).toHaveAttribute('aria-pressed', 'false');
});

test('나루 패널을 닫아도 진행 중인 일정 요청이 완료되고 다시 열어 적용할 수 있다', async ({ page }) => {
  const gate = deferred(), { chat, launcher, calls } = await setup(page, gate);
  try {
    const before = await snapshot(page);
    await send(page); await expect.poll(calls).toBe(1);
    await expect(chat.getByRole('button', { name: '중단', exact: true })).toBeVisible();
    await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
    await expect(chat).toBeHidden();
    gate.release();
    await expect(launcher).toHaveAttribute('data-state', 'done');
    expect(await snapshot(page)).toEqual(before);
    await launcher.click();
    const proposal = chat.getByRole('region', { name: '나루의 실제 일정안', exact: true });
    await expect(proposal).toContainText('합성 숲 문화관');
    await proposal.getByRole('button', { name: '미확인 항목을 살펴보고 일정에 반영', exact: true }).click();
    await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '2001', '2002']);
    expect(calls()).toBe(1);
  } finally { gate.release(); }
});

test('요청 중 편의 조건을 바꾸면 오래된 일정안의 적용을 차단한다', async ({ page }) => {
  const gate = deferred(), { chat, calls } = await setup(page, gate);
  try {
    const before = await snapshot(page);
    await send(page); await expect.poll(calls).toBe(1);
    await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
    await chat.getByRole('button', { name: '필요한 편의', exact: true }).click();
    await chat.getByRole('group', { name: '여행 편의 조건 선택', exact: true }).getByRole('button', { name: /유아 편의시설/ }).click();
    await chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
    gate.release();
    const stale = chat.getByRole('region', { name: '나루의 실제 일정안', exact: true });
    await expect(stale.getByRole('button', { name: '여행이 바뀌었어요 · 다시 요청', exact: true })).toBeDisabled();
    const after = await snapshot(page);
    expect(after.ids).toEqual(before.ids); expect(after.schedule).toEqual(before.schedule);
    expect(after.profiles).toEqual(['wheel', 'baby']);
  } finally { gate.release(); }
});

test('중단한 요청의 늦은 NDJSON 결과는 일정이나 적용 버튼으로 남지 않는다', async ({ page }) => {
  const gate = deferred(), { chat, calls, completed } = await setup(page, gate);
  try {
    const before = await snapshot(page);
    await send(page); await expect.poll(calls).toBe(1);
    await chat.getByRole('button', { name: '중단', exact: true }).click();
    gate.release(); await expect.poll(completed).toBe(true);
    await expect(chat.getByRole('log')).toContainText('답변을 중단했어요');
    await expect(chat.getByRole('region', { name: '나루의 실제 일정안', exact: true })).toHaveCount(0);
    expect(await snapshot(page)).toEqual(before);
  } finally { gate.release(); }
});

test('일정안 저장이 실패하면 기존 여행을 보존하고 적용 완료로 표시하지 않는다', async ({ page }) => {
  const { chat } = await setup(page);
  await send(page);
  const proposal = chat.getByRole('region', { name: '나루의 실제 일정안', exact: true });
  const apply = proposal.getByRole('button', { name: '미확인 항목을 살펴보고 일정에 반영', exact: true });
  await expect(apply).toBeEnabled();
  const before = await snapshot(page);
  await page.evaluate(() => { const native = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'wave-current-trip-v1') throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); native.call(this, key, value); }; });
  await apply.click();
  await expect(chat.getByRole('log')).toContainText('이 일정안을 기기에 저장하지 못했어요');
  await expect(apply).toBeEnabled();
  await expect(proposal.getByRole('button', { name: '내 일정에 반영했어요', exact: true })).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
});

function unchanged(kept = [{ id: original.id, name: original.name, date: start }]): NaruJourney {
  return { ...journey(), action: 'adapt-itinerary', stops: [], outcome: { kind: 'unchanged', reason: 'already-indoor', kept },
    warnings: ['이동 구간과 미확인 편의는 방문 전 확인해 주세요.'] };
}

test('이미 실내인 일정은 읽기 전용 성공으로 표시하고 앞선 미적용 제안도 보존한다', async ({ page }) => {
  let response = journey();
  const { chat, launcher } = await setup(page, undefined, () => response);
  await send(page);
  const oldProposal = chat.getByRole('region', { name: '나루의 실제 일정안', exact: true });
  const oldApply = oldProposal.getByRole('button', { name: '미확인 항목을 살펴보고 일정에 반영', exact: true });
  await expect(oldApply).toBeEnabled();
  const before = await snapshot(page);
  await page.evaluate(() => {
    const writes: string[] = [];
    (window as Window & { naruNoopWrites?: string[] }).naruNoopWrites = writes;
    const native = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (['wave-current-trip-v1', 'wave-session-facilities-v1'].includes(key)) writes.push(key);
      native.call(this, key, value);
    };
  });
  response = unchanged();
  await chat.getByRole('textbox').fill('비가 올 때를 대비해서 지금 일정을 실내 위주로 바꿔줘.');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  const result = chat.getByRole('region', { name: '나루의 일정 확인 결과', exact: true });
  await expect(result).toContainText('현재 일정을 그대로 유지해요');
  await expect(result).toContainText(`09-20 · ${original.name}`);
  await expect(result).toContainText('1곳 유지');
  await expect(result).not.toContainText('0곳');
  await expect(result.getByRole('button')).toHaveCount(0);
  await expect(chat.getByRole('log')).not.toContainText('바로 적용할 일정안을 만들지 못했어요');
  await expect(chat.getByRole('button', { name: '마지막 일정안 적용 되돌리기', exact: true })).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  expect(await page.evaluate(() => (window as Window & { naruNoopWrites?: string[] }).naruNoopWrites)).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('naru-unchanged.png') });
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(launcher).toHaveAttribute('data-state', 'done');
  await launcher.click();
  await expect(oldApply).toBeEnabled();
  await oldApply.click();
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '2001', '2002']);
});

test('읽기 전용 실내 확인은 이전 일정 적용의 되돌리기를 덮어쓰지 않는다', async ({ page }) => {
  let response = journey();
  const { chat } = await setup(page, undefined, () => response);
  const before = await snapshot(page);
  await send(page);
  await chat.getByRole('button', { name: '미확인 항목을 살펴보고 일정에 반영', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '2001', '2002']);
  const applied = await snapshot(page);
  response = unchanged([original, ...additions].map(place => ({ id: place.id, name: place.name, date: applied.schedule.scheduleAssignments[place.id] })));
  await chat.getByRole('textbox').fill('비가 올 때를 대비해서 지금 일정을 실내 위주로 바꿔줘.');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByRole('region', { name: '나루의 일정 확인 결과', exact: true })).toContainText('3곳 유지');
  expect(await snapshot(page)).toEqual(applied);
  const undo = chat.getByRole('button', { name: '마지막 일정안 적용 되돌리기', exact: true });
  await expect(undo).toHaveCount(1);
  await undo.click();
  await expect.poll(() => snapshot(page)).toEqual(before);
});

test('빈 결과는 경고문에 실내라는 표현이 있어도 읽기 전용 성공으로 바꾸지 않는다', async ({ page }) => {
  const response: NaruJourney = { ...journey(), stops: [], outcome: { kind: 'unavailable' }, warnings: ['현재 담은 장소 모두 공식 소개에 실내 공간이 기록되어 있어요.'] };
  const { chat, launcher } = await setup(page, undefined, () => response);
  const before = await snapshot(page);
  await send(page);
  await expect(chat.getByRole('log')).toContainText('바로 적용할 일정안을 만들지 못했어요');
  await expect(chat.getByRole('region', { name: '나루의 일정 확인 결과', exact: true })).toHaveCount(0);
  await expect(chat.getByRole('button', { name: '필요한 편의를 유지하고 다른 후보 찾기', exact: true })).toBeEnabled();
  expect(await snapshot(page)).toEqual(before);
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(launcher).toHaveAttribute('data-state', 'warning');
});
