import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function setup(page: Page, starterDone = true) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic conversation API' } }));
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    return route.fulfill({ json: { reply: '요청을 확인했어요.', proposal: null } });
  });
  if (starterDone) await page.addInitScript(() => localStorage.setItem('wave-naru-starter-v1', 'done'));
  await page.goto('/planner');
}
async function openChat(page: Page) {
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return chat;
}

test('아무것도 고르지 않았으면 "지금 안내 방식"은 기본 방식만 보여준다', async ({ page }) => {
  await setup(page);
  const chat = await openChat(page);
  const summary = chat.locator('.naru-note', { hasText: '지금 안내 방식' }).locator('span');
  await expect(summary).toHaveText('지금 안내 방식: 기본 방식');
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
});

test('고른 편의 조건과 안내 선호만 "지금 안내 방식"에 나타나고, 바꾸기는 필요한 편의 화면으로 보낸다', async ({ page }) => {
  await setup(page, false);
  const chat = await openChat(page);
  await chat.getByRole('button', { name: '휠체어 이동에 필요한 시설', exact: true }).click();
  await chat.getByRole('button', { name: '짧게, 한 번에 하나씩', exact: true }).click();
  await chat.getByRole('button', { name: '선택 적용', exact: true }).click();
  const summaryLine = chat.locator('.naru-note', { hasText: '지금 안내 방식' });
  const summary = summaryLine.locator('span');
  await expect(summary).toContainText('짧은 답변');
  await expect(summary).toContainText('한 번에 하나씩');
  await expect(summary).toContainText('접근로');
  await expect(summary).toContainText('승강기');
  // Only what the visitor picked appears; nothing inferred or unpicked
  // (this starter choice never turned on textFirst or the signguide facility).
  await expect(summary).not.toContainText('문자 안내 우선');
  await expect(summary).not.toContainText('수어');
  await expect(summary).not.toContainText('음성');
  await summaryLine.getByRole('button', { name: '바꾸기', exact: true }).click();
  await expect(chat).toBeHidden();
  await expect(page.locator('.simple-facility-trigger')).toBeFocused();
});

test('답변 읽어주기는 자동으로 재생되지 않고, 눌러야만 읽는다', async ({ page }) => {
  await setup(page);
  const chat = await openChat(page);
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await page.evaluate(() => {
    (window as unknown as { __speakCalls: number }).__speakCalls = 0;
    const original = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = utterance => { (window as unknown as { __speakCalls: number }).__speakCalls++; original(utterance); };
  });
  await input.fill('요청 확인');
  await input.press('Enter');
  await expect(chat.getByRole('button', { name: '답변 읽어주기', exact: true }).last()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: number }).__speakCalls)).toBe(0);
  await chat.getByRole('button', { name: '답변 읽어주기', exact: true }).last().click();
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: number }).__speakCalls)).toBeGreaterThan(0);
});

test('읽어주기가 실패해도 대화는 계속 정상 동작한다', async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => { throw new Error('synthetic speech failure'); };
  });
  const chat = await openChat(page);
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await input.fill('요청 확인');
  await input.press('Enter');
  await chat.getByRole('button', { name: '답변 읽어주기', exact: true }).last().click({ noWaitAfter: true }).catch(() => {});
  // The page keeps working (text and focus remain fully usable) even though
  // reading the answer aloud failed.
  await input.fill('읽어주기 실패 뒤에도 이어서 보낼 질문');
  await input.press('Enter');
  await expect(chat.locator('.naru-message.user').last()).toHaveText('읽어주기 실패 뒤에도 이어서 보낼 질문');
});
