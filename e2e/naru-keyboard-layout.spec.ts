import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function setup(page: Page) {
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
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  return page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
}

async function keyboard(page: Page, height: number, offsetTop = 0, scale = 1) {
  await page.evaluate(detail => window.dispatchEvent(new CustomEvent('test:naru-viewport', { detail })), { height, offsetTop, scale });
}

test('overlay keyboard leaves readable answers, reachable input and all optional choices', async ({ page }, info) => {
  const chat = await setup(page);
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기' });
  await expect(input).not.toBeFocused();
  await expect(chat.getByRole('tab', { name: '대화', exact: true })).toBeFocused();
  await expect(chat.locator('.naru-suggestions')).not.toHaveAttribute('open', '');
  await input.fill('여행 준비에 대해 이야기해줘');
  await keyboard(page, 390, 24);
  await expect(chat).toHaveAttribute('data-short-viewport', 'true');
  const bounds = await chat.boundingBox();
  expect(bounds!.y).toBeCloseTo(24, 0);
  expect(bounds!.height).toBeCloseTo(390, 0);
  expect((await chat.getByRole('log').boundingBox())!.height).toBeGreaterThan(180);
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('답변을 읽고 이어서 질문해 주세요.');
  const composer = await input.boundingBox();
  expect(composer!.y + composer!.height).toBeLessThanOrEqual(414);
  expect(await chat.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('naru-overlay-keyboard.png') });
  expect((await new AxeBuilder({ page }).include('.naru-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);

  // Reading earlier content must survive both keyboard and browser-toolbar changes.
  await chat.getByRole('log').evaluate(el => { el.scrollTop = 0; });
  const latest = chat.getByRole('button', { name: '최신 답변으로 ↓', exact: true });
  await expect(latest).toBeVisible();
  await keyboard(page, 430, 0);
  await expect.poll(() => chat.getByRole('log').evaluate(el => el.scrollTop)).toBe(0);
  const latestBox = (await latest.boundingBox())!;
  const logBox = (await chat.getByRole('log').boundingBox())!;
  expect(latestBox.y).toBeGreaterThanOrEqual(logBox.y + logBox.height);
  expect(latestBox.y + latestBox.height).toBeLessThanOrEqual((await input.boundingBox())!.y);
  await latest.click();
  await expect.poll(() => chat.getByRole('log').evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(2);
  await keyboard(page, 844);
  await expect(chat).toHaveAttribute('data-short-viewport', 'false');
  await expect.poll(() => chat.getByRole('log').evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(2);
  await keyboard(page, 200, 100, 2);
  expect((await chat.boundingBox())!.height).toBeCloseTo(844, 0);
  await keyboard(page, 844);

  await chat.locator('.naru-suggestions > summary').click();
  await chat.getByRole('button', { name: '선택한 조건으로 여행지를 찾아줘', exact: true }).click();
  await expect(input).toHaveValue('선택한 조건으로 여행지를 찾아줘');
  await expect(input).toBeFocused();
  await chat.getByRole('tab', { name: '여행 도구', exact: true }).click();
  await expect(chat.locator('.naru-tool-catalog .naru-tools button')).toHaveCount(28);
  await chat.getByRole('tab', { name: '저장한 내용', exact: true }).click();
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
  await expect(chat.getByAltText('보내기 전 첨부 사진 미리보기')).toBeVisible();
  await chat.getByRole('textbox', { name: '나루에게 여행 질문하기' }).fill('사진을 읽어줘');
  await keyboard(page, 390);
  await expect(chat).toHaveAttribute('data-short-viewport', 'true');
  expect((await chat.getByRole('log').boundingBox())!.height).toBeGreaterThan(100);
  const preview = chat.getByRole('region', { name: '첨부 사진 확인' });
  expect((await preview.boundingBox())!.height).toBeLessThanOrEqual(78);
  await preview.focus();
  await preview.press('End');
  await expect(preview).toContainText('위치정보를 제거한 뒤');
  await page.screenshot({ path: info.outputPath('naru-keyboard-photo.png') });
  await chat.getByRole('button', { name: '첨부 사진 삭제', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(chat.getByRole('textbox')).toHaveValue('사진을 읽어줘');
});
