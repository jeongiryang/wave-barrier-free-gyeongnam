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

async function openSettings(page: Page) {
  await page.getByLabel('나루 메뉴', { exact: true }).click();
  await page.getByRole('button', { name: '안내 설정 열기', exact: true }).click();
  const settings = page.getByRole('dialog', { name: '나루 안내 설정', exact: true });
  await expect(settings).toBeVisible();
  return settings;
}

test('안내 설정은 채팅을 유지하고 취소·Esc·적용·초기화와 저장을 지원한다', async ({ page }) => {
  await setup(page, false);
  const chat = await openChat(page);
  await chat.getByRole('button', { name: '휠체어 이동에 필요한 시설', exact: true }).click();
  await chat.getByRole('button', { name: '짧게, 한 번에 하나씩', exact: true }).click();
  await chat.getByRole('button', { name: '선택 적용', exact: true }).click();
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await input.fill('입력 중인 질문');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values);
  let settings = await openSettings(page);
  await expect(settings.getByRole('heading', { name: '나루 안내 설정' })).toBeFocused();
  await expect(settings.getByRole('checkbox', { name: '답변은 짧게', exact: true })).toBeChecked();
  await settings.getByRole('checkbox', { name: '쉬운 말로 설명', exact: true }).check();
  await settings.getByRole('button', { name: '취소', exact: true }).click();
  await expect(chat).toBeVisible();
  await expect(input).toHaveValue('입력 중인 질문');
  await expect(chat.getByLabel('나루 메뉴', { exact: true })).toBeFocused();
  settings = await openSettings(page);
  await expect(settings.getByRole('checkbox', { name: '쉬운 말로 설명', exact: true })).not.toBeChecked();
  await settings.press('Escape');
  await expect(settings).toHaveCount(0);
  await expect(chat).toBeVisible();
  settings = await openSettings(page);
  await settings.getByRole('checkbox', { name: '글로 확인하기 편하게', exact: true }).check();
  await settings.getByRole('checkbox', { name: '듣기 편한 문장으로', exact: true }).check();
  await settings.getByRole('button', { name: '적용하고 대화로 돌아가기', exact: true }).click();
  await expect(chat).toBeVisible();
  await expect(input).toHaveValue('입력 중인 질문');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values);
  expect(JSON.parse(after['wave-trip-guidance-v1'])).toEqual({ briefAnswers: true, oneAtATime: true, textFirst: true, audioFirst: true });
  expect({ ...after, 'wave-trip-guidance-v1': null }).toEqual({ ...before, 'wave-trip-guidance-v1': null });
  const request = page.waitForRequest(request => request.url().endsWith('/api/assistant') && request.method() === 'POST');
  await input.press('Enter');
  expect((await request).postDataJSON().context.guidancePreferences).toEqual(JSON.parse(after['wave-trip-guidance-v1']));
  await page.reload(); await openChat(page);
  settings = await openSettings(page);
  await expect(settings.getByRole('checkbox', { name: '글로 확인하기 편하게', exact: true })).toBeChecked();
  await settings.getByRole('button', { name: '선택 모두 해제', exact: true }).click();
  await settings.getByRole('button', { name: '적용하고 대화로 돌아가기', exact: true }).click();
  await chat.getByLabel('나루 메뉴', { exact: true }).click();
  await expect(chat.locator('.naru-guidance-summary')).toContainText('기본 안내 · 추가 요청 없음');
});

test('설정 중 화면 크기가 바뀌어도 설정창을 조작하고 대화로 돌아온다', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 800 }); await setup(page); const chat = await openChat(page);
  const settings = await openSettings(page);
  await settings.getByRole('checkbox', { name: '답변은 짧게', exact: true }).check();
  for (const width of [390, 1440, 960]) {
    await page.setViewportSize({ width, height: 844 });
    const easy = settings.getByRole('checkbox', { name: '쉬운 말로 설명', exact: true });
    await easy.check(); await easy.uncheck();
    await expect(settings.getByRole('checkbox', { name: '답변은 짧게', exact: true })).toBeChecked();
  }
  await settings.getByRole('button', { name: '취소', exact: true }).click();
  await expect(chat).toBeVisible();
  await expect(chat.getByLabel('나루 메뉴', { exact: true })).toBeFocused();
});

for (const viewport of [{ width: 1440, height: 960 }, { width: 960, height: 800 }, { width: 390, height: 844 }, { width: 390, height: 390 }]) {
  test(`안내 설정은 ${viewport.width}×${viewport.height}에서 읽고 조작할 수 있다`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport); await setup(page); const chat = await openChat(page);
    const settings = await openSettings(page);
    await expect(chat).toBeVisible();
    const box = (await settings.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await settings.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    for (const control of await settings.locator('label,button').all()) {
      await control.scrollIntoViewIfNeeded();
      const bounds = (await control.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await settings.getByRole('checkbox', { name: '답변은 짧게', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(settings.getByRole('checkbox', { name: '답변은 짧게', exact: true })).toBeChecked();
    expect((await new AxeBuilder({ page }).include('.naru-guidance-settings').analyze()).violations).toEqual([]);
    await settings.getByRole('heading').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('guidance-settings.png') });
    await settings.getByRole('button', { name: '안내 설정 닫기', exact: true }).click();
    await expect(chat).toBeVisible();
  });
}

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
