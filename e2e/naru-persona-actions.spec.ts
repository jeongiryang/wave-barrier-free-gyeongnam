import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';
import type { Place, PlanData } from '../features/planner/types';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

const day = '2026-10-07';
const facilities = ['restroom', 'lactationroom'];
const places: Place[] = plan.places.map(place => ({ ...place, image: '', accessibility: [
  { key: 'restroom', label: '장애인 화장실', state: 'confirmed', detail: '합성 공식 시설 원문: 화장실 있음' },
  { key: 'lactationroom', label: '수유실', state: 'confirmed', detail: '합성 공식 시설 원문: 수유실 있음' },
] }));
const initialSchedule = {
  travelStart: day, travelEnd: day, dayStartTime: '09:00', travelMode: 'transit',
  scheduleAssignments: { '1001': day, '1002': day }, visitMinutesByPlaceId: { '1001': 30, '1002': 30 },
  breakMinutesByPlaceId: { '1001': 10 }, restPurposeByPlaceId: { '1001': 'rest' },
  fixedVisits: { '1002': { kind: 'visit', time: '10:15', position: 1 } },
  dayDeadlines: { [day]: { time: '17:00', returnMinutes: 30, bufferMinutes: 15 } },
  comfort: { maxWalkMinutes: 10, breakEveryMinutes: 45, breakMinutes: 15 },
};
const seedValues = {
  'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001","1002"]',
  'wave-saved-place-catalog-v1': JSON.stringify(places), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001","1002"]}',
  'wave-trip-schedule-v1': JSON.stringify(initialSchedule),
};
function resultPlan(keys: string[]): PlanData {
  return { ...plan, mode: 'live', places, explorationPlaces: [], criteria: { facilityKeys: keys },
    statuses: plan.statuses.map(status => ({ ...status, state: 'live' })),
    stops: places.map(place => ({ id: place.id, title: place.name, note: place.summary, source: place.source,
      mapX: place.mapX, mapY: place.mapY, contentTypeId: place.contentTypeId })) };
}
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
type SetupOptions = {
  seeded?: boolean;
  checkLauncher?: boolean;
  hoursGate?: ReturnType<typeof deferred>;
  planGate?: ReturnType<typeof deferred>;
  failedHours?: Set<string>;
  assistant?: (text: string) => { reply: string; proposal: unknown };
};

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    const schedule = JSON.parse(values['wave-trip-schedule-v1'] || '{}');
    return { region: values['wave-planner-region-v1'] || '', themes: JSON.parse(values['wave-trip-themes-v1'] || '[]') as string[],
      ids: JSON.parse(values['wave-saved-places'] || '[]') as string[],
      order: JSON.parse(values['wave-trip-order-v1'] || '{"mode":"auto","ids":[]}'),
      facilities: JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]') as string[],
      schedule: { travelStart: schedule.travelStart || '', travelEnd: schedule.travelEnd || '', dayStartTime: schedule.dayStartTime || '10:00',
        travelMode: schedule.travelMode || 'transit', scheduleAssignments: schedule.scheduleAssignments || {},
        visitMinutesByPlaceId: schedule.visitMinutesByPlaceId || {}, breakMinutesByPlaceId: schedule.breakMinutesByPlaceId || {},
        restPurposeByPlaceId: schedule.restPurposeByPlaceId || {}, fixedVisits: schedule.fixedVisits || {},
        dayDeadlines: schedule.dayDeadlines || {}, comfort: schedule.comfort || { maxWalkMinutes: null, breakEveryMinutes: null, breakMinutes: 15 } } };
  });
}
async function setup(page: Page, options: SetupOptions = {}) {
  // No real model, tourism, voice or route provider is used in these regressions.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic persona API' } }));
  await mockPlannerApi(page, { preserveView: true, savedPlaces: places });
  await mockPublicShellApi(page);
  const assistantRequests: string[] = [], planRequests: URL[] = [], hoursRequests: string[] = [], audioRequests: string[] = [], errors: string[] = [];
  let journeyCalls = 0, planCompleted = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const scope = window as unknown as { personaMediaPlayCount: number; personaSpeech: { spoken: string[]; cancelled: number } };
    scope.personaMediaPlayCount = 0;
    scope.personaSpeech = { spoken: [], cancelled: 0 };
    HTMLMediaElement.prototype.play = function () { scope.personaMediaPlayCount++; return Promise.resolve(); };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel: () => { scope.personaSpeech.cancelled++; },
      speak: (utterance: SpeechSynthesisUtterance) => { scope.personaSpeech.spoken.push(utterance.text); },
    } });
  });
  await page.route('**/api/assistant/journey', route => { journeyCalls++; return route.fulfill({ status: 500, json: { error: 'Direct edits must not replace a journey' } }); });
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true, persona: '나루' } });
    const text = route.request().postDataJSON().messages.at(-1).content as string;
    assistantRequests.push(text);
    return route.fulfill({ json: options.assistant?.(text) || { reply: '합성 응답: 변경할 내용을 한 가지 알려주세요.', proposal: null } });
  });
  await page.route('**/api/wave?*', async route => {
    const url = new URL(route.request().url()), action = url.searchParams.get('action');
    if (action === 'plan') {
      planRequests.push(url);
      if (options.planGate) await options.planGate.promise;
      try { await route.fulfill({ json: resultPlan((url.searchParams.get('facilityKeys') || '').split(',').filter(Boolean)) }); }
      catch { /* A cancelled search can release its synthetic response after the request is detached. */ }
      planCompleted = true; return;
    }
    if (action === 'visit-info') {
      const id = url.searchParams.get('contentId') || '';
      hoursRequests.push(id);
      if (options.hoursGate) await options.hoursGate.promise;
      if (options.failedHours?.has(id)) return route.fulfill({ status: 502, json: { error: 'Synthetic provider unavailable' } });
      return route.fulfill({ json: { id, status: 'available', checkedAt: '2026-09-14T01:00:00.000Z', source: '합성 한국관광공사 원문',
        hours: id === '1002' ? '09:00~11:00 (입장마감 10:45)' : '09:00~18:00', restDays: '연중무휴', phone: '055-123-4567' } });
    }
    if (action === 'place-audio') {
      const id = url.searchParams.get('contentId') || '';
      audioRequests.push(id);
      return route.fulfill({ json: { checkedAt: '2026-09-14T01:00:00.000Z', stories: id === '1002' ? [
        { id: 'story-1002', title: places[1].name, audioTitle: '호수의 이야기', audioUrl: 'https://wave.test/persona-audio.mp3',
          script: '합성 공식 대본: 호수 곁에서 계절의 변화를 만납니다.', playTime: '120' },
      ] : [] } });
    }
    return route.fallback();
  });
  await page.route('https://wave.test/persona-audio.mp3', route => route.fulfill({ status: 503, body: '' }));
  await page.route('**/api/route?*', route => {
    const mode = new URL(route.request().url()).searchParams.get('mode') || 'transit';
    return route.fulfill({ json: { configured: true, alternatives: [{ id: 'synthetic-leg', label: '합성 조회 이동', provider: 'Synthetic route', mode,
      totalTime: 10, totalWalk: 200, transfers: 0, payment: 0, totalDistance: 1200, configured: true,
      segments: [{ type: 'walk', name: '합성 도보 구간', minutes: 10 }], geometry: [] }], providers: [],
      context: { nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] } } });
  });
  if (options.seeded) await page.addInitScript(({ values, keys }) => {
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values }));
    sessionStorage.setItem('wave-session-facilities-v1', JSON.stringify(keys));
  }, { values: seedValues, keys: facilities });
  await page.goto('/planner');
  const launcher = page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true });
  await expect(launcher).toBeEnabled();
  if (options.checkLauncher) {
    const avatar = launcher.locator('.naru-character img');
    await expect(avatar).toBeVisible();
    await expect.poll(() => avatar.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    const buttonSize = (await launcher.boundingBox())!, imageSize = (await avatar.boundingBox())!;
    expect(buttonSize.width).toBeCloseTo(64, 0); expect(buttonSize.height).toBeCloseTo(64, 0);
    // The 64px button is the touch target; its decorative image has a smaller mobile size.
    const expectedImageSize = page.viewportSize()!.width <= 767 ? 38 : 56;
    expect(imageSize.width).toBeCloseTo(expectedImageSize, 0); expect(imageSize.height).toBeCloseTo(expectedImageSize, 0);
  }
  if (options.seeded) {
    await expect.poll(() => planRequests.length).toBe(1);
    await expect(page.locator('.simple-searching')).toHaveCount(0);
    await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '1002']);
  }
  await launcher.click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return { chat, launcher, assistantRequests, planRequests, hoursRequests, audioRequests, errors,
    journeyCalls: () => journeyCalls, planCompleted: () => planCompleted };
}
async function send(chat: Locator, text: string) {
  await chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill(text);
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
}
const latestReply = (chat: Locator) => chat.locator('.naru-message.assistant > p').last();
const review = (chat: Locator) => chat.getByRole('region', { name: '변경한 일정의 운영시간 확인', exact: true });
const secondReview = (chat: Locator) => review(chat).getByRole('listitem').filter({ hasText: places[1].name });
async function question(chat: Locator, expected: RegExp) {
  await expect(latestReply(chat)).toContainText(expected);
  const text = await latestReply(chat).innerText();
  expect((text.match(/[?？]/g) || []).length).toBeLessThanOrEqual(1);
  await expect(chat.getByRole('group', { name: '한 가지씩 안내 선택', exact: true })).toBeVisible();
}

