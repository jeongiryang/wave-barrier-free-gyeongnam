import { expect, test } from '@playwright/test';
import { prepareStory, storyReady, expectNoOverflow } from './landing-contract';
import { mockPlannerApi } from './fixtures';

for (const width of [1366, 2560, 3840]) test(`immersive landing and planner use ${width}px viewport`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1080 });
  await prepareStory(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await storyReady(page);
  await expectNoOverflow(page);
  expect((await page.locator('.landing-hero').boundingBox())!.width).toBeGreaterThan(width * .9);
  const fontFaces = await page.evaluate(async () => {
    await document.fonts.load('32px WaveScript', 'Travel');
    await document.fonts.load('32px WaveHand', '경남');
    return [...document.fonts].filter(font => ['WaveScript', 'WaveHand'].includes(font.family)).map(font => ({ family: font.family, status: font.status }));
  });
  expect(fontFaces).toEqual(expect.arrayContaining([{ family: 'WaveScript', status: 'loaded' }, { family: 'WaveHand', status: 'loaded' }]));
  // The owner removed the hero slogan; the map keeps the handwritten font.
  await expect(page.locator('.night-map-signature')).toHaveCSS('font-family', /WaveHand/);
  await page.screenshot({ path: test.info().outputPath(`landing-${width}.png`) });
  await page.locator('#story').scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath(`story-${width}.png`) });
  const closing = page.locator('#closing');
  await closing.scrollIntoViewIfNeeded();
  await expect(closing.locator('h2')).toBeVisible();
  await expect(closing.locator('img,video,canvas,button,a')).toHaveCount(0);
  await expect(closing).toHaveCSS('background-image', 'none');
  await page.screenshot({ path: test.info().outputPath(`closing-${width}.png`) });
  await page.goto('/planner');
  const workspace = page.locator('.simple-search-controls');
  await expect(workspace).toBeVisible();
  // The server form is visible before preferences finish hydrating. Wait for
  // their public readiness boundary before testing the legacy calm CSS hook.
  await expect(page.locator('.wave-support-menu')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  // The approved planner caps its form width on ultrawide displays so the
  // controls stay readable; its surrounding scenery still fills the viewport.
  const workspaceBox = (await workspace.boundingBox())!;
  expect(workspaceBox.width).toBeGreaterThan(Math.min(width, 1366) * .9);
  expect(workspaceBox.x).toBeGreaterThanOrEqual(0);
  expect(workspaceBox.x + workspaceBox.width).toBeLessThanOrEqual(width);
  await expectNoOverflow(page);
  expect(await page.locator('.wave-night').first().evaluate(node => getComputedStyle(node, '::before').animationName)).toBe('wave-ambient');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.locator('.wave-night').first().evaluate(node => getComputedStyle(node, '::before').animationName)).toBe('wave-ambient');
  await page.locator('html').evaluate(node => node.setAttribute('data-motion', 'calm'));
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'calm');
  await expect.poll(() => page.locator('.wave-night').first().evaluate(node => getComputedStyle(node, '::before').animationName)).toBe('none');
  await expect(page.locator('a[href*="kakaomobility.com/launch/kakaot"]')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath(`planner-${width}.png`) });
});



for (const width of [390, 960]) test(`immersive layouts retain ${width}px access`, async ({ page }) => {
  await page.setViewportSize({ width, height: 960 });
  await prepareStory(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await storyReady(page);
  await expectNoOverflow(page);
  await page.goto('/planner');
  await expect(page.locator('.simple-search-controls')).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`planner-${width}.png`) });
});
