import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
function gate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function prepare(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic test fallback' } }));
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
}
async function open(page: Page) {
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return chat;
}

test('failed health probe can recover through explicit retry without losing draft', async ({ page }) => {
  await prepare(page); let probes = 0;
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: ++probes > 1 } }));
  await page.goto('/planner'); const chat = await open(page);
  await expect(chat.locator('.naru-heading')).toContainText('여행 도구로 계속할 수 있어요');
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await input.fill('돌아와서 보낼 질문');
  await chat.getByRole('button', { name: '연결 다시 확인', exact: true }).click();
  await expect(chat.locator('.naru-heading small')).toHaveText('여행을 함께 설계하는 AI');
  await expect(input).toHaveValue('돌아와서 보낼 질문');
  expect(probes).toBe(2);
});

test('successful conversation stays connected when older health failure arrives', async ({ page }) => {
  await prepare(page); const delayed = gate(); let probes = 0, completed = false;
  await page.route('**/api/assistant', async route => {
    if (route.request().method() === 'POST') return route.fulfill({ json: { reply: '합성 응답: 필요한 여행 정보를 알려주세요.', proposal: null } });
    probes++; await delayed.promise;
    await route.fulfill({ json: { available: false } }).catch(() => {}); completed = true;
  });
  try {
    await page.goto('/planner'); const chat = await open(page);
    await expect.poll(() => probes).toBe(1);
    await chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill('이번 여행에서 기억할 점을 설명해줘');
    await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
    await expect(chat.getByRole('log')).toContainText('합성 응답: 필요한 여행 정보를 알려주세요.');
    await expect(chat.locator('.naru-heading small')).toHaveText('여행을 함께 설계하는 AI');
    delayed.release(); await expect.poll(() => completed).toBe(true);
    await expect(chat.locator('.naru-heading small')).toHaveText('여행을 함께 설계하는 AI');
    await expect(chat.getByRole('button', { name: '연결 다시 확인', exact: true })).toHaveCount(0);
  } finally { delayed.release(); }
});

test('reopening replaces abandoned probe and ignores its delayed failure', async ({ page }) => {
  await prepare(page); const delayed = gate(); let probes = 0, completed = false;
  await page.route('**/api/assistant', async route => {
    const current = ++probes;
    if (current === 1) await delayed.promise;
    await route.fulfill({ json: { available: current !== 1 } }).catch(() => {});
    if (current === 1) completed = true;
  });
  try {
    await page.goto('/planner'); const chat = await open(page);
    await expect.poll(() => probes).toBe(1);
    await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
    await open(page);
    await expect.poll(() => probes).toBe(2);
    await expect(chat.locator('.naru-heading small')).toHaveText('여행을 함께 설계하는 AI');
    delayed.release(); await expect.poll(() => completed).toBe(true);
    await expect(chat.locator('.naru-heading small')).toHaveText('여행을 함께 설계하는 AI');
  } finally { delayed.release(); }
});
