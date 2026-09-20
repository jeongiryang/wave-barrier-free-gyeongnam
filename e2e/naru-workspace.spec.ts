import { expect, test, type Page, type Locator } from '@playwright/test';
import { mockPlannerApi, plan } from './fixtures';
import type { NaruJourney } from '../lib/naru-journey.js';

// All API and remote requests are synthetic; no real model or tourism provider is called.
test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
const start = '2026-10-03', end = '2026-10-04';
const original = { ...plan.places[0], image: '' };
const additions = plan.places.map((place, index) => ({ ...place, id: `200${index + 1}`, name: `작업공간 검증 장소 ${index + 1}`, image: '' }));
const schedule = { travelStart: start, travelEnd: end, dayStartTime: '09:00', travelMode: 'transit', scheduleAssignments: { '1001': start }, visitMinutesByPlaceId: { '1001': 60 }, fixedVisits: {}, dayDeadlines: {}, breakMinutesByPlaceId: {}, restPurposeByPlaceId: {}, comfort: { maxWalkMinutes: null, breakEveryMinutes: null, breakMinutes: 15 } };
function draft(): NaruJourney {
  return { action: 'create-itinerary', region: '창원', start, end, profiles: [], themes: [], transport: 'car', relaxed: true, generatedAt: '2026-09-21T00:00:00Z', weather: null, warnings: [],
    stops: additions.map((place, index) => ({ place, date: index ? end : start, minutes: 60, breakMinutes: 20, reasons: ['합성 관광 정보'], unknown: [] })),
    plan: { ...plan, mode: 'live', statuses: plan.statuses.map(status => ({ ...status, state: 'live' })), places: [original, ...additions],
      stops: [original, ...additions].map(place => ({ id: place.id, contentTypeId: place.contentTypeId, mapX: place.mapX, mapY: place.mapY, title: place.name, note: place.summary, source: place.source, evidenceState: 'verified' })) } };
}
async function state(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    return { ids: JSON.parse(values['wave-saved-places'] || '[]'), schedule: JSON.parse(values['wave-trip-schedule-v1'] || '{}'), themes: values['wave-trip-themes-v1'], region: values['wave-planner-region-v1'] };
  });
}
async function open(page: Page) {
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return chat;
}
async function setup(page: Page, withTrip = false) {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.fallback() : route.abort());
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic API' } }));
  await mockPlannerApi(page, { preserveView: true, savedPlaces: [original, ...additions] });
  const prompts: string[] = [], journeys: unknown[] = [];
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const body = route.request().postDataJSON() as { messages: Array<{ content: string }> };
    prompts.push(body.messages.at(-1)!.content);
    return route.fulfill({ json: { reply: '합성 일정안을 준비했습니다.', proposal: { action: 'create-itinerary', region: '창원', start, end, pace: 'relaxed', transport: 'car' } } });
  });
  await page.route('**/api/assistant/journey', route => {
    journeys.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'result', draft: draft() }) + '\n' });
  });
  if (withTrip) await page.addInitScript(initial => {
    if (sessionStorage.getItem('workspace-fixture-seeded')) return;
    sessionStorage.setItem('workspace-fixture-seeded', '1');
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: initial }));
  }, { 'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001"]', 'wave-saved-place-catalog-v1': JSON.stringify([original]), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001"]}', 'wave-trip-schedule-v1': JSON.stringify(schedule) });
  await page.goto('/planner?region=창원');
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toBeEnabled();
  if (withTrip) await expect.poll(async () => (await state(page)).ids).toEqual(['1001']);
  return { chat: await open(page), prompts, journeys };
}
async function requestTrip(chat: Locator) {
  await chat.getByRole('button', { name: '여행 준비 맡기기 →', exact: true }).click();
  const form = chat.getByRole('form', { name: '여행 준비 맡기기', exact: true });
  await form.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await form.getByLabel('출발 날짜', { exact: true }).fill(start);
  await form.getByLabel('마지막 날짜', { exact: true }).fill(end);
  await form.getByRole('combobox', { name: '동행', exact: true }).selectOption('부모님과');
  await form.getByRole('combobox', { name: '이동수단', exact: true }).selectOption('car');
  await form.getByRole('button', { name: '가볍게', exact: true }).click();
  await form.getByRole('button', { name: '이 조건으로 여행 준비 맡기기 →', exact: true }).click();
  const proposal = chat.getByRole('region', { name: '나루의 실제 일정안', exact: true });
  await expect(proposal).toContainText('작업공간 검증 장소 2');
  return proposal;
}

