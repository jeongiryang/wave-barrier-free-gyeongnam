import { expect, test, type Page } from '@playwright/test';
import { prepareLandingMedia } from './landing-contract';

async function holdStartup(page: Page, path = '/') {
  let releaseApp = () => {}, releaseIntro = () => {}, requested = 0;
  const app = new Promise<void>(resolve => { releaseApp = resolve; });
  const intro = new Promise<void>(resolve => { releaseIntro = resolve; });
  // Hold the actual app entry, before React/hydration; holding only WaveIntro
  // would miss the first-paint gap this regression covers.
  await page.route(/entry-browser(?:[/?-]|$)/, async route => { requested++; await app; await route.continue(); });
  await page.route(/\/features\/landing\/intro\/wave-intro\.tsx(?:\?|$)/, async route => { await intro; await route.continue(); });
  await prepareLandingMedia(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => requested).toBeGreaterThan(0);
  await page.locator('main').first().waitFor({ state: 'attached' });
  expect(await page.evaluate(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT))).toBe(false);
  return { releaseApp, releaseIntro };
}

for (const width of [390, 960, 1440]) test(`${width}px first paint starts with the opaque intro before app hydration`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const held = await holdStartup(page);
  try {
    const cover = page.locator('#arrival-boot');
    await expect(cover).toBeVisible();
    const painted = await cover.evaluate(node => {
      const box = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { width: box.width, height: box.height, color: style.backgroundColor, topmost: Boolean(document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#arrival-boot')) };
    });
    expect(painted).toEqual({ width, height: 844, color: 'rgb(2, 8, 23)', topmost: true });
    await expect(page.locator('.landing-actions a')).toBeHidden();
    await page.screenshot({ path: info.outputPath(`before-hydration-${width}.png`) });
    // A browser-restored scroll offset during this fresh root startup must
    // not turn the handoff into an accidental intro skip.
    await page.evaluate(() => scrollTo(0, 133));
    held.releaseApp();
    const scene = page.locator('.arrival-scene');
    await expect(scene).toBeVisible();
    await expect(cover).toBeHidden();
    await expect(scene).toHaveCSS('background-color', 'rgb(2, 8, 23)');
    await expect(scene.getByRole('button', { name: '건너뛰기', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(scene).toBeHidden();
    await expect(page.locator('.landing-actions a')).toBeVisible();
  } finally { held.releaseApp(); held.releaseIntro(); }
});

for (const mode of ['seen', 'reduced'] as const) test(`${mode} visitors do not get an intro cover while app scripts are delayed`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
  if (mode === 'seen') await page.addInitScript(() => sessionStorage.setItem('wave-arrival-session-v1', 'done'));
  const held = await holdStartup(page);
  try {
    await expect(page.locator('#arrival-boot')).toBeHidden();
    await expect(page.locator('.landing-actions a')).toBeVisible();
  } finally { held.releaseApp(); held.releaseIntro(); }
});

for (const action of ['skip', 'Escape'] as const) test(`the pre-hydration cover can be dismissed with ${action} without waiting for app scripts`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const held = await holdStartup(page);
  try {
    const cover = page.locator('#arrival-boot');
    await expect(cover).toBeVisible();
    if (action === 'skip') {
      const skip = cover.getByRole('button', { name: '건너뛰기', exact: true });
      await page.keyboard.press('Tab'); await expect(skip).toBeFocused();
      const box = (await skip.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await skip.press('Enter');
    }
    else await page.keyboard.press('Escape');
    await expect(cover).toBeHidden();
    await expect(page.locator('.landing-actions a')).toBeVisible();
    held.releaseApp();
    await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
    await expect(page.locator('.arrival-scene')).toBeHidden();
  } finally { held.releaseApp(); held.releaseIntro(); }
});

for (const path of ['/login', '/#regions']) test(`${path} intentional navigation never gets an intro cover`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const held = await holdStartup(page, path);
  try {
    await expect(page.locator('#arrival-boot')).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-intro-pending');
    await expect(page.locator('main').first()).toBeVisible();
    held.releaseApp();
    await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
    await expect(page.locator('.arrival-scene')).toBeHidden();
  } finally { held.releaseApp(); held.releaseIntro(); }
});

test('failed app startup releases the cover within its watchdog and does not replay a late intro', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  const held = await holdStartup(page);
  try {
    await expect(page.locator('#arrival-boot')).toBeVisible();
    await page.clock.fastForward(8001);
    await expect(page.locator('#arrival-boot')).toBeHidden();
    await expect(page.locator('.landing-actions a')).toBeVisible();
    held.releaseApp();
    await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
    await expect(page.locator('.arrival-scene')).toBeHidden();
  } finally { held.releaseApp(); held.releaseIntro(); }
});
