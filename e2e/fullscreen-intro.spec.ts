import { expect, test } from '@playwright/test';
import { arrivalPlaybackReady, pauseCurrentClock, prepareLandingMedia, storyReady } from './landing-contract';
import { BOUNDARY_FORMED_MS, INTRO_DURATION_MS } from '../features/landing/intro/wave-timing';

test('first visit shows the logo intro with keyboard skip and session-only completion', async ({page}) => {
  await prepareLandingMedia(page);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/'); await storyReady(page);
  const scene=page.locator('.arrival-scene');
  await expect(scene).toBeVisible();
  const skip=scene.getByRole('button',{name:'건너뛰기',exact:true});
  await expect(skip).toBeFocused();
  await page.keyboard.press('Tab'); await expect(skip).toBeFocused();
  await page.keyboard.press('Escape'); await expect(scene).toBeHidden();
  expect(await page.evaluate(()=>sessionStorage.getItem('wave-arrival-session-v1'))).toBe('done');
  await page.reload(); await storyReady(page); await expect(scene).toBeHidden();
  await expect(page.getByRole('button',{name:'여행지 검색',exact:true})).toBeVisible();
});

for (const width of [390, 960, 1440]) test(`${width}px reduced motion plays the original intro through completion`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepareLandingMedia(page);
  await page.clock.install();
  await page.goto('/'); await storyReady(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'calm');
  await pauseCurrentClock(page);
  const scene = page.locator('.arrival-scene');
  await expect(scene).toBeVisible();
  await arrivalPlaybackReady(page);
  const intro = scene.locator('.wave-intro');
  const elapsed = Number(await intro.getAttribute('data-time-ms'));
  await page.clock.fastForward(BOUNDARY_FORMED_MS + 250 - elapsed);
  const caption = intro.locator('[data-boundary-caption]');
  await expect(caption).toHaveText('경상남도에서 시작되는, 모두를 위한 여행');
  await expect(caption).toHaveCSS('opacity', '1');
  await expect(caption).toHaveCSS('transform', 'none');
  await expect(scene.getByRole('button', { name: '건너뛰기', exact: true })).toBeFocused();
  const now = Number(await intro.getAttribute('data-time-ms'));
  await page.clock.fastForward(INTRO_DURATION_MS - now - 100);
  await expect(scene).toBeVisible();
  await page.clock.runFor(200);
  await expect(scene).toBeHidden();
  await expect(page.locator('#top')).toBeFocused();
  expect(await page.evaluate(() => sessionStorage.getItem('wave-arrival-session-v1'))).toBe('done');
  await expect(page.getByRole('button', { name: '여행지 검색', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('changing motion preferences keeps playback open and reduced motion permits session replay', async ({ page }) => {
  await page.addInitScript(() => window.addEventListener('wave-arrival-ready', () => {
    document.documentElement.dataset.testArrivalReady = 'true';
  }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await prepareLandingMedia(page);
  await page.clock.install();
  await page.goto('/'); await storyReady(page);
  await pauseCurrentClock(page);
  await arrivalPlaybackReady(page);
  const scene = page.locator('.arrival-scene');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'calm');
  await expect(scene).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(scene).toBeHidden();
  await page.clock.resume();
  await page.reload(); await storyReady(page);
  await expect(page.locator('html')).toHaveAttribute('data-test-arrival-ready', 'true');
  await expect(scene).toBeHidden();
  // This is the existing internal replay event, not a new public control.
  await page.evaluate(() => window.dispatchEvent(new Event('wave-replay-intro')));
  await expect(scene).toBeVisible();
  await pauseCurrentClock(page);
  await arrivalPlaybackReady(page);
  await scene.getByRole('button', { name: '건너뛰기', exact: true }).press('Enter');
  await expect(scene).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe('hidden');
});

test('a stalled intro renderer still releases the page with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepareLandingMedia(page);
  await page.clock.install();
  let release = () => {};
  let requested = 0;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/wave-intro(?:\.|-).*\.(?:tsx|js)(?:\?|$)|\/wave-intro\.tsx(?:\?|$)/, async route => {
    requested++;
    await held;
    await route.abort();
  });
  try {
    await page.goto('/'); await storyReady(page);
    const scene = page.locator('.arrival-scene');
    await expect(scene).toBeVisible();
    await expect.poll(() => requested).toBeGreaterThan(0);
    await pauseCurrentClock(page);
    await page.clock.fastForward(8_001);
    await expect(scene).toBeHidden();
    await expect(page.locator(':modal')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe('hidden');
    const search = page.getByRole('button', { name: '여행지 검색', exact: true });
    await search.press('Enter');
    await expect(page).toHaveURL(url => url.pathname === '/planner');
  } finally { release(); }
});

test('blocked scripts leave the page readable without a boot overlay',async({page})=>{
  await prepareLandingMedia(page);
  await page.route(/\.(?:js|mjs|tsx)(?:\?|$)/,route=>route.abort());
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#arrival-boot')).toHaveCount(0);
  await expect(page.locator('.arrival-scene')).toBeHidden();
  await expect(page.locator('.night-hero-search button[type=submit]')).toBeVisible();
  await expect(page.locator('.night-hero-search')).toHaveAttribute('action','/planner');
  await expect(page.locator('.night-hero-search button[type=submit]')).toBeEnabled();
});
