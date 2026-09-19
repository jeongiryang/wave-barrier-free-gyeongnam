import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function prepare(page: Page, available: boolean | null = true) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic test fallback' } }));
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
  await page.route('**/api/assistant', route => {
    if (route.request().method() !== 'GET') return route.fulfill({ json: { reply: '합성 응답', proposal: null } });
    if (available === null) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
    return route.fulfill({ json: { available } });
  });
}
async function open(page: Page) {
  const launcher = page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true });
  await launcher.click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return { chat, launcher };
}

test('나루를 열면 도움 모음이 대화 입력 위에 보이고 조건을 만족하는 항목만 나타난다', async ({ page }) => {
  await prepare(page);
  await page.goto('/planner');
  const { chat } = await open(page);
  const hub = chat.getByRole('region', { name: '나루 도움 모음', exact: true });
  await expect(hub).toBeVisible();
  await expect(hub.getByRole('button', { name: '필요한 편의 고르기', exact: true })).toBeVisible();
  // No itinerary, no focused place, no saved trip yet in a fresh session.
  await expect(hub.getByRole('button', { name: '출발 전 확인하기', exact: true })).toHaveCount(0);
  await expect(hub.getByRole('button', { name: '오늘 일정 순서대로 보기', exact: true })).toHaveCount(0);
  await expect(hub.getByRole('button', { name: '현장에서 물어보기', exact: true })).toHaveCount(0);
  await expect(hub.getByRole('button', { name: '이동 방법 보기', exact: true })).toHaveCount(0);
  await expect(hub.getByRole('button', { name: '저장한 여행 열기', exact: true })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
});

test('항목을 누르면 대화 없이 해당 도구가 열리고 나루를 닫으면 초점이 나루 버튼으로 돌아온다', async ({ page }) => {
  await prepare(page);
  await page.goto('/planner');
  const { chat, launcher } = await open(page);
  const hub = chat.getByRole('region', { name: '나루 도움 모음', exact: true });
  await hub.getByRole('button', { name: '필요한 편의 고르기', exact: true }).click();
  await expect(chat).toHaveCount(0);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('.simple-facility-trigger')).toBeFocused();
  await page.locator('.simple-facility-trigger').evaluate(node => (node as HTMLElement).blur());
  // Returning through the launcher button restores its own focus rule; opening
  // and closing without a nested tool exercises the same dialog focus-restore path.
  await launcher.click();
  const chat2 = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat2).toBeVisible();
  await chat2.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(launcher).toBeFocused();
});

test('나루 모델을 쓸 수 없는 상태에서도 도움 모음은 동작하고 직접 이야기하기만 숨는다', async ({ page }) => {
  await prepare(page, false);
  await page.goto('/planner');
  const { chat } = await open(page);
  await expect(chat.locator('.naru-heading')).toContainText('여행 도구로 계속할 수 있어요');
  const hub = chat.getByRole('region', { name: '나루 도움 모음', exact: true });
  await expect(hub).toBeVisible();
  await expect(hub.getByRole('button', { name: '직접 이야기하기', exact: true })).toHaveCount(0);
  await hub.getByRole('button', { name: '필요한 편의 고르기', exact: true }).click();
  await expect(page.locator('.simple-facility-trigger')).toBeFocused();
});

test('키보드만으로 도움 모음 항목까지 이동해 실행할 수 있다', async ({ page }) => {
  await prepare(page);
  await page.goto('/planner');
  const { chat } = await open(page);
  const hub = chat.getByRole('region', { name: '나루 도움 모음', exact: true });
  const button = hub.getByRole('button', { name: '필요한 편의 고르기', exact: true });
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(chat).toHaveCount(0);
  await expect(page.locator('.simple-facility-trigger')).toBeFocused();
});
