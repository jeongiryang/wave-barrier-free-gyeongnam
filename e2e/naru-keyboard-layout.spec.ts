import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function setup(page: Page, textPercent?: number) {
  const origin = new URL(test.info().project.use.baseURL || 'http://127.0.0.1:4173').origin;
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.fallback() : route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('wave-naru-starter-v1', 'done');
    // An overlay keyboard resizes visualViewport, not the layout viewport.
    const viewport = new EventTarget();
    Object.assign(viewport, { height: 844, offsetTop: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    window.addEventListener('test:naru-viewport', event => {
      Object.assign(viewport, (event as CustomEvent).detail);
      viewport.dispatchEvent(new Event('resize'));
      viewport.dispatchEvent(new Event('scroll'));
    });
  });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic API' } }));
  await mockPlannerApi(page, { preserveView: true });
  await page.route('**/api/assistant', route => route.fulfill({ json: route.request().method() === 'GET'
    ? { available: true } : { reply: '답변을 읽고 이어서 질문해 주세요.\n'.repeat(24) } }));
  await page.goto('/planner');
  if (textPercent) await page.addStyleTag({ content: `html { font-size:${textPercent}% !important; }` });
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  return page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
}

test('200% text keeps the empty composer readable from first open and after reopen', async ({ page }) => {
  const chat = await setup(page, 200);
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기' });
  const unclipped = () => input.evaluate(node => ({ client: node.clientHeight, scroll: node.scrollHeight, line: Number.parseFloat(getComputedStyle(node).lineHeight) }));
  await expect(input).toHaveValue('');
  await expect.poll(async () => { const size = await unclipped(); return { ...size, readable: size.client + 1 >= size.scroll && size.line >= 50 }; }).toMatchObject({ readable: true });
  await input.fill('한글 입력');
  await expect.poll(async () => { const size = await unclipped(); return size.client + 1 >= size.scroll; }).toBe(true);
  await input.fill('');
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  await expect.poll(async () => { const size = await unclipped(); return size.client + 1 >= size.scroll; }).toBe(true);
  await keyboard(page, 390);
  const size = await unclipped();
  expect(size.client).toBeGreaterThanOrEqual(size.line + 15);
});

test.describe('wide touch screens with an overlay keyboard', () => {
  test.use({ hasTouch: true });
  for (const size of [{ width: 844, height: 390, keyboard: 250 }, { width: 960, height: 600, keyboard: 300 }]) {
    test(`${size.width}x${size.height} keeps composer and cancel above the measured keyboard`, async ({ page }) => {
      const chat = await setup(page);
      await page.setViewportSize({ width: size.width, height: size.height });
      await keyboard(page, size.height);
      await expect.poll(() => page.evaluate(() => matchMedia('(pointer:coarse)').matches)).toBe(true);
      let release!: () => void, started = false;
      const pending = new Promise<void>(resolve => { release = resolve; });
      await page.route('**/api/assistant', async route => {
        if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
        started = true; await pending;
        await route.fulfill({ json: { reply: '늦은 합성 응답', proposal: null } }).catch(() => {});
      });
      const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기' });
      try {
        await input.fill('여행 준비 순서를 자세히 설명해 줘');
        await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).tap();
        await expect.poll(() => started).toBe(true);
        await keyboard(page, size.keyboard, 16);
        await expect(chat).toHaveAttribute('data-short-viewport', 'true');
        await expect.poll(async () => (await chat.boundingBox())!.height).toBeCloseTo(size.keyboard, 0);
        expect((await chat.boundingBox())!.y).toBeCloseTo(16, 0);
        await expect(chat.locator('.naru-workspace-sidebar')).toBeHidden();
        for (const target of [input, chat.getByRole('button', { name: '중단', exact: true })]) {
          const box = (await target.boundingBox())!;
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.y).toBeGreaterThanOrEqual(16);
          expect(box.y + box.height).toBeLessThanOrEqual(16 + size.keyboard);
          expect(await target.evaluate(node => { const rect = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)); })).toBe(true);
        }
        await chat.getByRole('button', { name: '중단', exact: true }).tap();
        release();
        await expect(chat.getByRole('log')).toContainText('답변을 중단했어요');
        await expect(chat.getByRole('log')).not.toContainText('늦은 합성 응답');
        await keyboard(page, size.height);
        await expect(chat).toHaveAttribute('data-short-viewport', String(size.height < 560));
        if (size.height >= 560) {
          await expect(chat.locator('.naru-workspace-sidebar')).toBeVisible();
          await expect.poll(async () => (await chat.boundingBox())!.height).toBeCloseTo(size.height - 48, 0);
        }
      } finally { release(); }
    });
  }
});