test('workspace tabs expose all 24 tools with keyboard and pointer targets', async ({ page }) => {
  const { chat, prompts, journeys } = await setup(page);
  const tabs = chat.getByRole('tablist', { name: '나루 작업공간' });
  await tabs.getByRole('tab', { name: '대화', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: '여행 도구', exact: true })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: '여행 도구', exact: true })).toHaveAttribute('aria-selected', 'true');
  const tools = chat.getByRole('region', { name: '모든 여행 도구', exact: true }).locator('.naru-tools button');
  await expect(tools).toHaveCount(24);
  const labels = await tools.allTextContents();
  expect(labels).toEqual(expect.arrayContaining(['지역·활동', '필요한 편의', '날짜·기간', '지도·경로', '동행·합류', '해설 대본', '방문 전 문의', '오프라인 요약', '여행 당일 안내']));
  for (const button of await tools.all()) {
    await button.scrollIntoViewIfNeeded(); await button.focus(); await expect(button).toBeFocused();
    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    await expect.poll(() => button.evaluate(node => { const r = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  }
  await tabs.getByRole('tab', { name: '여행 도구', exact: true }).focus(); await page.keyboard.press('End');
  await expect(chat.getByRole('region', { name: '저장한 여행 작업', exact: true })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(tabs.getByRole('tab', { name: '대화', exact: true })).toBeFocused();
  await tabs.getByRole('tab', { name: '여행 도구', exact: true }).click();
  await chat.getByRole('region', { name: '모든 여행 도구', exact: true }).getByRole('button', { name: '필요한 편의', exact: true }).click();
  await chat.locator('.naru-tool-card').getByRole('button', { name: '여행 설계에서 자세히 보기', exact: true }).click();
  await expect(chat).toHaveCount(0); await expect(page.locator('.simple-facility-trigger')).toBeFocused();
  expect(prompts).toEqual([]); expect(journeys).toEqual([]);
});

test('travel preparation sends one complete request, previews changes and supports apply and undo', async ({ page }) => {
  const { chat, prompts, journeys } = await setup(page, true);
  const before = await state(page), proposal = await requestTrip(chat);
  expect(prompts).toHaveLength(1); expect(journeys).toHaveLength(1);
  for (const part of ['부모님과 창원', start, end, '자동차', '걷는 부담을 줄이고 휴식 시간을 넉넉히', '필수 편의와 고정 방문을 유지']) expect(prompts[0]).toContain(part);
  expect(journeys[0]).toMatchObject({ action: { action: 'create-itinerary', start, end, transport: 'car' } });
  expect(await state(page)).toEqual(before);
  await proposal.getByRole('button', { name: '이 일정으로 반영하기', exact: true }).click();
  await expect.poll(async () => (await state(page)).ids).toEqual(['1001', '2001', '2002']);
  expect((await state(page)).schedule.scheduleAssignments).toEqual({ '1001': start, '2001': start, '2002': end });
  await chat.getByRole('button', { name: '마지막 일정안 적용 되돌리기', exact: true }).click();
  await expect.poll(() => state(page)).toEqual(before);
  expect(prompts).toHaveLength(1); expect(journeys).toHaveLength(1);
});

test('explicit conversation saving survives reload and resumes without executable old proposals', async ({ page }) => {
  const { chat, prompts, journeys } = await setup(page, true);
  await requestTrip(chat);
  const before = await state(page);
  expect(await page.evaluate(() => localStorage.getItem('wave-naru-workspaces-v1'))).toBeNull();
  await chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill('아직 보내지 않은 요청');
  await chat.getByRole('tab', { name: '저장한 내용', exact: true }).click();
  const saved = chat.getByRole('region', { name: '저장한 여행 작업', exact: true });
  await saved.getByLabel('여행 이름', { exact: true }).fill('부모님과 창원');
  await saved.getByRole('button', { name: '대화와 현재 여행 저장', exact: true }).click();
  await expect(chat.locator('.naru-workspace-notice')).toContainText('대화와 일정을 저장했어요');
  const envelope = await page.evaluate(() => JSON.parse(localStorage.getItem('wave-naru-workspaces-v1')!));
  expect(envelope.version).toBe(1); expect(envelope.workspaces).toHaveLength(1);
  expect(envelope.workspaces[0]).toMatchObject({ title: '부모님과 창원', input: '아직 보내지 않은 요청' });
  expect(envelope.workspaces[0].messages.some((message: { text: string }) => message.text.includes('부모님과 창원'))).toBe(true);
  for (const message of envelope.workspaces[0].messages) expect(Object.keys(message).sort()).toEqual(['role', 'text']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-travel-book-v1') || '[]').length)).toBe(1);
  await page.reload(); const reopened = await open(page);
  await reopened.getByRole('tab', { name: '저장한 내용', exact: true }).click();
  await reopened.getByRole('button', { name: '부모님과 창원 이어가기', exact: true }).click();
  await expect(reopened.getByRole('tab', { name: '대화', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(reopened.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true })).toHaveValue('아직 보내지 않은 요청');
  await expect(reopened.getByRole('log')).toContainText('부모님과 창원');
  await expect(reopened.locator('.naru-journey-proposal,.naru-change-button')).toHaveCount(0);
  await expect(reopened.getByRole('button', { name: '마지막 일정안 적용 되돌리기', exact: true })).toHaveCount(0);
  expect(await state(page)).toEqual(before); expect(prompts).toHaveLength(1); expect(journeys).toHaveLength(1);
});

test('a blocked local save reports failure and preserves both the previous archive and current input', async ({ page }) => {
  const { chat, prompts } = await setup(page);
  const question = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await question.fill('저장 실패에도 남아야 할 요청');
  await chat.getByRole('tab', { name: '저장한 내용', exact: true }).click();
  const saved = chat.getByRole('region', { name: '저장한 여행 작업', exact: true });
  await saved.getByLabel('여행 이름', { exact: true }).fill('기존 대화');
  await saved.getByRole('button', { name: '대화와 현재 여행 저장', exact: true }).click();
  await expect(chat.locator('.naru-workspace-notice')).toContainText('이 기기에 대화를 저장했어요');
  const before = await page.evaluate(() => localStorage.getItem('wave-naru-workspaces-v1'));
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'wave-naru-workspaces-v1') throw new DOMException('Full', 'QuotaExceededError'); return original.call(this, key, value); }; });
  await saved.getByLabel('여행 이름', { exact: true }).fill('저장 실패한 이름');
  await saved.getByRole('button', { name: '대화와 현재 여행 저장', exact: true }).click();
  await expect(chat.locator('.naru-workspace-notice')).toContainText('대화를 저장하지 못했어요');
  expect(await page.evaluate(() => localStorage.getItem('wave-naru-workspaces-v1'))).toBe(before);
  await chat.getByRole('tab', { name: '대화', exact: true }).click(); await expect(question).toHaveValue('저장 실패에도 남아야 할 요청');
  expect(prompts).toEqual([]);
});

