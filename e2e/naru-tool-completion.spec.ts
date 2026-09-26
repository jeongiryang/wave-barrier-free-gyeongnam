import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';
import { naruDialog } from './naru-tool-fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
const draft = '도구를 확인한 뒤 이어 쓸 여행 질문';
async function setup(page: Page, beforeNavigate?: () => Promise<void>) {
  const unexpected: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return route.abort();
    if (url.pathname.startsWith('/api/')) { unexpected.push(url.pathname); return route.fulfill({ status: 503, json: { error: 'Synthetic provider unavailable' } }); }
    return route.continue();
  });
  await mockPublicShellApi(page); await mockPlannerApi(page, { preserveView: true, savedPlaces: plan.places });
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: false } }));
  await page.addInitScript(places => {
    const playback = window as Window & { naruToolAudioPlays?: number };
    playback.naruToolAudioPlays = 0;
    HTMLMediaElement.prototype.play = async function () { playback.naruToolAudioPlays!++; };
    localStorage.setItem('wave-naru-starter-v1', 'done');
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: {
      'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001","1002"]',
      'wave-saved-place-catalog-v1': JSON.stringify(places), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001","1002"]}',
      'wave-trip-schedule-v1': JSON.stringify({ travelStart: '2026-10-14', travelEnd: '2026-10-14', dayStartTime: '09:00', travelMode: 'car', scheduleAssignments: {}, fixedVisits: {}, dayDeadlines: {}, comfort: { maxWalkMinutes: 15, breakEveryMinutes: 60, breakMinutes: 15 } }),
    } }));
  }, plan.places.map(place => ({ ...place, image: '' })));
  await beforeNavigate?.();
  await page.goto('/planner');
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  await naruDialog(page).getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill(draft);
  return unexpected;
}
async function choose(page: Page, label: string) {
  const chat = naruDialog(page);
  await chat.getByRole('tab', { name: '여행 도구', exact: true }).click();
  await chat.locator('.naru-tool-catalog .naru-tools').getByRole('button', { name: label, exact: true }).click();
  await expect(chat).toBeHidden();
}
async function back(page: Page) {
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = naruDialog(page);
  await chat.getByRole('tab', { name: '대화', exact: true }).click();
  await expect(chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true })).toHaveValue(draft);
}
const schedule = (page: Page) => page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('wave-current-trip-v1')!).values['wave-trip-schedule-v1']));