async function keyboard(page: Page, height: number, offsetTop = 0, scale = 1) {
  await page.evaluate(detail => window.dispatchEvent(new CustomEvent('test:naru-viewport', { detail })), { height, offsetTop, scale });
}

test('overlay keyboard leaves readable answers, reachable input and all optional choices', async ({ page }, info) => {
  const chat = await setup(page);
  const initialHeight = (await chat.boundingBox())!.height;
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기' });
  await expect(input).not.toBeFocused();
  await expect(chat.getByRole('tab', { name: '대화', exact: true })).toBeFocused();
  await expect(chat.locator('.naru-suggestions[open]')).toHaveCount(0);
  await input.fill('여행 준비에 대해 이야기해줘');
  await keyboard(page, 390, 24);
  await expect(chat).toHaveAttribute('data-short-viewport', 'true');
  const bounds = await chat.boundingBox();
  expect(bounds!.y).toBeCloseTo(24, 0);
  expect(bounds!.height).toBeCloseTo(390, 0);
  expect((await chat.getByRole('log').boundingBox())!.height).toBeGreaterThan(180);
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('답변을 읽고 이어서 질문해 주세요.');
  await expect(chat.locator('.naru-suggestions')).not.toHaveAttribute('open', '');
  const composer = await input.boundingBox();
  expect(composer!.y + composer!.height).toBeLessThanOrEqual(414);
  expect(await chat.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('naru-overlay-keyboard.png') });
  expect((await new AxeBuilder({ page }).include('.naru-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);

  // Reading earlier content must survive both keyboard and browser-toolbar changes.
  await chat.getByRole('log').evaluate(el => { el.scrollTop = 0; });
  const latest = chat.getByRole('button', { name: '최신 답변으로', exact: true });
  await expect(latest).toBeVisible();
  await keyboard(page, 430, 0);
  await expect.poll(() => chat.getByRole('log').evaluate(el => el.scrollTop)).toBe(0);
  const latestBox = (await latest.boundingBox())!;
  const logBox = (await chat.getByRole('log').boundingBox())!;
  // The short-viewport action floats inside the log, preserving its reading height.
  expect(logBox.height).toBeGreaterThan(180);
  expect(latestBox.height).toBeGreaterThanOrEqual(44);
  expect(latestBox.y).toBeGreaterThanOrEqual(logBox.y);
  expect(latestBox.y + latestBox.height).toBeLessThanOrEqual(logBox.y + logBox.height);
  expect(latestBox.y + latestBox.height).toBeLessThanOrEqual((await input.boundingBox())!.y);
  expect(await chat.getByRole('log').evaluate(el => parseFloat(getComputedStyle(el).paddingBottom))).toBeGreaterThanOrEqual(latestBox.height);
  expect(await latest.evaluate(node => { const rect = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)); })).toBe(true);
  await page.screenshot({ path: info.outputPath('naru-keyboard-earlier-answer.png') });
  // Scroll the end of the answer above the floating action, just as a reader can.
  const answer = chat.locator('.naru-message.assistant > p').last();
  const answerScroll = await answer.evaluate((node, actionTop) => {
    const text = node.firstChild!;
    const end = text.textContent!.trimEnd().length;
    const range = document.createRange();
    range.setStart(text, end - 1); range.setEnd(text, end);
    return range.getBoundingClientRect().bottom - actionTop + 8;
  }, latestBox.y);
  await page.mouse.move(logBox.x + logBox.width / 2, logBox.y + logBox.height / 2);
  await page.mouse.wheel(0, answerScroll);
  await expect.poll(() => answer.evaluate(node => {
    const text = node.firstChild!;
    const end = text.textContent!.trimEnd().length;
    const range = document.createRange();
    range.setStart(text, end - 1); range.setEnd(text, end);
    const rect = range.getBoundingClientRect();
    const viewport = node.closest('[role=log]')!.getBoundingClientRect();
    return { visible: rect.top >= viewport.top && rect.bottom <= viewport.bottom, hit: node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) };
  })).toEqual({ visible: true, hit: true });
  await page.screenshot({ path: info.outputPath('naru-keyboard-answer-end.png') });
  await latest.click();
  await expect(latest).toBeHidden();
  await expect.poll(() => chat.getByRole('log').evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(2);
  expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await input.evaluate(node => { const rect = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)); })).toBe(true);
  await input.click();
  await expect(input).toBeFocused();
  await input.fill('다음 질문도 입력할 수 있어요');
  await expect(input).toHaveValue('다음 질문도 입력할 수 있어요');
  await input.fill('');
  await keyboard(page, 844);
  await expect(chat).toHaveAttribute('data-short-viewport', 'false');
  await expect.poll(() => chat.getByRole('log').evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(2);
  await keyboard(page, 200, 100, 2);
  expect((await chat.boundingBox())!.height).toBeCloseTo(initialHeight, 0);
  await keyboard(page, 844);

  await chat.locator('.naru-suggestions > summary').click();
  await chat.getByRole('button', { name: '선택한 조건으로 여행지를 찾아줘', exact: true }).click();
  await expect(input).toHaveValue('선택한 조건으로 여행지를 찾아줘');
  await expect(input).toBeFocused();
  await chat.getByRole('tab', { name: '직접 골라서 하기', exact: true }).click();
  await chat.getByRole('button', { name: '전체', exact: true }).click();
  await expect(chat.locator('.naru-task-actions > button')).toHaveCount(28);
  await chat.getByRole('tab', { name: '저장한 여행', exact: true }).click();
  await expect(chat.getByRole('button', { name: '대화와 현재 여행 저장', exact: true })).toBeVisible();
});

