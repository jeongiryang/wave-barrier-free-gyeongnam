import { expect, test, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
const questions: Record<string, string> = { conditions: '여행 지역과 활동을 고르는 화면을 열어줘', facilities: '필요한 편의 선택을 열어줘', dates: '날짜 설정을 열어줘', budget: '여행비 계획을 열어줘', map: '지도와 경로를 열어줘', weather: '날씨를 열어줘', compare: '이 장소들의 편의를 비교해줘', readiness: '출발 전 확인 화면을 열어줘', calendar: '캘린더 공유 메뉴를 열어줘', share: '공유 메뉴를 열어줘', comfort: '이동 부담과 휴식 설정을 열어줘', inquiry: '방문 전 문의를 열어줘' };
type Proposal = { action: string; [key: string]: unknown };
async function setup(page: Page, saved = false, resolve?: (text: string) => Proposal) {
  // Synthetic model/provider fixtures exercise the real conversation and planner state.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic conversation API' } }));
  await mockPlannerApi(page, { preserveView: true }); await mockPublicShellApi(page);
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const text = route.request().postDataJSON().messages.at(-1).content;
    const tool = Object.entries(questions).find(([, question]) => question === text)?.[0];
    return route.fulfill({ json: { reply: '요청한 기능을 열게요.', proposal: tool ? { action: 'tool', tool } : resolve?.(text) || { action: 'search' }, source: 'local-llm' } });
  });
  if (saved) await page.addInitScript(place => {
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: {
      'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001"]', 'wave-saved-place-catalog-v1': JSON.stringify([place]),
      'wave-trip-schedule-v1': JSON.stringify({ travelStart: '2026-09-20', travelEnd: '2026-09-21', dayStartTime: '09:30', travelMode: 'transit', scheduleAssignments: { '1001': '2026-09-20' } }),
    } }));
  }, plan.places[0]);
  await page.goto('/planner');
}
async function choose(page: Page) {
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await expect(page.getByRole('heading', { name: '경남도립미술관', exact: true })).toBeVisible();
}
async function openChat(page: Page) {
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible(); return chat;
}
async function send(chat: Locator, text: string) { const input = chat.getByRole('textbox'); await input.fill(text); await input.press('Enter'); }
async function tool(chat: Locator, id: string) { await send(chat, questions[id]); await expect(chat.locator('.naru-workspace')).toBeVisible(); }
async function conversation(chat: Locator) { await chat.getByRole('button', { name: '대화만 보기', exact: true }).click(); await expect(chat.getByRole('textbox')).toBeFocused(); }
async function tripChat(page: Page) { await setup(page, true); await expect(page.getByRole('heading', { name: '경남도립미술관', exact: true })).toBeVisible(); return openChat(page); }
async function ids(page: Page) { return page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values?.['wave-saved-places'] || '[]')); }
async function compare(chat: Locator, page: Page) {
  await tool(chat, 'compare');
  await chat.getByRole('button', { name: '이 장소 비교하기', exact: true }).first().click();
  await chat.getByRole('button', { name: '이 장소 비교하기', exact: true }).click();
  await chat.getByRole('button', { name: /선택한 2곳 비교/ }).click();
  return page.getByRole('dialog', { name: '편의를 나란히 살펴보세요.', exact: true });
}

