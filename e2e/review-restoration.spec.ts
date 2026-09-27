import { test, expect } from '@playwright/test';
for (const width of [390, 1440]) {
 test(`restored story photos and handwriting at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => sessionStorage.setItem('wave-arrival-session-v1', 'done'));
  await page.goto('/');
  const cards = page.locator('.night-discover-photos > a');
  await cards.first().scrollIntoViewIfNeeded();
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
   await expect(card.locator('img')).toBeVisible();
   const geometry = await card.evaluate(el => {
    const image = el.querySelector('img')!, text = el.querySelector('span')!;
    const a = image.getBoundingClientRect(), b = text.getBoundingClientRect();
    return { height: a.height, bottom: a.bottom, textTop: b.top };
   });
   expect(geometry.height).toBeGreaterThanOrEqual(179.9); // Allow fractional transform rounding.
   expect(geometry.textTop).toBeGreaterThanOrEqual(geometry.bottom - 1);
  }
  await page.screenshot({ path: `C:/Users/admin/AppData/Local/Temp/restoration-stories-${width}.png` });
  const writing = page.locator('.wave-written-line').first();
  await writing.scrollIntoViewIfNeeded();
  await expect(writing).toHaveAttribute('data-writing', 'true');
  await expect.poll(() => writing.locator('.wave-written-character').first().evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  expect(await writing.locator('.wave-written-character').first().evaluate(el => getComputedStyle(el).animationName)).toBe('wave-hand-write');
 });
}
test('Naru cycles through all three scenes and returns to solo', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 });
 await page.goto('/planner');
 const scene = page.locator('.naru-header-scene');
 await expect(scene).toHaveAttribute('data-frame', '0');
 await expect(scene.locator('img.is-current')).toHaveAttribute('src', '/naru/night-journey-solo.webp');
 await expect(scene).toHaveAttribute('data-frame', '1', { timeout: 12000 });
 await expect(scene.locator('img.is-current')).toHaveAttribute('src', '/naru/night-journey-scene.webp');
 await expect(scene).toHaveAttribute('data-frame', '3', { timeout: 12000 });
 await expect(scene.locator('img.is-current')).toHaveAttribute('src', '/naru/night-journey-map.webp');
 await expect(scene).toHaveAttribute('data-frame', '4');
 await expect(scene.locator('.naru-dialogue-profile:visible')).toHaveCount(2);
 await page.screenshot({ path: 'C:/Users/admin/AppData/Local/Temp/restoration-naru-map.png' });
 await expect(scene).toHaveAttribute('data-frame', '0', { timeout: 10000 });
});
test('reduced motion retains complete writing and stable final scene', async ({ page }) => {
 await page.emulateMedia({ reducedMotion: 'reduce' });
 await page.goto('/planner');
 const scene = page.locator('.naru-header-scene');
 await expect(scene).toHaveAttribute('data-frame', '4');
 await expect(scene.locator('img.is-current')).toHaveAttribute('src', '/naru/night-journey-map.webp');
 const chars = scene.locator('.wave-written-character');
 expect(await chars.evaluateAll(els => els.every(el => getComputedStyle(el).opacity === '1' && getComputedStyle(el).animationName === 'none'))).toBe(true);
 await expect(scene.locator('.naru-dialogue-profile:visible')).toHaveCount(2);
});