test('saved trips and an empty preparation workspace restore their own conversation and trip identity', async ({ page }) => {
  const { chat } = await setup(page, true);
  await requestTrip(chat);
  const before = await state(page);
  await chat.getByRole('tab', { name: '저장한 내용', exact: true }).click();
  await chat.getByLabel('여행 이름', { exact: true }).fill('장소 있는 여행 A');
  await chat.getByRole('button', { name: '저장하고 새 여행 준비', exact: true }).click();
  await expect.poll(async () => (await state(page)).ids).toEqual([]);
  await expect(chat.getByRole('form', { name: '여행 준비 맡기기', exact: true })).toBeVisible();
  await page.route('**/api/assistant', route => route.fulfill({ json: route.request().method() === 'GET' ? { available: true } : { reply: '여행 B의 질문을 확인했어요.' } }));
  await chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill('혼자 떠날 여행 B는 아직 장소를 고르지 않았어요');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('여행 B의 질문을 확인했어요.');
  await chat.getByRole('tab', { name: '저장한 내용', exact: true }).click();
  await chat.getByLabel('여행 이름', { exact: true }).fill('장소 없는 여행 B');
  await chat.getByRole('button', { name: '대화와 현재 여행 저장', exact: true }).click();
  await expect(chat.locator('.naru-workspace-notice')).toContainText('이 기기에 대화를 저장했어요');
  const workspaces = await page.evaluate(() => JSON.parse(localStorage.getItem('wave-naru-workspaces-v1')!).workspaces as Array<{ title: string; tripId: string; bookId?: string }>);
  const a = workspaces.find(item => item.title === '장소 있는 여행 A')!, b = workspaces.find(item => item.title === '장소 없는 여행 B')!;
  expect(a.bookId).toBeTruthy(); expect(b.bookId).toBeUndefined(); expect(a.tripId).not.toBe(b.tripId);
  for (const target of [a, b]) {
    await chat.getByRole('tab', { name: '저장한 내용', exact: true }).click();
    await chat.getByRole('button', { name: `${target.title} 이어가기`, exact: true }).click();
    const confirmation = chat.getByRole('region', { name: '다른 대화 열기 확인', exact: true });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: '대화 저장 없이 열기', exact: true }).click();
    await expect.poll(() => page.evaluate(() => {
      const values = JSON.parse(localStorage.getItem('wave-current-trip-v1')!).values;
      return JSON.parse(values['wave-trip-identity-v1']).id;
    })).toBe(target.tripId);
    await expect(chat.getByRole('log')).toContainText(target === a ? '부모님과 창원' : '혼자 떠날 여행 B');
    await expect(chat.locator('.naru-journey-proposal,.naru-change-button')).toHaveCount(0);
    if (target === a) expect(await state(page)).toEqual(before);
    else expect((await state(page)).ids).toEqual([]);
  }
});