test('나루에서 개별 편의·검색·장소 추가·문의 도구를 사용하고 키보드로 돌아온다', async ({ page }) => {
  await setup(page, false, () => ({ action: 'settings', region: '창원', profiles: ['restroom'], themes: ['nature'] }));
  const chat = await openChat(page);
  await send(chat, '창원에서 장애인 화장실이 있는 자연 여행지를 찾아줘');
  const found = chat.locator('.naru-result-list');
  await expect(found).toContainText('경남도립미술관');
  await expect(chat.locator('.naru-change-button')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]'))).toEqual(['restroom']);
  await found.getByRole('button', { name: '담기', exact: true }).first().click();
  await expect.poll(() => ids(page)).toEqual(['1001']);
  await expect(found.getByRole('button', { name: '✓ 담았음', exact: true })).toBeDisabled();
  await tool(chat, 'inquiry'); await expect(chat.locator('.naru-workspace')).toContainText('문의 카드 만들기');
  await conversation(chat);
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape'); await expect(chat).toBeHidden();
  await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('대화 작업 공간을 열고 닫아도 기존 비교 선택은 유지된다', async ({ page }) => {
  await setup(page); await choose(page);
  await page.getByRole('button', { name: '편의 비교', exact: true }).click();
  const selected = page.getByRole('article', { name: '경남도립미술관', exact: true }).getByRole('checkbox', { name: '비교', exact: true });
  await selected.check();
  const chat = await openChat(page); await tool(chat, 'conditions'); await expect(chat.locator('#conditions')).toBeVisible();
  await conversation(chat); await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(selected).toBeChecked();
});

test('필요한 시설을 먼저 골라도 활동·날짜를 강제하지 않고 탐색한다', async ({ page }) => {
  await setup(page);
  const requests: URL[] = []; page.on('request', request => { const url = new URL(request.url()); if (url.searchParams.get('action') === 'plan') requests.push(url); });
  await page.getByRole('button', { name: '필요한 편의', exact: true }).click();
  const picker = page.getByRole('dialog', { name: '필요한 편의', exact: true });
  await picker.getByRole('checkbox', { name: '장애인 화장실', exact: true }).check();
  await picker.getByRole('button', { name: /^적용/ }).click(); await choose(page);
  await expect(page.getByRole('group', { name: '하고 싶은 활동', exact: true }).locator('button[aria-pressed=true]')).toHaveCount(0);
  expect(requests.at(-1)?.searchParams.get('facilityKeys')).toBe('restroom'); expect(requests.at(-1)?.searchParams.get('themes') || '').toBe('');
  expect(await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values?.['wave-trip-schedule-v1'] || '{}').travelStart || '')).toBe('');
});

test('여행비 초안은 지도 도구로 다녀와도 유지된다', async ({ page }) => {
  const chat = await tripChat(page); await tool(chat, 'budget');
  const budget = chat.getByRole('region', { name: '여행비 계획', exact: true });
  await budget.getByLabel('목표 예산 (원)', { exact: true }).fill('87000');
  await conversation(chat); await tool(chat, 'map'); await expect(chat.locator('.simple-itinerary-map .leaflet-container')).toBeVisible();
  await conversation(chat); await tool(chat, 'budget'); await expect(budget.getByLabel('목표 예산 (원)', { exact: true })).toHaveValue('87000');
});

test('장소가 없는 도구는 필요한 선행 작업을 안내한다', async ({ page }) => {
  await setup(page); const chat = await openChat(page); await tool(chat, 'weather');
  await expect(chat.locator('.naru-workspace > header strong')).toHaveText('지역·활동'); await expect(chat.locator('#conditions')).toBeVisible();
  await conversation(chat); await expect(chat.getByRole('log')).toContainText('날씨는 일정에 장소를 담으면');
});

test('편의 비교에서 직접 담은 장소는 같은 일정에 적용되고 대화에서 되돌린다', async ({ page }) => {
  const chat = await tripChat(page), comparison = await compare(chat, page);
  await expect(comparison).toContainText('용지호수공원'); await comparison.getByRole('button', { name: '일정에 담기', exact: true }).click();
  await expect(comparison).toBeHidden(); await expect.poll(() => ids(page)).toEqual(['1001', '1002']);
  await chat.getByRole('button', { name: '되돌리기', exact: true }).click(); await expect.poll(() => ids(page)).toEqual(['1001']);
});

