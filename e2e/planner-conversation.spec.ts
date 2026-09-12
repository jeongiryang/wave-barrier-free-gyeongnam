import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, chooseTripConditions } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

test('나루에서 조건·검색·장소 추가·문의 도구를 사용하고 키보드로 돌아온다', async ({ page }) => {
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.route('**/api/assistant', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const input = route.request().postDataJSON().messages.at(-1).content;
    const proposal = input.includes('창원') ? { action: 'settings', region: '창원', profiles: ['wheel'], themes: ['nature'] } : { action: 'search' };
    await route.fulfill({ json: { reply: '아래 내용을 확인해 주세요.', proposal, source: 'local-llm' } });
  });
  await page.goto('/planner');
  const launcher = page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true });
  await launcher.click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  await chat.getByRole('textbox').fill('창원에서 휠체어로 자연을 보고 싶어요');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await chat.getByRole('button', { name: '확인하고 적용', exact: true }).click();
  await expect(chat.getByRole('button', { name: '확인한 작업', exact: true })).toBeFocused();
  await expect(chat).toContainText('여행 조건을 반영했어요');
  await chat.getByRole('textbox').fill('이 조건으로 여행지를 찾아줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await chat.getByRole('button', { name: '열기 / 실행', exact: true }).click();
  const found = chat.locator('.naru-result-list');
  await expect(found).toContainText('경남도립미술관');
  await found.getByRole('button', { name: '일정에 담기', exact: true }).first().click();
  await chat.getByRole('button', { name: '확인하고 적용', exact: true }).click();
  await expect(found.getByRole('button', { name: '일정에 담았어요', exact: true })).toBeDisabled();
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '방문 전 문의', exact: true }).click();
  await expect(chat.locator('.naru-workspace')).toContainText('문의 카드 만들기');
  await chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(launcher).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('대화 작업 공간을 열고 닫아도 기존 비교 선택은 유지된다', async ({ page }) => {
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.goto('/planner');
  await chooseTripConditions(page);
  await page.getByRole('button', { name: '편의 비교', exact: true }).click();
  await page.getByRole('button', { name: '경남도립미술관 편의 비교 선택', exact: true }).click();
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '날짜·기간', exact: true }).click();
  await expect(chat.locator('#conditions')).toBeVisible();
  await chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await page.getByRole('navigation', { name: '여행 만들기 단계', exact: true }).getByRole('button', { name: /여행지 찾기/ }).click();
  await expect(page.getByRole('button', { name: '경남도립미술관 비교에서 빼기', exact: true })).toBeVisible();
});

test('필요한 편의를 먼저 고를 수 있고 아무 활동이나 살펴볼 수 있다', async ({ page }) => {
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.goto('/planner');
  await page.getByRole('navigation', { name: '여행 만들기 단계', exact: true }).getByRole('button', { name: /필요한 편의/ }).click();
  await expect(page.getByRole('group', { name: '여행 편의 조건 선택' })).toBeVisible();
  await page.getByRole('group', { name: '여행 편의 조건 선택' }).getByRole('button', { name: /휠체어 편의시설/ }).click();
  await page.getByRole('navigation', { name: '여행 만들기 단계', exact: true }).getByRole('button', { name: /여행 조건/ }).click();
  await page.getByRole('button', { name: '창원 지역 선택', exact: true }).click();
  await page.getByRole('button', { name: '아직 못 정했어요 · 모두 살펴보기', exact: true }).click();
  await expect(page.locator('.theme-grid button[aria-pressed=true]')).toHaveCount(4);
});

async function tripChat(page: Page) {
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: false } }));
  await page.goto('/planner');
  await chooseTripConditions(page);
  await page.getByRole('button', { name: '경남도립미술관 일정에 추가', exact: true }).click();
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  return page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
}

test('여행비 초안은 지도 도구로 다녀와도 유지된다', async ({ page }) => {
  const chat = await tripChat(page);
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '여행비', exact: true }).click();
  const budget = chat.getByRole('region', { name: '여행비 계획', exact: true });
  await budget.getByLabel('목표 예산 (원)', { exact: true }).fill('87000');
  await chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '지도·경로', exact: true }).click();
  await expect(chat.locator('.reference-view-tabs button[aria-pressed=true]')).toHaveText('지도 함께 보기');
  await chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '여행비', exact: true }).click();
  await expect(budget.getByLabel('목표 예산 (원)', { exact: true })).toHaveValue('87000');
});

test('장소가 없는 도구는 필요한 선행 작업을 안내한다', async ({ page }) => {
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.goto('/planner');
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '날씨', exact: true }).click();
  await expect(chat.locator('.naru-workspace > header strong')).toHaveText('지역·활동');
  await expect(chat.locator('#conditions')).toBeVisible();
  await chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('날씨는 일정에 장소를 담으면');
});

test('편의 비교에서 일정 변경을 제안하면 대화 확인 버튼으로 돌아온다', async ({ page }) => {
  const chat = await tripChat(page);
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '편의 비교', exact: true }).click();
  await chat.getByRole('button', { name: '이 장소 비교하기', exact: true }).first().click();
  await chat.getByRole('button', { name: '이 장소 비교하기', exact: true }).click();
  await chat.getByRole('button', { name: /선택한 2곳 비교/ }).click();
  const comparison = page.getByRole('dialog', { name: '편의를 나란히 살펴보세요.', exact: true });
  await expect(comparison).toContainText('용지호수공원');
  await comparison.getByRole('button', { name: '일정에 담기', exact: true }).click();
  await expect(chat.getByRole('button', { name: '확인하고 적용', exact: true })).toBeVisible();
  await expect(chat.getByRole('button', { name: '확인하고 적용', exact: true })).toBeFocused();
});

