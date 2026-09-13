import { openSupportMenu } from './support-menu';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
import { enterDeparture, departureItem } from './departure-fixtures';
async function prepare(page: Page) {
  await mockPlannerApi(page); await page.addInitScript(() => localStorage.setItem('wave-locale', 'en'));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/planner?travelStart=2026-10-08&travelEnd=2026-10-09');
  await enterDeparture(page); await expect(page.getByRole('main')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.simple-readiness')).toHaveAttribute('lang', 'ko');
  await expect(page.locator('.simple-readiness-heading button')).toHaveAttribute('aria-busy', 'false');
}
for (const theme of ['light', 'dark'] as const) for (const width of [320, 960, 1366]) test(`deferred English ${theme} review at ${width}px labels Korean evidence and preserves dates`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(theme => localStorage.setItem('wave-theme', theme), theme); await prepare(page);
  const card = page.locator('.simple-readiness'); await expect(card.locator(':scope > details')).toHaveCount(5);
  for (const label of ['날씨', '관광 집중률', '이동 경로·시간', '이동 편의', '장소 편의근거']) await departureItem(page, label);
  await expect(card).toContainText('실시간 방문자 수가 아닙니다'); await expect(card).toContainText('해당 날짜 예보가 없거나');
  const mobility = await departureItem(page, '이동 편의'); await expect(mobility.locator('summary')).toContainText('확인할 정보 있음');
  const refresh = card.getByRole('button', { name: '다시 조회', exact: true }); await refresh.focus(); await expect(refresh).toBeFocused();
  expect(await refresh.evaluate(element => { const box = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(box.x + box.width/2, box.y + box.height/2)); })).toBe(true);
  for (const control of await card.locator('button:visible,a:visible,summary:visible').all()) { const box = await control.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.width).toBeGreaterThanOrEqual(44); }
  expect((await new AxeBuilder({ page }).include('.simple-readiness').analyze()).violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  const schedule = await page.evaluate(() => JSON.parse(localStorage.getItem('wave-trip-schedule-v1') || '{}')); expect(schedule.travelStart).toBe('2026-10-08'); expect(schedule.travelEnd).toBe('2026-10-09');
  await card.screenshot({ path: test.info().outputPath(`departure-${theme}-${width}.png`) }); expect(errors).toEqual([]);
});
test('calendar failure and retry preserve keyboard focus and the saved trip', async ({ page, baseURL }) => {
  await prepare(page); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let calls = 0;
  await page.route('**/api/trips', async route => { calls++; if (calls === 1) { await gate; return route.fulfill({ status: 503, json: { error: 'Unavailable' } }); } return route.fulfill({ status: 201, json: { id: 'abcdef123456', url: `${new URL(route.request().url()).origin}/trip/abcdef123456`, revision: 1, live: true, expiresAt: Date.now() + 30 * 86400000 } }); });
  await page.locator('button[data-planner-tool=share]').click(); const menu = page.getByRole('dialog', { name: '여행 공유', exact: true }), calendar = menu.getByRole('button', { name: '캘린더', exact: true });
  await calendar.focus(); await page.keyboard.press('Enter'); await expect(calendar).toHaveAttribute('aria-busy', 'true'); await expect(calendar).toBeFocused(); await page.keyboard.press('Enter'); expect(calls).toBe(1); release();
  await expect(menu.getByRole('status')).toContainText('캘린더를 만들지 못했어요'); await expect(calendar).toBeFocused();
  const downloading = page.waitForEvent('download'); await page.keyboard.press('Enter'); const download = await downloading;
  const contents = (await readFile((await download.path())!, 'utf8')).replaceAll('\r\n ', ''); expect(contents).toContain('DTSTART;TZID=Asia/Seoul:20261008T100000'); expect(contents).toContain('경남도립미술관'); expect(contents).toContain(`URL:${new URL('/trip/abcdef123456', baseURL).href}`);
  await expect(menu.getByRole('status')).toContainText('캘린더 파일을 내려받았어요'); await expect(calendar).toBeFocused(); expect(calls).toBe(2);
});
test('language changes preserve departure evidence, calendar feedback and itinerary dates', async ({ page }) => {
  await prepare(page); await page.route('**/api/trips', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.locator('button[data-planner-tool=share]').click(); const menu = page.getByRole('dialog', { name: '여행 공유', exact: true });
  await menu.getByRole('button', { name: '캘린더', exact: true }).click(); await expect(menu.getByRole('status')).toContainText('캘린더를 만들지 못했어요'); await menu.getByRole('button', { name: '공유 닫기' }).click();
  const before = await page.evaluate(() => localStorage.getItem('wave-trip-schedule-v1'));
  await openSupportMenu(page); const preferences = page.locator('.preference-controls:visible'); await preferences.getByLabel('Open preferences', { exact: true }).click();
  await preferences.getByLabel('Language', { exact: true }).selectOption('ko'); await expect(page.getByRole('main')).toHaveAttribute('lang', 'ko');
  await preferences.getByLabel('언어', { exact: true }).selectOption('en'); await expect(page.getByRole('main')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => localStorage.getItem('wave-trip-schedule-v1'))).toBe(before); expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-saved-places') || '[]'))).toEqual(['1001']);
});
test('refresh preserves keyboard focus while waiting and after its response', async ({ page }) => {
  await prepare(page); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let calls = 0;
  await page.route('**/api/wave?*', async route => { if (new URL(route.request().url()).searchParams.get('action') === 'plan') { calls++; await gate; } await route.fallback(); });
  const refresh = page.locator('.simple-readiness-heading button');
  try { await refresh.focus(); await page.keyboard.press('Enter'); await expect(refresh).toHaveAttribute('aria-busy', 'true'); await expect(refresh).toBeFocused(); await page.keyboard.press('Enter'); expect(calls).toBe(1); } finally { release(); }
  await expect(refresh).toHaveText('다시 조회'); await expect(refresh).toBeFocused();
});
for (const scrollAway of [false, true]) test(`late forecast respects ${scrollAway ? 'manual scrolling away' : 'the visible keyboard control'}`, async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 }); await prepare(page);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/weather?*', async route => { await gate; await route.fallback(); }); const refresh = page.locator('.simple-readiness-heading button');
  const hit = () => refresh.evaluate(element => { const box = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(box.x + box.width/2, box.y + box.height/2)); });
  try { await refresh.focus(); await page.keyboard.press('Enter'); await expect(refresh).toHaveAttribute('aria-busy', 'true'); await expect.poll(hit).toBe(true);
    if (scrollAway) { await page.mouse.move(1250, 500); await page.mouse.wheel(0, -5000); await expect.poll(() => refresh.evaluate(element => element.getBoundingClientRect().top > innerHeight)).toBe(true); }
  } finally { release(); }
  await expect(refresh).toHaveText('다시 조회'); await expect(refresh).toBeFocused(); await expect.poll(hit).toBe(!scrollAway);
});