test('낮잠을 60분 넣으면 후속 운영시간 충돌을 대화에서 확인하고 날짜·시설·고정 방문까지 정확히 되돌린다', async ({ page }) => {
  const app = await setup(page, { seeded: true }), before = await snapshot(page);
  expect(app.hoursRequests).toEqual([]);
  await send(app.chat, '첫 번째 장소 뒤에 낮잠 60분 넣어줘');
  await expect.poll(async () => (await snapshot(page)).schedule.breakMinutesByPlaceId).toEqual({ '1001': 60 });
  expect(await snapshot(page)).toEqual({ ...before, schedule: { ...before.schedule,
    breakMinutesByPlaceId: { '1001': 60 }, restPurposeByPlaceId: { '1001': 'nap' } } });
  await expect(secondReview(app.chat)).toContainText('일정 조정 필요');
  await expect(secondReview(app.chat)).toContainText('합성 한국관광공사 원문');
  await expect(review(app.chat)).toContainText('당일 변경은 시설에 확인');
  await expect(app.chat.getByRole('button', { name: '되돌리기', exact: true }).last()).toBeEnabled();
  await app.chat.getByRole('button', { name: '되돌리기', exact: true }).last().click();
  await expect.poll(() => snapshot(page)).toEqual(before);
  await expect(review(app.chat)).toContainText('2곳 중 0곳 일정 조정 필요 · 0곳 정보 확인 필요');
  await expect(review(app.chat).locator('details')).not.toHaveAttribute('open', '');
  await review(app.chat).getByText('장소별 확인 내용', { exact: true }).click();
  await expect(secondReview(app.chat)).toContainText('등록된 운영시간 안에 방문');
  expect(app.hoursRequests.sort()).toEqual(['1001', '1002']);
  expect(app.assistantRequests).toEqual([]); expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('운영정보 제공처 실패는 미확인으로 남으며 명시 재조회만 실패한 장소를 다시 확인한다', async ({ page }) => {
  const failed = new Set(['1002']);
  const app = await setup(page, { seeded: true, failedHours: failed });
  await send(app.chat, '첫 번째 장소 뒤에 쉬는 시간을 60분 넣어줘');
  await expect(review(app.chat)).toContainText('2곳 중 0곳 일정 조정 필요 · 1곳 정보 확인 필요');
  await expect(review(app.chat).locator('details')).not.toHaveAttribute('open', '');
  await expect(review(app.chat).getByRole('button', { name: '미확인 운영시간 다시 확인', exact: true })).toBeVisible();
  await review(app.chat).getByText('장소별 확인 내용', { exact: true }).click();
  await expect(secondReview(app.chat)).toContainText('운영 정보를 불러오지 못했어요');
  await expect(secondReview(app.chat)).not.toContainText('등록된 운영시간 안에 방문');
  expect(app.hoursRequests.filter(id => id === '1002')).toHaveLength(1);
  const edited = await snapshot(page);
  failed.clear();
  await review(app.chat).getByRole('button', { name: '미확인 운영시간 다시 확인', exact: true }).click();
  await expect(secondReview(app.chat)).toContainText('일정 조정 필요');
  expect(app.hoursRequests.filter(id => id === '1001')).toHaveLength(1);
  expect(app.hoursRequests.filter(id => id === '1002')).toHaveLength(2);
  expect(await snapshot(page)).toEqual(edited);
  expect(app.assistantRequests).toEqual([]); expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('늦은 운영정보 응답은 이후의 더 짧은 휴식으로 재계산하며 오래된 마감 충돌을 복원하지 않는다', async ({ page }) => {
  const gate = deferred();
  const app = await setup(page, { seeded: true, hoursGate: gate });
  await send(app.chat, '첫 번째 장소 뒤에 쉬는 시간을 60분 넣어줘');
  await expect.poll(() => [...app.hoursRequests].sort()).toEqual(['1001', '1002']);
  await send(app.chat, '첫 번째 장소 뒤에 쉬는 시간을 15분으로 바꿔줘');
  await expect.poll(async () => (await snapshot(page)).schedule.breakMinutesByPlaceId).toEqual({ '1001': 15 });
  gate.release();
  await expect(review(app.chat)).toContainText('2곳 중 0곳 일정 조정 필요 · 0곳 정보 확인 필요');
  await review(app.chat).getByText('장소별 확인 내용', { exact: true }).click();
  await expect(secondReview(app.chat)).toContainText('등록된 운영시간 안에 방문');
  await expect(secondReview(app.chat)).not.toContainText('일정 조정 필요');
  expect(app.hoursRequests.sort()).toEqual(['1001', '1002']);
  expect(app.assistantRequests).toEqual([]); expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('두 번째 장소의 공식 대본을 소리 없이 열고 대본이 없는 다른 장소로 바꿔도 이전 해설을 남기지 않는다', async ({ page }) => {
  const app = await setup(page, { seeded: true }), before = await snapshot(page);
  expect(app.audioRequests).toEqual([]);
  await send(app.chat, '두 번째 장소의 해설 대본을 보여줘');
  const selector = app.chat.getByRole('combobox', { name: '살펴볼 장소', exact: true });
  await expect(selector).toHaveValue('1002');
  await expect(app.chat.getByText('합성 공식 대본: 호수 곁에서 계절의 변화를 만납니다.', { exact: true })).toBeVisible();
  expect(app.audioRequests).toEqual(['1002']);
  const audio = app.chat.locator('audio');
  await expect(audio).toHaveAttribute('preload', 'none');
  expect(await audio.evaluate(node => ({ autoplay: (node as HTMLMediaElement).autoplay, paused: (node as HTMLMediaElement).paused }))).toEqual({ autoplay: false, paused: true });
  expect(await page.evaluate(() => (window as unknown as { personaMediaPlayCount: number }).personaMediaPlayCount)).toBe(0);
  await selector.selectOption('1001');
  await expect(app.chat).toContainText('이 장소와 일치하는 오디 해설은 아직 확인하지 못했어요');
  await expect(app.chat.getByText('합성 공식 대본: 호수 곁에서 계절의 변화를 만납니다.', { exact: true })).toHaveCount(0);
  expect(app.audioRequests).toEqual(['1002', '1001']);
  await app.chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  await expect(app.chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true })).toBeFocused();
  expect(await snapshot(page)).toEqual(before);
  expect(app.assistantRequests).toEqual([]); expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('보이는 캐릭터로 시작해 한 번에 한 항목만 묻고 최종 확인 후 실제 결과를 글과 읽어주기로 확인한다', async ({ page }) => {
  const app = await setup(page, { checkLauncher: true }), before = await snapshot(page);
  await send(app.chat, '한 번에 하나씩 도와줘'); await question(app.chat, /어느 지역/);
  await send(app.chat, '창원'); await question(app.chat, /언제 여행/);
  expect(app.planRequests).toEqual([]); expect(await snapshot(page)).toEqual(before);
  await send(app.chat, '2026-02-30'); await question(app.chat, /연-월-일/);
  expect(app.planRequests).toEqual([]); expect(await snapshot(page)).toEqual(before);
  await send(app.chat, '2026-10-07 말고 다른 날'); await question(app.chat, /원하는 조건 하나/);
  await send(app.chat, '날짜 없이 찾아보기'); await question(app.chat, /꼭 필요한 시설/);
  await send(app.chat, '수유실은 필요 없어요'); await question(app.chat, /필요한 시설만/);
  expect(app.planRequests).toEqual([]); expect(await snapshot(page)).toEqual(before);
  await send(app.chat, '수유실'); await question(app.chat, /이 조건으로 여행지를 찾을까요/);
  await expect(latestReply(app.chat)).toContainText('날짜 없이 탐색');
  expect(app.planRequests).toEqual([]); expect(await snapshot(page)).toEqual(before);
  await send(app.chat, '네');
  await expect(app.chat.getByLabel('대화에서 찾은 여행지').last().locator('.naru-place-name')).toHaveText(places.map(place => place.name));
  expect(app.planRequests).toHaveLength(1);
  expect(app.planRequests[0].searchParams.get('region')).toBe('창원');
  expect(app.planRequests[0].searchParams.get('facilityKeys')).toBe('lactationroom');
  expect(app.planRequests[0].searchParams.get('themes')).toBe('');
  const after = await snapshot(page);
  expect(after.facilities).toEqual(['lactationroom']); expect(after.ids).toEqual([]);
  expect(after.schedule.travelStart).toBe(''); expect(after.schedule.travelEnd).toBe('');
  await app.chat.locator('.naru-message.assistant').last().getByRole('button', { name: '답변 읽어주기', exact: true }).click();
  const speech = await page.evaluate(() => (window as unknown as { personaSpeech: { spoken: string[]; cancelled: number } }).personaSpeech);
  expect(speech.spoken).toHaveLength(1);
  expect(speech.spoken[0]).toContain(`1번 창원 ${places[0].name}`);
  expect(speech.spoken[0]).toContain(`2번 창원 ${places[1].name}`);
  await app.chat.getByRole('button', { name: '읽기 중단', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { personaSpeech: { cancelled: number } }).personaSpeech.cancelled)).toBe(speech.cancelled + 1);
  expect(app.assistantRequests).toEqual([]); expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('새 단일 질문의 네 또는 취소는 이전 미적용 장소 삭제를 승인하지 않는다', async ({ page }) => {
  const app = await setup(page, { seeded: true, assistant: text => text.includes('삭제')
    ? { reply: '삭제 여부를 확인해 주세요.', proposal: { action: 'remove', placeId: '1001' } }
    : { reply: '어떤 내용을 도와드릴까요?', proposal: null } });
  const before = await snapshot(page);
  // No specific place is named, so the model's suggested deletion must await approval.
  await send(app.chat, '어느 장소를 삭제할지 추천해줘');
  await expect(app.chat.locator('.naru-change-button')).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
  await send(app.chat, '한 번에 하나씩 도와줘'); await question(app.chat, /어느 지역/);
  await send(app.chat, '네'); await question(app.chat, /지역 이름 하나/);
  expect(await snapshot(page)).toEqual(before);
  await send(app.chat, '취소');
  await expect(app.chat.getByRole('group', { name: '한 가지씩 안내 선택', exact: true })).toHaveCount(0);
  await expect(latestReply(app.chat)).toContainText('변경하지 않았어요');
  await send(app.chat, '네');
  await expect(latestReply(app.chat)).toContainText('어떤 내용을 도와드릴까요');
  expect(await snapshot(page)).toEqual(before);
  expect(app.assistantRequests).toEqual(['어느 장소를 삭제할지 추천해줘', '네']);
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('기존 일정의 날짜 변경을 안내로 답해도 방문과 필수 시설을 덮지 않고 명시적 날짜 편집으로 연결한다', async ({ page }) => {
  const app = await setup(page, { seeded: true }), before = await snapshot(page);
  const searches = app.planRequests.length;
  await send(app.chat, '한 번에 하나씩 도와줘'); await question(app.chat, /어느 지역/);
  await send(app.chat, '현재 지역 유지'); await question(app.chat, /언제 여행/);
  await send(app.chat, '2026-10-08'); await question(app.chat, /꼭 필요한 시설/);
  await send(app.chat, '현재 편의 유지'); await question(app.chat, /이 조건으로 여행지를 찾을까요/);
  await send(app.chat, '네');
  await expect(latestReply(app.chat)).toContainText('기존 여행을 보존');
  await expect(app.chat.locator('.naru-tool-host[data-tool="dates"]')).toBeVisible();
  await expect(app.chat.getByRole('group', { name: '한 가지씩 안내 선택', exact: true })).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before); expect(app.planRequests).toHaveLength(searches);
  expect(app.assistantRequests).toEqual([]); expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('한 가지씩 안내로 시작한 검색도 중단하면 늦은 결과를 대화에 붙이거나 일정에 반영하지 않는다', async ({ page }) => {
  const gate = deferred(), app = await setup(page, { planGate: gate });
  await send(app.chat, '한 번에 하나씩 도와줘'); await question(app.chat, /어느 지역/);
  await send(app.chat, '창원'); await question(app.chat, /언제 여행/);
  await send(app.chat, '날짜 없이 찾아보기'); await question(app.chat, /꼭 필요한 시설/);
  await send(app.chat, '수유실'); await question(app.chat, /이 조건으로 여행지를 찾을까요/);
  await send(app.chat, '네');
  await expect.poll(() => app.planRequests.length).toBe(1);
  await app.chat.getByRole('button', { name: '중단', exact: true }).click();
  await expect(latestReply(app.chat)).toContainText('답변을 중단했어요');
  const stopped = await snapshot(page);
  await app.chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill('중단 후 쓰던 새 질문');
  gate.release();
  await expect.poll(() => app.planCompleted()).toBe(true);
  // Let a released response reach React before asserting that it was discarded.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(app.chat.getByLabel('대화에서 찾은 여행지')).toHaveCount(0);
  await expect(app.chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true })).toHaveValue('중단 후 쓰던 새 질문');
  expect(await snapshot(page)).toEqual(stopped); expect(stopped.ids).toEqual([]);
  expect(app.assistantRequests).toEqual([]); expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('복수 시각 변경은 첫 시각을 적용하지 않고 모델 호출 없이 한 항목만 다시 묻는다', async ({ page }) => {
  const app = await setup(page, { seeded: true }), before = await snapshot(page);
  const searches = app.planRequests.length;
  for (const request of [
    '출발은 오전9시로 바꾸고 귀가는 오후6시로 정해줘',
    '출발 시간을 오전10시30분에서 오전11시로 바꿔줘',
  ]) {
    const replies = await app.chat.locator('.naru-message.assistant').count();
    await send(app.chat, request);
    await expect(app.chat.locator('.naru-message.assistant')).toHaveCount(replies + 1);
    await expect(latestReply(app.chat)).toContainText('출발 시각이나 귀가 마감 중 하나를 먼저 알려주세요');
    expect(((await latestReply(app.chat).innerText()).match(/[?？]/g) || []).length).toBeLessThanOrEqual(1);
    await expect(app.chat.locator('.naru-change-button, .naru-undo')).toHaveCount(0);
    expect(await snapshot(page)).toEqual(before);
    expect(app.assistantRequests).toEqual([]); expect(app.journeyCalls()).toBe(0);
    expect(app.hoursRequests).toEqual([]); expect(app.planRequests).toHaveLength(searches);
  }
  expect(app.errors).toEqual([]);
});

test('대화의 명확한 실행 취소는 모델 없이 낮잠 변경만 정확히 되돌리고 부정·질문·혼합 요청은 보존한다', async ({ page }) => {
  // Deliberately offer an unsafe model undo for non-direct requests: language
  // guards must protect the actual trip even when the model over-interprets it.
  const app = await setup(page, { seeded: true, assistant: () => ({
    reply: '합성 모델은 실행 취소를 제안합니다.', proposal: { action: 'undo' },
  }) });
  const before = await snapshot(page);
  const withNap = { ...before, schedule: { ...before.schedule,
    breakMinutesByPlaceId: { '1001': 30 }, restPurposeByPlaceId: { '1001': 'nap' } } };
  for (const request of ['되돌려줘', '실행 취소해줘']) {
    await send(app.chat, '첫 번째 장소 뒤에 낮잠 30분 넣어줘');
    await expect.poll(() => snapshot(page)).toEqual(withNap);
    const modelCalls = app.assistantRequests.length;
    const replies = await app.chat.locator('.naru-message.assistant').count();
    await send(app.chat, request);
    await expect(app.chat.locator('.naru-message.assistant')).toHaveCount(replies + 1);
    await expect(latestReply(app.chat)).toContainText('변경을 되돌렸어요');
    await expect.poll(() => snapshot(page)).toEqual(before);
    expect(app.assistantRequests).toHaveLength(modelCalls);
  }
  expect(app.assistantRequests).toEqual([]);

  await send(app.chat, '첫 번째 장소 뒤에 낮잠 30분 넣어줘');
  await expect.poll(() => snapshot(page)).toEqual(withNap);
  for (const request of [
    '되돌리지 마',
    '실행 취소할까요?',
    '되돌려줘 그리고 출발 시간도 오전11시로 바꿔줘',
    '되돌려줘 그리고 두 번째 장소도 삭제해줘',
  ]) {
    const replies = await app.chat.locator('.naru-message.assistant').count();
    const modelCalls = app.assistantRequests.length;
    await send(app.chat, request);
    await expect(app.chat.locator('.naru-message.assistant')).toHaveCount(replies + 1);
    await expect(app.chat.getByRole('button', { name: '중단', exact: true })).toHaveCount(0);
    if (request.includes('그리고')) {
      await expect(latestReply(app.chat)).toContainText('되돌리기와 다른 변경은 하나씩 처리할게요');
      expect(app.assistantRequests).toHaveLength(modelCalls);
    }
    expect(await snapshot(page), request).toEqual(withNap);
  }
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});
