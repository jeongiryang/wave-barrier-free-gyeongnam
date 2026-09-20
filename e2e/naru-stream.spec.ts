import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

type StreamHooks = {
  __naruStreaming: boolean;
  __naruSend: (frame: unknown) => void;
  __naruClose: () => void;
  __naruCut: () => void;
  __naruAborted: boolean;
};

// 실제 모델은 호출하지 않는다. 합성 프레임만 흘려보낸다.
async function installStream(page: Page) {
  await page.addInitScript(() => {
    const hooks = window as unknown as StreamHooks;
    hooks.__naruStreaming = false;
    hooks.__naruAborted = false;
    const original = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || (input instanceof Request ? input.method : 'GET');
      if (!hooks.__naruStreaming || method !== 'POST' || !url.includes('/api/assistant') || url.includes('/journey')) return original(input as RequestInfo, init);
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          hooks.__naruSend = frame => { try { controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`)); } catch { /* closed */ } };
          hooks.__naruClose = () => { try { controller.close(); } catch { /* closed */ } };
          hooks.__naruCut = () => { try { controller.error(new Error('synthetic cut')); } catch { /* closed */ } };
          init?.signal?.addEventListener('abort', () => { hooks.__naruAborted = true; try { controller.error(new Error('aborted')); } catch { /* closed */ } });
        },
      });
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } });
    };
  });
}

async function setup(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic stream API' } }));
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    return route.fulfill({ json: { reply: '요청을 확인했어요.', proposal: null, source: 'local-llm' } });
  });
  await page.addInitScript(() => localStorage.setItem('wave-naru-starter-v1', 'done'));
  await installStream(page);
  await page.goto('/planner');
}

async function openChat(page: Page) {
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  return chat;
}

async function ask(page: Page, text: string) {
  const chat = await openChat(page);
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await input.fill(text);
  await input.press('Enter');
  return chat;
}

const streaming = (page: Page) => page.evaluate(() => { (window as unknown as StreamHooks).__naruStreaming = true; });
const send = (page: Page, frame: unknown) => page.evaluate(value => (window as unknown as StreamHooks).__naruSend(value), frame);

test('긴 합성 답변은 아래를 따라가되 위로 읽는 위치를 지키고 최신 답변에서 따라가기를 재개한다', async ({ page }) => {
  await setup(page);
  await streaming(page);
  const chat = await ask(page, '여행 준비 순서를 자세히 설명해 줘');
  const log = chat.getByRole('log');
  const arriving = chat.locator('[data-streaming="true"]');
  const latest = chat.getByRole('button', { name: '최신 답변으로', exact: false });
  const bottomGap = () => log.evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop);
  // 합성 텍스트로 스크롤 동작만 검증하며 모델 응답 품질이나 실제 관광 정보를 주장하지 않는다.
  let reply = Array.from({ length: 45 }, (_, index) => `${index + 1}. 여행 준비 확인 항목을 차근차근 읽어 보세요.\n`).join('');
  await send(page, { type: 'text', value: reply });
  await expect(arriving).toContainText('45. 여행 준비');
  await expect.poll(() => log.evaluate(node => node.scrollHeight - node.clientHeight)).toBeGreaterThan(400);
  await expect.poll(bottomGap).toBeLessThanOrEqual(2);
  const append = async (text: string) => {
    reply += text;
    await send(page, { type: 'text', value: text });
    await expect(arriving).toContainText(text.trim());
  };
  await append('자동 따라가기 확인 문장입니다.\n');
  await expect.poll(bottomGap).toBeLessThanOrEqual(2);

  await log.hover();
  await page.mouse.wheel(0, -400);
  await expect(latest).toBeVisible();
  await expect.poll(bottomGap).toBeGreaterThan(100);
  const readingPosition = await log.evaluate(node => node.scrollTop);
  await append('위쪽 내용을 읽는 중에도 다음 답변이 도착합니다.\n'.repeat(8));
  await expect.poll(() => log.evaluate(node => node.scrollTop)).toBeCloseTo(readingPosition, 0);
  await expect(latest).toBeVisible();

  await latest.click();
  await expect(latest).toBeHidden();
  await expect.poll(bottomGap).toBeLessThanOrEqual(2);
  await append('최신 답변으로 돌아온 뒤의 마지막 안내입니다.\n'.repeat(8));
  await expect.poll(bottomGap).toBeLessThanOrEqual(2);
  await send(page, { type: 'done', reply, proposal: null, source: 'local-llm' });
  await page.evaluate(() => (window as unknown as StreamHooks).__naruClose());
  await expect(arriving).toHaveCount(0);
  await expect.poll(bottomGap).toBeLessThanOrEqual(2);
});

test('WAVE_AI_STREAM이 꺼진 응답에서는 지금과 같이 완성된 답변만 나타난다', async ({ page }) => {
  await setup(page);
  const chat = await ask(page, '여행 준비를 도와줄래');
  await expect(chat.locator('.naru-message.assistant', { hasText: '요청을 확인했어요.' })).toBeVisible();
  expect(await chat.locator('[data-streaming="true"]').count()).toBe(0);
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
});

test('켠 상태에서는 글자가 점진적으로 나타나고 제안 카드는 완료된 뒤에만 보인다', async ({ page }) => {
  await setup(page);
  await streaming(page);
  const chat = await ask(page, '여행 준비를 도와줄래');
  const arriving = chat.locator('[data-streaming="true"]');
  await send(page, { type: 'text', value: '네, 접근로가 확인된 곳부터' });
  await expect(arriving).toContainText('네, 접근로가 확인된 곳부터');
  // 도착 중인 글자는 화면 낭독기에서 감춘다.
  await expect(arriving.locator('p')).toHaveAttribute('aria-hidden', 'true');
  // 도착 중에도 읽어주기를 누를 수 있지만 자동 재생하지 않는다.
  await expect(arriving.getByRole('button', { name: '답변 읽어주기', exact: true })).toBeVisible();
  // 제안 카드는 아직 없다.
  expect(await chat.getByRole('button', { name: '통영', exact: true }).count()).toBe(0);
  await send(page, { type: 'text', value: ' 보여드릴게요.' });
  await expect(arriving).toContainText('네, 접근로가 확인된 곳부터 보여드릴게요.');
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
  await send(page, { type: 'done', reply: '네, 접근로가 확인된 곳부터 보여드릴게요.', proposal: { action: 'settings', region: '통영' }, source: 'local-llm' });
  await page.evaluate(() => (window as unknown as StreamHooks).__naruClose());
  await expect(chat.locator('.naru-message.assistant', { hasText: '이렇게 변경할까요?' })).toBeVisible();
  await expect(chat.getByRole('button', { name: '통영', exact: true })).toBeVisible();
  expect(await chat.locator('[data-streaming="true"]').count()).toBe(0);
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
});

test('도착 중에 중단하면 요청이 취소되고 일정은 그대로다', async ({ page }) => {
  await setup(page);
  await streaming(page);
  const chat = await ask(page, '여행 준비를 도와줄래');
  await send(page, { type: 'text', value: '접근로를 확인하고 있어요' });
  await expect(chat.locator('[data-streaming="true"]')).toContainText('접근로를 확인하고 있어요');
  await chat.getByRole('button', { name: '중단', exact: true }).click();
  await expect(chat.locator('.naru-message.assistant', { hasText: '답변을 중단했어요. 원하는 내용을 다시 보내주세요.' })).toBeVisible();
  expect(await chat.locator('[data-streaming="true"]').count()).toBe(0);
  expect(await page.evaluate(() => (window as unknown as StreamHooks).__naruAborted)).toBe(true);
});

test('스트림이 끊기면 받은 글자를 남기고 한 줄로 안내한다', async ({ page }) => {
  await setup(page);
  await streaming(page);
  const chat = await ask(page, '여행 준비를 도와줄래');
  await send(page, { type: 'text', value: '접근로가 확인된 곳부터' });
  await expect(chat.locator('[data-streaming="true"]')).toContainText('접근로가 확인된 곳부터');
  await page.evaluate(() => (window as unknown as StreamHooks).__naruCut());
  await expect(chat.locator('.naru-message.assistant', { hasText: '접근로가 확인된 곳부터' })).toBeVisible();
  await expect(chat.locator('.naru-message.assistant', { hasText: '답변이 끊겼어요. 다시 물어봐 주세요.' })).toBeVisible();
  expect(await chat.locator('[data-streaming="true"]').count()).toBe(0);
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
});
