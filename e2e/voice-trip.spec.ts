import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPublicShellApi, mockPlannerApi, openItinerary } from './fixtures';
import { alternativePlan } from './alternative-fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
const facilities = ['restroom'];
const places = alternativePlan.places.filter(place => place.id !== '1005').map(place => ({ ...place, image: '' }));
const initialSchedule = {
  travelStart: '2026-10-08', travelEnd: '2026-10-09', dayStartTime: '10:00', travelMode: 'transit',
  scheduleAssignments: { '1001': '2026-10-08', '1002': '2026-10-08' }, visitMinutesByPlaceId: { '1002': 45 },
  breakMinutesByPlaceId: { '1002': 15 }, restPurposeByPlaceId: { '1002': 'rest' }, fixedVisits: {}, dayDeadlines: {},
  comfort: { maxWalkMinutes: null, breakEveryMinutes: null, breakMinutes: 15 },
};
const panel = (page: Page) => page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
const launcher = (page: Page) => page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true });
const input = (page: Page) => panel(page).getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
const latestReply = (page: Page) => panel(page).locator('.naru-message.assistant > p').last();
async function command(page: Page, text: string) {
  await input(page).fill(text);
  await panel(page).getByRole('button', { name: '나루에게 보내기', exact: true }).click();
}
async function closeChat(page: Page) { await panel(page).getByRole('button', { name: '나루 대화 닫기', exact: true }).click(); }
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    return { ids: JSON.parse(values['wave-saved-places'] || '[]') as string[],
      schedule: JSON.parse(values['wave-trip-schedule-v1'] || '{}'), order: JSON.parse(values['wave-trip-order-v1'] || '{}'),
      region: values['wave-planner-region-v1'], themes: JSON.parse(values['wave-trip-themes-v1'] || '[]'),
      facilities: JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]') };
  });
}
async function setup(page: Page, auto = false) {
  // These are browser lifecycle regressions with synthetic model/provider data.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic voice API' } }));
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true, savedPlaces: places });
  const requests: string[] = [], errors: string[] = [];
  let journeyCalls = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/wave?action=plan*', route => route.fulfill({ json: { ...alternativePlan, mode: 'live',
    criteria: { facilityKeys: facilities }, places, explorationPlaces: [],
    statuses: alternativePlan.statuses.map(status => ({ ...status, state: 'live' })) } }));
  await page.route('**/api/assistant/journey', route => {
    journeyCalls++; return route.fulfill({ status: 500, json: { error: 'A single place edit must not replace the journey' } });
  });
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const text = route.request().postDataJSON().messages.at(-1).content as string;
    requests.push(text);
    const named = places.find(place => text.includes(place.name));
    const proposal = text === '어느 장소를 더 담을지 추천해줘' ? { action: 'add', placeId: '1003' }
      : text === '다음 장소 보여줘' ? { action: 'next' }
      : named && /담|추가/.test(text) ? { action: 'add', placeId: named.id }
      : named && /빼|삭제/.test(text) ? { action: 'remove', placeId: named.id } : null;
    return route.fulfill({ json: { reply: '합성 모델 응답: 요청한 한 가지 작업을 확인했어요.', proposal } });
  });
  await page.addInitScript(({ auto, places, schedule, keys }) => {
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: {
      'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001","1002"]',
      'wave-saved-place-catalog-v1': JSON.stringify(places),
      'wave-trip-order-v1': JSON.stringify({ mode: auto ? 'auto' : 'manual', ids: auto ? ['1002', '1001'] : ['1001', '1002'] }),
      'wave-trip-schedule-v1': JSON.stringify(schedule),
    } }));
    sessionStorage.setItem('wave-session-facilities-v1', JSON.stringify(keys));
  }, { auto, places, schedule: initialSchedule, keys: facilities });
  await page.goto('/planner');
  await expect(page.getByRole('heading', { name: '시민문화쉼터', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '시민문화쉼터 일정에 담기', exact: true })).toBeEnabled();
  await openItinerary(page);
  await expect(page.locator('.simple-stops > li')).toHaveCount(2);
  await launcher(page).click(); await expect(panel(page)).toBeVisible();
  return { requests, errors, journeyCalls: () => journeyCalls };
}
async function undoReceipt(page: Page, undo: Locator, before: Awaited<ReturnType<typeof snapshot>>) {
  await expect(undo).toBeEnabled(); await undo.click();
  await expect(latestReply(page)).toContainText('변경을 되돌렸어요');
  await expect.poll(() => snapshot(page)).toEqual(before);
}