test('출발 확인·캘린더·공유 도구가 해당 조작 위치로 바로 열린다', async ({ page }) => {
  const chat = await tripChat(page);
  let shared = 0, downloaded = 0;
  page.on('download', () => downloaded++);
  await page.route('**/api/trips', route => { shared++; return route.fulfill({ status: 201, json: { url: '/trip/test' } }); });
  for (const [label, selector] of [
    ['출발 전 확인', '#departure-readiness-title'],
    ['캘린더', '.readiness-actions button:last-child'],
    ['저장·공유', '.itinerary-primary-actions > button'],
    ['이동 부담·휴식', '.trip-comfort-choices > summary'],
  ]) {
    await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
    await chat.getByRole('button', { name: label, exact: true }).click();
    const target = chat.locator(selector);
    await expect(target).toBeVisible();
    await expect(target).toBeFocused();
    await expect.poll(() => target.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    })).toBe(true);
    await chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  }
  expect(shared).toBe(0);
  expect(downloaded).toBe(0);
});

test('공유한 도구 안에서 Escape를 눌러도 나루를 닫고 시작 버튼으로 돌아온다', async ({ page }) => {
  const chat = await tripChat(page);
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '여행비', exact: true }).click();
  await chat.getByLabel('목표 예산 (원)', { exact: true }).fill('95000');
  await page.keyboard.press('Escape');
  await expect(chat).toBeHidden();
  await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true })).toBeFocused();
});

test('영문 편의 화면에서도 나루가 휴식 설정으로 정확히 이동한다', async ({ page }) => {
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.addInitScript(() => {
    localStorage.setItem('wave-dev-presentation', 'enabled');
    localStorage.setItem('wave-locale', 'en');
  });
  await page.goto('/planner');
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '이동 부담·휴식', exact: true }).click();
  const summary = chat.locator('.trip-comfort-choices > summary');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(summary).not.toContainText(/[가-힣]/);
});

test('담기 전 대안 요청에는 필요한 작업과 후보 비교를 안내한다', async ({ page }) => {
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.route('**/api/assistant', route => route.fulfill({ json: route.request().method() === 'GET' ? { available: true } : { reply: '대안을 살펴볼게요.', proposal: { action: 'alternatives', placeId: '1001' } } }));
  await page.goto('/planner');
  await chooseTripConditions(page);
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('textbox').fill('경남도립미술관 대신 갈 곳을 찾아줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await chat.getByRole('button', { name: '열기 / 실행', exact: true }).click();
  await expect(chat.locator('.naru-workspace > header strong')).toHaveText('편의 비교');
  await chat.getByRole('button', { name: '대화만 보기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('먼저 이 장소를 일정에 담아주세요');
});


for (const status of [429, 503]) test(`AI ${status} 응답 뒤 질문을 다시 보낼 수 있고 새 초안은 덮어쓰지 않는다`, async ({ page }) => {
  await mockPlannerApi(page, { plannerView: 'guided' });
  let calls = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/assistant', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    calls++;
    if (calls === 2) await gate;
    await route.fulfill({ status, json: { error: 'temporarily unavailable' } });
  });
  await page.goto('/planner');
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  const input = chat.getByRole('textbox');
  await input.fill('창원에서 쉬엄쉬엄 여행하고 싶어요');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(input).toHaveValue('창원에서 쉬엄쉬엄 여행하고 싶어요');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect.poll(() => calls).toBe(2);
  await expect(chat.locator('.naru-typing .wave-spinner')).toBeVisible();
  await input.fill('새로 작성하고 있는 질문');
  release();
  await expect(chat.locator('.naru-typing')).toBeHidden();
  await expect(input).toHaveValue('새로 작성하고 있는 질문');
  await chat.getByRole('button', { name: '모든 여행 도구', exact: true }).click();
  await chat.getByRole('button', { name: '필요한 편의', exact: true }).click();
  await expect(chat.locator('.profile-grid')).toBeVisible();
});

test('AI의 비교 제안은 실제 후보와 편의 비교표로 연결된다', async ({ page }) => {
  await mockPlannerApi(page, { plannerView: 'guided' });
  await page.route('**/api/assistant', route => route.fulfill({ json: route.request().method() === 'GET' ? { available: true } : { reply: '실제 후보들의 편의를 비교해 볼게요.', proposal: { action: 'compare' } } }));
  await page.goto('/planner');
  await chooseTripConditions(page);
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('textbox').fill('이 장소들의 편의를 비교해줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await chat.getByRole('button', { name: '열기 / 실행', exact: true }).click();
  await expect(chat.locator('.naru-workspace > header strong')).toHaveText('편의 비교');
  await chat.getByRole('button', { name: '이 장소 비교하기', exact: true }).first().click();
  await chat.getByRole('button', { name: '이 장소 비교하기', exact: true }).click();
  await chat.getByRole('button', { name: /선택한 2곳 비교/ }).click();
  const comparison = page.getByRole('dialog', { name: '편의를 나란히 살펴보세요.', exact: true });
  await expect(comparison).toContainText('경남도립미술관');
  await expect(comparison).toContainText('용지호수공원');
  await expect(comparison.getByRole('table')).toBeVisible();
});