test('Naru save tool focuses the real save action when the pending session resolves', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let sessionRequested = false;
  await setup(page, async () => {
    await page.route('**/api/auth/get-session', async route => {
      sessionRequested = true;
      await pending;
      await route.fulfill({ json: null }).catch(() => {});
    });
  });
  try {
    const before = await schedule(page);
    await choose(page, '내 여행에 저장');
    const save = page.locator('[data-planner-tool="save"] > button');
    await expect.poll(() => sessionRequested).toBe(true);
    await expect(save).toBeDisabled();
    // Let the tool mount and its first focus attempt finish before auth changes
    // only the native disabled attribute (no new tool DOM is required).
    await page.waitForTimeout(300);
    release();
    await expect(save).toBeEnabled();
    await expect(save).toBeFocused();
    await save.press('Enter');
    const timing = page.getByRole('dialog', { name: '저장·공유 전 일정 확인', exact: true });
    if (await timing.isVisible()) await timing.getByRole('button', { name: '확인하고 계속', exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wave-travel-book-v1') || '[]').length)).toBe(1);
    await back(page);
    expect(await schedule(page)).toEqual(before);
  } finally { release(); }
});

test('Naru region, facilities and places tools perform real condition actions and return with the unsent draft', async ({ page }) => {
  await setup(page);
  const before = await schedule(page);
  await choose(page, '지역·활동');
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '역사·문화', exact: true }).click();
  await expect(page.getByRole('button', { name: '역사·문화', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await back(page); await choose(page, '필요한 편의');
  await expect(page.locator('.simple-facility-trigger')).toBeFocused();
  await page.locator('.simple-facility-trigger').click();
  const facilities = page.getByRole('dialog', { name: '필요한 편의', exact: true });
  await facilities.getByRole('checkbox', { name: '접근로', exact: true }).check();
  await facilities.getByRole('button', { name: /^적용/ }).click();
  await page.locator('.simple-facility-trigger').click();
  await expect(facilities.getByRole('checkbox', { name: '접근로', exact: true })).toBeChecked();
  await page.keyboard.press('Escape');
  await back(page); await choose(page, '여행지 찾기');
  await expect(page.locator('#places')).toBeFocused();
  await page.locator('.simple-place-row h3 button').first().click();
  const detail = page.locator('dialog.place-modal');
  await expect(detail).toContainText('경남도립미술관');
  await detail.getByRole('button', { name: '닫기', exact: true }).click();
  await back(page); expect(await schedule(page)).toEqual(before);
});

test('Naru dates and itinerary tools commit explicit edits to the shared schedule and preserve the draft on return', async ({ page }) => {
  await setup(page); await choose(page, '날짜·기간');
  const settingsButton = page.getByRole('button', { name: '여행 설정', exact: true });
  await expect(settingsButton).toBeFocused(); await settingsButton.click();
  const settings = page.getByRole('dialog', { name: '여행 설정', exact: true });
  await settings.getByLabel('하루 시작', { exact: true }).fill('10:00');
  await settings.getByRole('button', { name: '적용', exact: true }).click();
  await expect.poll(async () => (await schedule(page)).dayStartTime).toBe('10:00');
  await back(page); await choose(page, '날짜·순서·시간');
  await expect(page.locator('#itinerary')).toBeFocused();
  await page.getByRole('button', { name: '경남도립미술관 일정 수정', exact: true }).click();
  const edit = page.getByRole('dialog', { name: '경남도립미술관 수정', exact: true });
  await edit.getByRole('combobox', { name: '경남도립미술관 머무는 시간', exact: true }).selectOption('120');
  await edit.getByRole('button', { name: '적용', exact: true }).click();
  await expect.poll(async () => (await schedule(page)).visitMinutesByPlaceId['1001']).toBe(120);
  await back(page); expect((await schedule(page)).travelStart).toBe('2026-10-14');
});

for (const tool of ['주차·입구 미리보기', '방문 전 문의', '해설 대본']) test(`Naru ${tool} reaches a selected place, completes its action and returns without changing the trip`, async ({ page }) => {
  await setup(page);
  await page.route('**/api/wave?action=place-audio*', route => route.fulfill({ json: { stories: [{ playTime: '', id: 'qa-story', audioTitle: '미술관 검증 해설', script: '합성 원문: 미술관의 전시를 차분히 살펴보세요.', audioUrl: 'https://wave.test/tool-guide.mp3', title: '미술관' }], checkedAt: '2026-09-27T00:00:00Z' } }));
  const before = await schedule(page);
  await choose(page, tool); await expect(page.locator('#places')).toBeFocused();
  await page.locator('.simple-place-row h3 button').first().click();
  const detail = page.locator('dialog.place-modal'); await expect(detail).toBeVisible();
  if (tool === '해설 대본') {
    await detail.locator('.place-audio-guide > summary').click();
    await detail.getByRole('button', { name: '대본 읽기', exact: true }).click();
    await expect(detail.getByRole('region', { name: '미술관 검증 해설 전체 대본', exact: true })).toHaveText('합성 원문: 미술관의 전시를 차분히 살펴보세요.');
    expect(await page.evaluate(() => (window as Window & { naruToolAudioPlays?: number }).naruToolAudioPlays)).toBe(0);
  } else {
    await detail.locator('summary').filter({ hasText: /^주차·입구·시설 미리보기$/ }).click();
    if (tool === '주차·입구 미리보기') {
      await detail.getByRole('button', { name: '2. 입구', exact: true }).click();
      await detail.getByRole('checkbox', { name: '입구 자료를 살펴봤어요', exact: true }).check();
      await expect(detail.getByRole('checkbox', { name: '입구 자료를 살펴봤어요', exact: true })).toBeChecked();
      await expect(detail.locator('.place-arrival-preview')).toContainText('이 장소의 입구 상세 정보는 아직 확인하지 못했어요.');
      await expect(detail.locator('.place-arrival-preview')).toContainText('직접 읽은 기록이며 시설 이용 가능을 확인한 표시는 아닙니다.');
    } else {
      await detail.getByRole('button', { name: '3. 시설', exact: true }).click();
      await detail.getByRole('button', { name: '문의 카드 만들기', exact: true }).first().click();
      const inquiry = page.locator('dialog.inquiry-dialog');
      await inquiry.getByLabel('추가로 전하고 싶은 말', { exact: true }).fill('방문 전에 출입구 문폭을 확인하고 싶어요.');
      await expect(inquiry.locator('.inquiry-card-preview')).toContainText('방문 전에 출입구 문폭을 확인하고 싶어요.');
      await inquiry.getByRole('button', { name: '문의 카드 닫기', exact: true }).click();
    }
  }
  await detail.getByRole('button', { name: '닫기', exact: true }).click();
  await back(page); expect(await schedule(page)).toEqual(before);
});

test('Naru map tool exposes the existing saved route and returns without silently changing transport or schedule', async ({ page }) => {
  await setup(page); const before = await schedule(page);
  await choose(page, '지도·경로');
  await expect(page.locator('#navigation')).toBeVisible();
  await expect(page.locator('#navigation')).toBeFocused();
  await expect(page.locator('.route-map-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: '기본 지도 다시 연결', exact: true })).toBeVisible();
  await back(page); expect(await schedule(page)).toEqual(before);
});

test('Naru coordinate recovery explains when all saved locations already exist without requesting a lookup', async ({ page }) => {
  await setup(page); const before = await schedule(page); let lookups = 0;
  await page.route('**/api/wave?action=place-coordinates*', route => { lookups++; return route.fulfill({ status: 500, json: { error: 'Unnecessary coordinate lookup' } }); });
  const chat = naruDialog(page);
  await chat.getByRole('tab', { name: '여행 도구', exact: true }).click();
  await chat.locator('.naru-tool-catalog .naru-tools').getByRole('button', { name: '장소 좌표 복원', exact: true }).click();
  const recovery = chat.getByRole('region', { name: '저장 장소 위치 재확인', exact: true });
  await expect(recovery).toBeFocused();
  await expect(recovery).toContainText('담은 장소의 위치가 모두 있어요. 추가로 복원할 위치가 없습니다.');
  await expect(recovery).toContainText('편의시설이나 이동 경로의 접근성');
  await expect(recovery.getByRole('button', { name: '장소 위치 다시 확인', exact: true })).toHaveCount(0);
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('tab', { name: '대화', exact: true }).click();
  await expect(chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true })).toHaveValue(draft);
  expect(lookups).toBe(0); expect(await schedule(page)).toEqual(before);
});