test('typed Naru add/remove and shared undo preserve the original date, order, duration and rest', async ({ page }, info) => {
  const app = await setup(page), before = await snapshot(page);
  await command(page, '어느 장소를 더 담을지 추천해줘');
  await expect(panel(page).getByRole('button', { name: '시민문화쉼터 일정에 담기', exact: true })).toBeEnabled();
  expect(await snapshot(page)).toEqual(before);
  await command(page, '이 작업 취소해줘');
  await expect(panel(page).locator('.naru-change-button')).toHaveCount(0);
  await expect(input(page)).toBeFocused(); expect(await snapshot(page)).toEqual(before);
  await command(page, '시민문화쉼터 담아줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '1002', '1003']);
  expect((await snapshot(page)).schedule.scheduleAssignments['1003']).toBe('2026-10-08');
  await undoReceipt(page, panel(page).locator('.naru-undo').last(), before);
  await command(page, '용지호수공원 빼줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001']);
  expect((await snapshot(page)).schedule.breakMinutesByPlaceId).toEqual({});
  await undoReceipt(page, panel(page).locator('.naru-undo').last(), before);
  for (const width of info.project.name.includes('desktop') ? [1440, 960] : [390, 320]) {
    await page.setViewportSize({ width, height: 960 }); await expect(panel(page)).toBeVisible();
    await page.screenshot({ path: info.outputPath(`naru-command-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
  }
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

type VoiceDouble = { start: () => void; stop: () => void; abort: () => void; onstart: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null; lang?: string; continuous?: boolean; interimResults?: boolean };
type VoiceWindow = { SpeechRecognition?: new () => VoiceDouble; webkitSpeechRecognition?: new () => VoiceDouble;
  voiceDoubles: VoiceDouble[]; voiceStarts: number; voiceAborts: number; lateVoiceResult?: VoiceDouble['onresult'] };
test('Naru microphone is opt-in; final speech stays an unsent draft and cancel, close, denial and unsupported recognition preserve the trip', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as VoiceWindow;
    target.voiceDoubles = []; target.voiceStarts = 0; target.voiceAborts = 0;
    target.SpeechRecognition = class {
      onstart: VoiceDouble['onstart'] = null; onresult: VoiceDouble['onresult'] = null; onerror: VoiceDouble['onerror'] = null;
      constructor() { target.voiceDoubles.push(this); }
      start() { target.voiceStarts++; this.onstart?.(); } stop() {} abort() { target.voiceAborts++; }
    };
    target.webkitSpeechRecognition = undefined;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
  });
  const app = await setup(page), before = await snapshot(page);
  const mic = panel(page).getByRole('button', { name: '음성으로 질문 입력', exact: true });
  expect(await page.evaluate(() => (window as unknown as VoiceWindow).voiceStarts)).toBe(0);
  await mic.click();
  expect(await page.evaluate(() => { const h = window as unknown as VoiceWindow; const r = h.voiceDoubles[0];
    return { starts: h.voiceStarts, lang: r.lang, continuous: r.continuous, interim: r.interimResults }; }))
    .toEqual({ starts: 1, lang: 'ko-KR', continuous: false, interim: true });
  await page.evaluate(() => (window as unknown as VoiceWindow).voiceDoubles[0].onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: '시민문화쉼터 담아줘' } }] }));
  await expect(input(page)).toHaveValue('시민문화쉼터 담아줘'); await expect(input(page)).toBeFocused();
  await expect(panel(page).locator('.simple-voice-meter')).toHaveCount(0);
  expect(app.requests).toEqual([]); expect(await snapshot(page)).toEqual(before);
  for (const close of [false, true]) {
    await mic.click();
    await page.evaluate(() => { const h = window as unknown as VoiceWindow; h.lateVoiceResult = h.voiceDoubles.at(-1)?.onresult; });
    const aborts = await page.evaluate(() => (window as unknown as VoiceWindow).voiceAborts);
    if (close) await closeChat(page);
    else await panel(page).locator('.simple-voice-meter').getByRole('button', { name: '취소', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as VoiceWindow).voiceAborts)).toBe(aborts + 1);
    await page.evaluate(() => (window as unknown as VoiceWindow).lateVoiceResult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: '용지호수공원 빼줘' } }] }));
    if (close) await launcher(page).click();
    await expect(input(page)).toHaveValue('시민문화쉼터 담아줘');
    expect(app.requests).toEqual([]); expect(await snapshot(page)).toEqual(before);
  }
  await mic.click();
  await page.evaluate(() => (window as unknown as VoiceWindow).voiceDoubles.at(-1)?.onerror?.({ error: 'not-allowed' }));
  await expect(panel(page)).toContainText('마이크 사용을 허용해 주세요'); await expect(input(page)).toBeEnabled();
  await page.evaluate(() => { const h = window as unknown as VoiceWindow; h.SpeechRecognition = undefined; h.webkitSpeechRecognition = undefined; });
  await mic.click(); await expect(panel(page)).toContainText('지원하지 않아요');
  await command(page, '모두 삭제하고 친구에게 보내줘');
  await expect(latestReply(page)).toContainText('합성 모델 응답');
  await expect(panel(page).locator('.naru-change-button')).toHaveCount(0); expect(await snapshot(page)).toEqual(before);
  // Typing still executes only after the explicit send, using the same receipt.
  await command(page, '시민문화쉼터 담아줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '1002', '1003']);
  await undoReceipt(page, panel(page).locator('.naru-undo').last(), before);
  expect(app.requests).toEqual(['모두 삭제하고 친구에게 보내줘', '시민문화쉼터 담아줘']);
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('an actual visit-date edit invalidates an older Naru proposal and a later manual edit protects the trip from that earlier undo', async ({ page }) => {
  const app = await setup(page);
  await command(page, '어느 장소를 더 담을지 추천해줘');
  await expect(panel(page).locator('.naru-change-button')).toBeEnabled();
  await closeChat(page);
  await page.getByRole('button', { name: '용지호수공원 일정 수정', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '용지호수공원 수정', exact: true });
  await editor.getByRole('combobox', { name: '방문 날짜', exact: true }).selectOption('2026-10-09');
  await editor.getByRole('button', { name: '적용', exact: true }).click();
  const dateChanged = await snapshot(page);
  expect(dateChanged.schedule.scheduleAssignments['1002']).toBe('2026-10-09');
  await page.getByRole('group', { name: '일정 날짜', exact: true }).getByRole('button', { name: /^2일차/ }).click();
  await launcher(page).click();
  await expect(panel(page).locator('.naru-change-button')).toBeDisabled();
  await expect(panel(page).locator('.naru-change-button')).toContainText('일정이 바뀌었어요');
  expect(await snapshot(page)).toEqual(dateChanged);
  await command(page, '시민문화쉼터 담아줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '1002', '1003']);
  expect((await snapshot(page)).schedule.scheduleAssignments['1003']).toBe('2026-10-09');
  const olderUndo = panel(page).locator('.naru-undo').last(); await expect(olderUndo).toBeEnabled();
  await closeChat(page);
  await page.getByRole('group', { name: '일정 날짜', exact: true }).getByRole('button', { name: /^1일차/ }).click();
  await page.getByRole('button', { name: '경남도립미술관 일정 수정', exact: true }).click();
  const manual = page.getByRole('dialog', { name: '경남도립미술관 수정', exact: true });
  await manual.getByRole('combobox', { name: '경남도립미술관 머무는 시간', exact: true }).selectOption('120');
  await manual.getByRole('button', { name: '적용', exact: true }).click();
  const changed = await snapshot(page);
  expect(changed.ids).toContain('1003'); expect(changed.schedule.visitMinutesByPlaceId['1001']).toBe(120);
  await launcher(page).click(); await expect(olderUndo).toBeDisabled();
  expect(await snapshot(page)).toEqual(changed);
  await command(page, '다음 장소 보여줘');
  const details = page.getByRole('dialog', { name: '경남도립미술관', exact: true });
  await expect(details).toBeVisible(); await page.keyboard.press('Escape');
  await expect(input(page)).toBeFocused(); expect(await snapshot(page)).toEqual(changed);
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('Naru undo restores a removed first place and inactive manual order while automatic order was selected', async ({ page }) => {
  const app = await setup(page, true), before = await snapshot(page);
  expect(before.order).toEqual({ mode: 'auto', ids: ['1002', '1001'] });
  await command(page, '경남도립미술관 빼줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1002']);
  await undoReceipt(page, panel(page).locator('.naru-undo').last(), before);
  await command(page, '시민문화쉼터 담아줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '1002', '1003']);
  await undoReceipt(page, panel(page).locator('.naru-undo').last(), before);
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});

test('failed Naru command and undo storage writes preserve both the visible trip and the complete stored schedule', async ({ page }) => {
  const app = await setup(page), before = await snapshot(page);
  await page.evaluate(() => {
    const native = Storage.prototype.setItem;
    (window as unknown as { failTripWrites: boolean }).failTripWrites = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'wave-current-trip-v1' && (window as unknown as { failTripWrites: boolean }).failTripWrites)
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      native.call(this, key, value);
    };
  });
  await command(page, '시민문화쉼터 담아줘');
  await expect(latestReply(page)).toContainText('변경 내용을 저장하지 못했어요');
  expect(await snapshot(page)).toEqual(before);
  await expect(page.locator('.simple-stops > li')).toHaveCount(2);
  await expect(panel(page).locator('.naru-undo')).toHaveCount(0);
  await page.evaluate(() => { (window as unknown as { failTripWrites: boolean }).failTripWrites = false; });
  await command(page, '시민문화쉼터 담아줘');
  await expect.poll(async () => (await snapshot(page)).ids).toEqual(['1001', '1002', '1003']);
  const added = await snapshot(page), undo = panel(page).locator('.naru-undo').last();
  await page.evaluate(() => { (window as unknown as { failTripWrites: boolean }).failTripWrites = true; });
  await undo.click();
  await expect(latestReply(page)).toContainText('되돌리지 못했어요');
  expect(await snapshot(page)).toEqual(added);
  await expect(page.locator('.simple-stops > li')).toHaveCount(3); await expect(undo).toBeEnabled();
  await page.evaluate(() => { (window as unknown as { failTripWrites: boolean }).failTripWrites = false; });
  await undoReceipt(page, undo, before);
  expect(app.journeyCalls()).toBe(0); expect(app.errors).toEqual([]);
});