test('resized mobile viewport and unavailable assistant keep recovery and composer reachable', async ({ page }) => {
  const chat = await setup(page);
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: false } }));
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  await keyboard(page, 360);
  await expect(chat.getByRole('button', { name: '연결 다시 확인', exact: true })).toBeVisible();
  expect((await chat.getByRole('log').boundingBox())!.height).toBeGreaterThan(120);
  const send = chat.getByRole('button', { name: '나루에게 보내기', exact: true });
  expect((await send.boundingBox())!.y + (await send.boundingBox())!.height).toBeLessThanOrEqual(360);
});

test('photo preview and its recovery controls do not consume the conversation above a keyboard', async ({ page }, info) => {
  const chat = await setup(page);
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 100; canvas.height = 100;
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await chat.getByLabel('나루에게 첨부할 사진 선택').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await expect(chat.getByAltText('첨부 사진', { exact: true })).toBeVisible();
  await chat.getByRole('textbox', { name: '나루에게 여행 질문하기' }).fill('사진을 읽어줘');
  await keyboard(page, 390);
  await expect(chat).toHaveAttribute('data-short-viewport', 'true');
  expect((await chat.getByRole('log').boundingBox())!.height).toBeGreaterThan(100);
  const preview = chat.getByRole('region', { name: '첨부 사진 확인' });
  const remove = preview.getByRole('button', { name: '첨부 사진 삭제', exact: true });
  await remove.scrollIntoViewIfNeeded();
  const removeBox = (await remove.boundingBox())!;
  expect(removeBox.y).toBeGreaterThanOrEqual(0);
  expect(removeBox.y + removeBox.height).toBeLessThanOrEqual(390);
  await chat.locator('.naru-more > summary').click();
  await chat.locator('.naru-menu-privacy > summary').click();
  await expect(chat.locator('.naru-menu-privacy')).toContainText('위치정보를 제거한 뒤');
  await chat.locator('.naru-more > summary').click();
  await page.screenshot({ path: info.outputPath('naru-keyboard-photo.png') });
  await chat.getByRole('button', { name: '첨부 사진 삭제', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(chat.getByRole('textbox')).toHaveValue('사진을 읽어줘');
});

test('asking for help never replaces the readable answer with a fixed wall of tools', async ({ page }) => {
  const chat = await setup(page);
  await keyboard(page, 390);
  await chat.getByRole('textbox').fill('어떤 것을 도와줄 수 있어?');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  const log = chat.getByRole('log');
  await expect(log).toContainText('시설 확인, 일정 변경, 문의 카드와 공유를 도와드려요.');
  expect((await log.boundingBox())!.height).toBeGreaterThan(180);
  await log.getByText('모든 여행 도구 펼치기', { exact: true }).click();
  await expect(log.locator('.naru-tools button')).toHaveCount(28);
  const latest = chat.getByRole('button', { name: '최신 답변으로', exact: true });
  await expect(latest).toBeVisible();
  expect((await log.boundingBox())!.height).toBeGreaterThan(180);
  const latestBox = (await latest.boundingBox())!;
  const logBox = (await log.boundingBox())!;
  expect(latestBox.height).toBeGreaterThanOrEqual(44);
  expect(latestBox.y).toBeGreaterThanOrEqual(logBox.y);
  expect(latestBox.y + latestBox.height).toBeLessThanOrEqual(logBox.y + logBox.height);
  expect(await latest.evaluate(node => { const rect = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)); })).toBe(true);
  await latest.click();
  await expect(latest).toBeHidden();
  await expect.poll(() => log.evaluate(node => Math.abs(node.scrollHeight - node.clientHeight - node.scrollTop))).toBeLessThanOrEqual(2);
  await log.getByRole('button', { name: '지역·활동', exact: true }).click();
  await expect(log).toContainText('지역·활동에서 현재 여행을 이어서 확인할 수 있어요.');
  await expect(chat.getByRole('textbox')).toHaveValue('');
});
