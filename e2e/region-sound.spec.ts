import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function installSoundProbe(page: Page, saveData = false) {
  await page.addInitScript(value => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: Object.assign(new EventTarget(), { saveData: value }) });
    const original = HTMLMediaElement.prototype.play;
    (window as unknown as { __regionSoundPlayCalls: number }).__regionSoundPlayCalls = 0;
    HTMLMediaElement.prototype.play = function () {
      if ((this.currentSrc || this.getAttribute('src') || '').includes('/media/sound/')) {
        (window as unknown as { __regionSoundPlayCalls: number }).__regionSoundPlayCalls++;
      }
      return original.call(this);
    };
  }, saveData);
}

test('license gate keeps unapproved regional audio absent without requests or automatic playback', async ({ page }) => {
  const requests: string[] = [];
  await installSoundProbe(page);
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/media/sound/')) requests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('#regions')).toBeVisible();
  await expect(page.locator('[data-region-sound-player]')).toHaveCount(0);
  await expect(page.locator('#regions audio')).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { __regionSoundPlayCalls: number }).__regionSoundPlayCalls)).toBe(0);
  expect((await new AxeBuilder({ page }).include('#regions').analyze()).violations).toEqual([]);

  for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

for (const mode of ['reduced motion', 'data saving'] as const) test(`${mode} keeps regional audio controls and requests absent`, async ({ page }) => {
  if (mode === 'reduced motion') await page.emulateMedia({ reducedMotion: 'reduce' });
  await installSoundProbe(page, mode === 'data saving');
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/media/sound/')) requests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('#regions')).toBeVisible();
  await expect(page.locator('[data-region-sound-player]')).toHaveCount(0);
  expect(requests).toEqual([]);
});