test('준비·캘린더·공유·휴식 요청은 실제 조작으로 이어지고 내보내기를 임의 실행하지 않는다', async ({ page }) => {
  const chat = await tripChat(page); let shared = 0, downloaded = 0;
  page.on('download', () => downloaded++);
  await page.route('**/api/trips', route => { shared++; return route.fulfill({ status: 201, json: { id: 'abcdef123456', url: '/trip/abcdef123456', revision: 1, expiresAt: Date.now() + 30 * 86400000 } }); });
  for (const [id, selector] of [['readiness', '.simple-readiness'], ['comfort', '.simple-day-options > summary']]) {
    await tool(chat, id); const target = chat.locator(selector); await expect(target).toBeVisible(); await expect(target).toBeFocused(); await conversation(chat);
  }
  for (const id of ['calendar', 'share']) {
    await tool(chat, id); const menu = page.getByRole('dialog', { name: '여행 공유', exact: true });
    await expect(menu.getByRole('button', { name: '캘린더', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: '공유 일정 보기', exact: true })).toHaveAttribute('href', /\/trip\/abcdef123456$/);
    await menu.getByRole('button', { name: '공유 닫기', exact: true }).click(); await conversation(chat);
  }
  expect(shared).toBe(1); expect(downloaded).toBe(0);
});

test('공유한 도구 안에서 Escape를 눌러도 나루를 닫고 시작 버튼으로 돌아온다', async ({ page }) => {
  const chat = await tripChat(page); await tool(chat, 'budget'); await chat.getByLabel('목표 예산 (원)', { exact: true }).fill('95000'); await page.keyboard.press('Escape');
  await expect(chat).toBeHidden(); await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true })).toBeFocused();
});

test('개발용 언어 설정과 무관하게 나루가 실제 휴식 설정으로 이동한다', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('wave-dev-presentation', 'enabled'); localStorage.setItem('wave-locale', 'en'); });
  const chat = await tripChat(page); await tool(chat, 'comfort'); const summary = chat.locator('.simple-day-options > summary');
  await expect(summary).toBeVisible(); await expect(summary).toBeFocused();
  await expect(chat.locator('.trip-comfort-plan > summary')).toBeVisible();
});

test('담기 전 대안 요청에는 필요한 작업과 후보 비교를 안내한다', async ({ page }) => {
  await setup(page, false, () => ({ action: 'alternatives', placeId: '1001' })); await choose(page);
  const chat = await openChat(page); await send(chat, '경남도립미술관 대신 갈 곳을 비교해줘');
  await expect(chat.locator('.naru-workspace > header strong')).toHaveText('편의 비교'); await conversation(chat);
  await expect(chat.getByRole('log')).toContainText('먼저 이 장소를 일정에 담아주세요'); expect(await ids(page)).toEqual([]);
});

for (const status of [429, 503]) test(`AI ${status} 응답 뒤 질문을 다시 보낼 수 있고 새 초안은 덮어쓰지 않는다`, async ({ page }) => {
  await setup(page); let calls = 0, release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/assistant', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } }); calls++; if (calls === 2) await gate;
    await route.fulfill({ status, json: { error: 'temporarily unavailable' } });
  });
  const chat = await openChat(page), input = chat.getByRole('textbox');
  try {
    await send(chat, '마음을 편하게 쉬는 여행을 생각하고 있어요'); await expect(input).toHaveValue('마음을 편하게 쉬는 여행을 생각하고 있어요');
    await input.press('Enter'); await expect.poll(() => calls).toBe(2); await expect(chat.locator('.naru-typing .wave-spinner')).toBeVisible();
    await input.fill('새로 작성하고 있는 질문'); release(); await expect(chat.locator('.naru-typing')).toBeHidden(); await expect(input).toHaveValue('새로 작성하고 있는 질문');
    await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click(); await page.getByRole('button', { name: '필요한 편의', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '필요한 편의', exact: true }).getByRole('checkbox', { name: '승강기', exact: true })).toBeEnabled();
  } finally { release(); }
});

test('AI의 비교 제안은 실제 후보와 편의 비교표로 연결된다', async ({ page }) => {
  await setup(page); await choose(page); const chat = await openChat(page), comparison = await compare(chat, page);
  await expect(comparison).toContainText('경남도립미술관'); await expect(comparison).toContainText('용지호수공원'); await expect(comparison.getByRole('table')).toBeVisible(); expect(await ids(page)).toEqual([]);
});
