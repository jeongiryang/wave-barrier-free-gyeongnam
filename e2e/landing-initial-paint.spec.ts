import { waveSelectNative } from './wave-select-fixture';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { arrivalPlaybackReady, pauseCurrentClock, prepareLandingMedia } from './landing-contract';
import { INTRO_DURATION_MS } from '../features/landing/intro/wave-timing';

const hydrated = () => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT);

async function holdStartup(page: Page, path = '/') {
  let releaseApp = () => {}, requested = 0;
  const app = new Promise<void>(resolve => { releaseApp = resolve; });
  // Hold the real application entry so this checks server-rendered first paint,
  // before React can reveal, move or replace the user's controls.
  await page.route(/entry-browser(?:[/?-]|$)/, async route => { requested++; await app; await route.continue(); });
  await prepareLandingMedia(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => requested).toBeGreaterThan(0);
  await page.locator('main').first().waitFor({ state: 'attached' });
  expect(await page.evaluate(hydrated)).toBe(false);
  return { releaseApp };
}

async function expectReadableLanding(page: Page) {
  await expect(page.locator('#arrival-boot,.arrival-scene[open],.wave-intro,:modal')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-intro-pending');
  await expect(page.locator('#landing-title')).toBeVisible();
  await expect(page.locator('.night-hero-search')).toBeVisible();
  await expect(page.locator('.night-hero-search')).toHaveAttribute('action', '/planner');
  await expect(page.getByRole('button', { name: '여행지 검색', exact: true })).toBeVisible();
}

async function tabTo(page: Page, target: Locator) {
  for (let index = 0; index < 30; index++) {
    if (await target.evaluate(node => node === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

for (const width of [390, 960, 1440]) test(`${width}px first paint remains usable and the original intro returns keyboard focus after hydration`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (width === 1440) await page.clock.install();
  const held = await holdStartup(page);
  try {
    await expectReadableLanding(page);
    const planning = page.getByRole('button', { name: '여행지 검색', exact: true });
    await tabTo(page, planning);
    const painted = await planning.evaluate(node => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height, uncovered: node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) };
    });
    expect(painted.height).toBeGreaterThanOrEqual(44);
    expect(painted.uncovered).toBe(true);
    await page.screenshot({ path: info.outputPath(`before-hydration-${width}.png`) });
    // Preserve the approved automatic intro, then resume the real SSR control.
    held.releaseApp();
    await page.waitForFunction(hydrated);
    const scene = page.locator('.arrival-scene');
    await expect(scene).toBeVisible();
    const skip = scene.getByRole('button', { name: '건너뛰기', exact: true });
    await expect(skip).toBeFocused();
    if (width === 1440) {
      await pauseCurrentClock(page);
      await arrivalPlaybackReady(page);
      const elapsed = Number(await scene.locator('.wave-intro').getAttribute('data-time-ms'));
      await page.clock.fastForward(INTRO_DURATION_MS - elapsed + 100);
    } else if (width === 960) await skip.press('Enter');
    else await page.keyboard.press('Escape');
    await expect(scene).toBeHidden();
    await expectReadableLanding(page);
    await expect(planning).toBeFocused();
    expect(await page.evaluate(() => sessionStorage.getItem('wave-arrival-session-v1'))).toBe('done');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  } finally { held.releaseApp(); }
});

for (const mode of ['seen', 'reduced'] as const) test(`${mode} visitors can read the same landing while app scripts are delayed`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
  if (mode === 'seen') await page.addInitScript(() => sessionStorage.setItem('wave-arrival-session-v1', 'done'));
  const held = await holdStartup(page);
  try {
    await expectReadableLanding(page);
    held.releaseApp();
    await page.waitForFunction(hydrated);
    if (mode === 'reduced') {
      await expect(page.locator('.arrival-scene')).toBeVisible();
      await page.locator('.arrival-scene').getByRole('button', { name: '건너뛰기', exact: true }).press('Enter');
    }
    await expectReadableLanding(page);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  } finally { held.releaseApp(); }
});