test('another tab changing the current trip prevents stale workspace saves and restores', async ({ page }) => {
  const { chat } = await setup(page, true);
  await requestTrip(chat);
  await chat.getByRole('tab', { name: '저장한 내용', exact: true }).click();
  await chat.getByLabel('여행 이름', { exact: true }).fill('원래 여행');
  await chat.getByRole('button', { name: '대화와 현재 여행 저장', exact: true }).click();
  await expect(chat.locator('.naru-workspace-notice')).toContainText('대화와 일정을 저장했어요');
  const changed = await page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem('wave-current-trip-v1')!);
    record.values['wave-trip-identity-v1'] = JSON.stringify({ version: 1, id: '00000000-0000-4000-8000-000000000999', binding: null, share: null });
    const current = JSON.stringify(record); localStorage.setItem('wave-current-trip-v1', current);
    return { current, archive: localStorage.getItem('wave-naru-workspaces-v1'), books: localStorage.getItem('wave-travel-book-v1') };
  });
  await chat.getByRole('button', { name: '대화와 현재 여행 저장', exact: true }).click();
  await expect(chat.locator('.naru-workspace-notice')).toContainText('다른 탭에서 여행이 바뀌었어요');
  await chat.getByRole('button', { name: '원래 여행 이어가기', exact: true }).click();
  await expect(chat.locator('.naru-workspace-notice')).toContainText('다른 탭에서 여행이 바뀌었어요');
  expect(await page.evaluate(() => ({ current: localStorage.getItem('wave-current-trip-v1'), archive: localStorage.getItem('wave-naru-workspaces-v1'), books: localStorage.getItem('wave-travel-book-v1') }))).toEqual(changed);
});
