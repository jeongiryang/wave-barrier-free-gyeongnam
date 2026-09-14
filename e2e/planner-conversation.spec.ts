import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

const toolQuestions: Record<string, string> = {
  conditions: '여행 지역과 활동을 고르는 화면을 열어줘',
  facilities: '필요한 편의 선택을 열어줘',
  weather: '날씨를 열어줘',
};

async function setup(page: Page, starterDone = true) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic conversation API' } }));
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const text = route.request().postDataJSON().messages.at(-1).content;
    const tool = Object.entries(toolQuestions).find(([, question]) => question === text)?.[0];
    return route.fulfill({ json: { reply: '요청한 기능을 열게요.', proposal: tool ? { action: 'tool', tool } : { action: 'search' }, source: 'local-llm' } });
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

async function send(chat: Locator, text: string) {
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await input.fill(text);
  await input.press('Enter');
}

test('나루는 화면 크기에 맞고, 크기를 바꿔도 같은 대화와 작성 중인 질문을 유지한다', async ({ page }) => {
  await setup(page);
  const chat = await openChat(page);
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await input.fill('작성 중인 통영 여행 질문');
  const viewport = page.viewportSize();
  if ((viewport?.width || 0) <= 800) {
    await expect(chat.getByRole('button', { name: /대화창 (크게|작게) 보기/ })).toBeHidden();
    const box = await chat.boundingBox();
    expect(box?.width).toBeCloseTo(viewport?.width || 0, 0);
    expect(box?.height).toBeCloseTo(viewport?.height || 0, 0);
  } else {
    expect((await chat.boundingBox())?.width).toBeCloseTo(440, 0);
    await chat.getByRole('button', { name: '대화창 크게 보기', exact: true }).click();
    expect((await chat.boundingBox())?.width).toBeCloseTo(980, 0);
    await expect(input).toHaveValue('작성 중인 통영 여행 질문');
    await chat.getByRole('button', { name: '대화창 작게 보기', exact: true }).click();
    expect((await chat.boundingBox())?.width).toBeCloseTo(440, 0);
    expect(await page.evaluate(() => localStorage.getItem('wave-naru-size-v1'))).toBe('compact');
  }
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true })).toBeFocused();
});

test('첫 화면은 필요한 도움만 받아 구체적인 시설과 안내 방식으로 저장한다', async ({ page }) => {
  await setup(page, false);
  const chat = await openChat(page);
  await chat.getByRole('button', { name: '휠체어 이동에 필요한 시설', exact: true }).click();
  await chat.getByRole('button', { name: '문자·영상 안내', exact: true }).click();
  await chat.getByRole('button', { name: '짧게, 한 번에 하나씩', exact: true }).click();
  await chat.getByRole('button', { name: '선택 적용', exact: true }).click();
  const values = await page.evaluate(() => JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {});
  expect(JSON.parse(values['wave-trip-facilities-v1'])).toEqual(['route', 'elevator', 'restroom', 'parking', 'wheelchair', 'signguide', 'videoguide', 'hearingroom']);
  expect(JSON.parse(values['wave-trip-guidance-v1'])).toEqual({ textFirst: true, briefAnswers: true, oneAtATime: true });
  expect(JSON.stringify(values)).not.toContain('"wheel"');
  expect(JSON.stringify(values)).not.toContain('"hearing"');
  await expect(chat.getByRole('heading', { name: '이렇게 시작해 보세요', exact: true })).toBeVisible();
});

test('예시 요청은 바로 보내지 않고 입력창만 채운다', async ({ page }) => {
  await setup(page);
  const chat = await openChat(page);
  const log = chat.getByRole('log');
  await expect(log.locator('.naru-message')).toHaveCount(1);
  const prompt = '휠체어로 이동하기 편한 통영 당일 여행을 찾아줘';
  await chat.getByRole('button', { name: prompt, exact: true }).click();
  await expect(chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true })).toHaveValue(prompt);
  await expect(log.locator('.naru-message')).toHaveCount(1);
});

test('여행 도구는 대화 안에 안내 카드를 남기고 본문 여행 설계로 이동한다', async ({ page }) => {
  await setup(page);
  const chat = await openChat(page);
  await send(chat, toolQuestions.weather);
  const card = chat.locator('.naru-tool-card').last();
  await expect(card).toContainText('지역·활동');
  await expect(card).toContainText('현재 여행을 유지');
  await card.getByRole('button', { name: '여행 설계에서 자세히 보기', exact: true }).click();
  await expect(chat).toBeHidden();
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toBeFocused();
});

for (const status of [429, 503]) test(`AI ${status} 응답 뒤에도 작성 중인 새 질문과 여행 설계가 유지된다`, async ({ page }) => {
  await setup(page);
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/assistant', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    calls++;
    if (calls === 2) await gate;
    await route.fulfill({ status, json: { error: 'temporarily unavailable' } });
  });
  const chat = await openChat(page);
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  try {
    await send(chat, '마음을 편하게 쉬는 여행을 생각하고 있어요');
    await expect(input).toHaveValue('마음을 편하게 쉬는 여행을 생각하고 있어요');
    await input.press('Enter');
    await expect.poll(() => calls).toBe(2);
    await input.fill('새로 작성하고 있는 질문');
    release();
    await expect(chat.locator('.naru-typing')).toBeHidden();
    await expect(input).toHaveValue('새로 작성하고 있는 질문');
    await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
    await page.getByRole('button', { name: '필요한 편의', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '필요한 편의', exact: true }).getByRole('checkbox', { name: '승강기', exact: true })).toBeEnabled();
  } finally {
    release();
  }
});
