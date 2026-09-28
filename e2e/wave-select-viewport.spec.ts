import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockPlannerApi, openItinerary } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function setup(page: Page) {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(test.info().project.use.baseURL || 'http://127.0.0.1:4173').origin ? route.fallback() : route.abort());
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic viewport test' } }));
  await mockPlannerApi(page, { preserveView: true });
  // The request form requires an available assistant. Unavailable AI offers
  // direct tools instead, which is covered separately.
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: true } }));
  await page.addInitScript(() => localStorage.setItem('wave-naru-starter-v1', 'done'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/planner?region=창원');
}

async function withinViewport(node: Locator, page: Page) {
  await expect.poll(async () => {
    const box = await node.boundingBox(), viewport = page.viewportSize()!;
    return Boolean(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height);
  }).toBe(true);
}

test('an open region menu follows a narrower viewport without losing selection or keyboard focus', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('button', { name: /^여행 처음 만들기/ }).click();
  const region = chat.getByRole('combobox', { name: '여행 지역', exact: true });
  await region.click();
  const menu = page.getByRole('listbox', { name: '여행 지역', exact: true });
  await expect(menu).toBeFocused();
  const lastRegion = (await menu.getByRole('option').last().textContent())!;
  await page.keyboard.press('End');
  const active = await menu.getAttribute('aria-activedescendant');
  await page.setViewportSize({ width: 390, height: 844 });
  await withinViewport(menu, page);
  expect((await menu.boundingBox())!.height).toBeGreaterThanOrEqual(80);
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-activedescendant', active!);
  await expect(region).toHaveText('창원');
  await page.keyboard.press('Enter');
  await expect(region).toHaveText(lastRegion);
  await expect(region).toBeFocused();
  await region.press('ArrowDown'); await page.keyboard.press('Escape');
  await expect(region).toHaveText(lastRegion); await expect(region).toBeFocused();
});

test('an open calendar remains reachable and preserves date and parent dialog after narrowing', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
  await openItinerary(page, { start: '2026-10-03' });
  await page.getByRole('button', { name: '여행 설정', exact: true }).click();
  const settings = page.getByRole('dialog', { name: '여행 설정', exact: true });
  const start = settings.getByLabel('시작일', { exact: true });
  await start.press('Alt+ArrowDown');
  const calendar = page.getByRole('dialog', { name: '시작일 날짜 선택', exact: true });
  await expect(calendar.locator('[data-date="2026-10-03"]')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await withinViewport(calendar, page);
  const close = calendar.getByRole('button', { name: '달력 닫기', exact: true });
  expect(await close.evaluate(el => { const b = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); })).toBe(true);
  await expect(start).toHaveValue('2026-10-03');
  await calendar.locator('[data-date="2026-10-04"]').click();
  await expect(start).toHaveValue('2026-10-04');
  await expect(settings).toBeVisible();
  await expect(settings.getByRole('button', { name: '시작일 달력 열기', exact: true })).toBeFocused();
  await start.press('Alt+ArrowDown'); await page.keyboard.press('Escape');
  await expect(calendar).not.toBeVisible(); await expect(settings).toBeVisible();
});

for (const size of ['large', 'compact']) test(`Naru preserves its portal calendar through ${size} presentation changes`, async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem('wave-naru-size-v1', value), size);
  await setup(page);
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('button', { name: /^여행 처음 만들기/ }).click();
  const start = chat.getByLabel('출발 날짜', { exact: true });
  await start.fill('2026-10-03');
  for (const width of [390, 1440]) {
    await start.press('Alt+ArrowDown');
    const calendar = page.getByRole('dialog', { name: '출발 날짜 날짜 선택', exact: true });
    await page.setViewportSize({ width, height: 844 });
    await withinViewport(calendar, page);
    await expect(calendar.locator('[data-date="2026-10-03"]')).toBeFocused();
    const next = calendar.locator('[data-date="2026-10-04"]');
    expect(await next.evaluate(el => { const b = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); })).toBe(true);
    await next.click();
    await expect(start).toHaveValue('2026-10-04'); await expect(chat).toBeVisible();
    await expect(chat.getByRole('button', { name: '출발 날짜 달력 열기', exact: true })).toBeFocused();
    await start.fill('2026-10-03');
  }
});