for (const action of ['planning submit', 'region search'] as const) test(`keyboard ${action} works before app hydration without an intro dismissal`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const held = await holdStartup(page);
  try {
    await expectReadableLanding(page);
    if (action === 'planning submit') {
      const planning = page.getByRole('button', { name: '여행지 검색', exact: true });
      await tabTo(page, planning);
      await planning.press('Enter');
      await expect(page).toHaveURL(url => url.pathname === '/planner');
    } else {
      const region = page.getByRole('combobox', { name: '어디로 떠나고 싶으세요?', exact: true });
      await tabTo(page, region);
      // While the entry is held, this is the visible, native SSR fallback.
      await expect(region).toHaveJSProperty('tagName', 'SELECT');
      await region.selectOption('창원');
      await page.keyboard.press('Tab');
      const search = page.getByRole('button', { name: '여행지 검색', exact: true });
      await expect(search).toBeFocused();
      await search.press('Enter');
      await expect.poll(() => new URL(page.url()).searchParams.get('region')).toBe('창원');
      expect(new URL(page.url()).pathname).toBe('/planner');
    }
  } finally { held.releaseApp(); }
});

for (const path of ['/login', '/#regions']) test(`${path} intentional navigation remains readable before and after hydration`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const held = await holdStartup(page, path);
  try {
    await expect(page.locator('#arrival-boot,.arrival-scene[open],.wave-intro')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-intro-pending');
    await expect(page.locator('main').first()).toBeVisible();
    held.releaseApp();
    await page.waitForFunction(hydrated);
    await expect(page.locator('#arrival-boot,.arrival-scene[open],.wave-intro')).toHaveCount(0);
    await expect(page.locator('main').first()).toBeVisible();
    expect(new URL(page.url()).pathname + new URL(page.url()).hash).toBe(path);
  } finally { held.releaseApp(); }
});

test('failed application and photo loading leave the first planning action usable without a watchdog', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let failedEntries = 0;
  await page.route(/entry-browser(?:[/?-]|$)/, route => { failedEntries++; return route.abort('failed'); });
  await prepareLandingMedia(page);
  await page.route('**/*', route => route.request().resourceType() === 'image' ? route.abort('failed') : route.fallback());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => failedEntries).toBeGreaterThan(0);
  expect(await page.evaluate(hydrated)).toBe(false);
  await expectReadableLanding(page);
  const planning = page.getByRole('button', { name: '여행지 검색', exact: true });
  await tabTo(page, planning);
  await planning.press('Enter');
  await expect(page).toHaveURL(url => url.pathname === '/planner');
});

test('a selected region survives native-to-custom hydration and regains focus after the original intro', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const held = await holdStartup(page);
  try {
    const region = page.getByRole('combobox', { name: '어디로 떠나고 싶으세요?', exact: true });
    await expect(region).toHaveJSProperty('tagName', 'SELECT');
    await tabTo(page, region);
    await region.press('Home');
    await region.press('ArrowDown');
    await expect(region).toHaveValue('거제');
    await expect(region).toBeFocused();
    held.releaseApp();
    await page.waitForFunction(hydrated);
    const scene = page.locator('.arrival-scene');
    await expect(scene).toBeVisible();
    await expect(scene.getByRole('button', { name: '건너뛰기', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(scene).toBeHidden();
    await expect(region).toHaveJSProperty('tagName', 'BUTTON');
    await expect(region).toBeFocused();
    await expect(region).toHaveText('거제');
    await expect(waveSelectNative(region)).toHaveValue('거제');
    await expectReadableLanding(page);
    await page.keyboard.press('Tab');
    const search = page.getByRole('button', { name: '여행지 검색', exact: true });
    await expect(search).toBeFocused();
    await search.press('Enter');
    await expect(page).toHaveURL(url => url.pathname === '/planner' && url.searchParams.get('region') === '거제');
  } finally { held.releaseApp(); }
});
