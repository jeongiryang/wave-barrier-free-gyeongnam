import { test, expect } from '@playwright/test';
import { prepareStory, storyReady, pauseCurrentClock } from './landing-contract';
import { paintedContrast } from './painted-contrast';
import { mockPlannerApi } from './fixtures';
for (const width of [390, 1440]) {
 test(`restored story photos and handwriting at ${width}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await prepareStory(page);
  await page.goto('/');
  await storyReady(page);
  const cards = page.locator('.night-discover-photos > a');
  await cards.first().scrollIntoViewIfNeeded();
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
   await card.scrollIntoViewIfNeeded();
   await expect(card.locator('img')).toBeVisible();
   await expect.poll(() => card.locator('img').evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
   const geometry = await card.evaluate(el => {
    const image = el.querySelector('img')!, text = el.querySelector('span')!;
    const a = image.getBoundingClientRect(), b = text.getBoundingClientRect();
    return { height: a.height, photo: a.toJSON(), text: b.toJSON() };
   });
   expect(geometry.height).toBeGreaterThanOrEqual(179.9); // Allow fractional transform rounding.
   expect(geometry.text.top).toBeGreaterThanOrEqual(geometry.photo.top);
   expect(geometry.text.bottom).toBeLessThanOrEqual(geometry.photo.bottom + 1);
   expect(geometry.text.left).toBeGreaterThanOrEqual(geometry.photo.left);
   expect(geometry.text.right).toBeLessThanOrEqual(geometry.photo.right + 1);
   await expect(card).toHaveAttribute('href', '/community');
   await card.focus(); await expect(card).toBeFocused();
   expect(await card.evaluate(node => { const r = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
   const measured = await paintedContrast(page, `.night-discover-photos > a:nth-child(${(await card.evaluate(node => [...node.parentElement!.children].indexOf(node))) + 1}) > span`, true);
   expect(measured.pixels).toBeGreaterThan(0); expect(measured.minimum).toBeGreaterThanOrEqual(4.5);
  }
  await page.screenshot({ path: info.outputPath(`restoration-stories-${width}.png`) });
  const writing = page.locator('.wave-written-line').first();
  await writing.scrollIntoViewIfNeeded();
  await expect(writing).toHaveAttribute('data-writing', 'true');
  await expect.poll(() => writing.locator('.wave-written-character').first().evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  expect(await writing.locator('.wave-written-character').first().evaluate(el => getComputedStyle(el).animationName)).toBe('wave-hand-write');
 });
}
test('Naru cycles through the two approved scenes and repeats its four dialogue steps', async ({ page }, info) => {
 await page.setViewportSize({ width: 390, height: 844 });
 await mockPlannerApi(page); await page.clock.install();
 await page.goto('/planner');
 const scene = page.locator('.naru-header-scene');
 await expect(page.locator('#conditions')).toHaveAttribute('aria-busy', 'false');
 await scene.scrollIntoViewIfNeeded();
 await expect.poll(() => scene.locator('img').evaluateAll(nodes => nodes.length === 2 && nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
 await pauseCurrentClock(page);
 let frame = Number(await scene.getAttribute('data-frame'));
 const seen = new Set<number>();
 for (let step = 0; step < 5; step++) {
  expect([0, 1, 2, 3, 4]).toContain(frame);
  const previous = frame;
  // Startup can already have consumed part of the current frame. Observe the
  // next real boundary in steps shorter than every scene, never skip a frame.
  for (let elapsed = 0; elapsed < 2500 && frame === previous; elapsed += 100) {
   await page.clock.runFor(100);
   frame = Number(await scene.getAttribute('data-frame'));
  }
  expect(frame).toBe(previous === 4 ? 1 : previous + 1);
  await expect(scene).toHaveAttribute('data-frame', String(frame)); seen.add(frame);
  await expect(scene.locator('img.is-current')).toHaveAttribute('src', `/naru/planner-harbor-${frame < 3 ? 'grounded-v4' : 'map-desktop-v1'}.webp`);
  await expect(scene.locator('.naru-dialogue-profile:visible')).toHaveCount(frame % 2 ? 1 : 2);
 }
 expect([...seen].sort()).toEqual([1, 2, 3, 4]);
 await page.screenshot({ path: info.outputPath('restoration-naru-cycle.png') });
});
test('OS reduced motion retains animated writing and cycling scenes', async ({ page }) => {
 await page.emulateMedia({ reducedMotion: 'reduce' });
 await mockPlannerApi(page);
 await page.goto('/planner');
 const scene = page.locator('.naru-header-scene');
 await expect(scene).toHaveAttribute('data-frame', '4');
 await expect(scene.locator('img.is-current')).toHaveAttribute('src', '/naru/planner-harbor-map-desktop-v1.webp');
 const chars = scene.locator('.wave-written-character');
 await expect(chars.first()).toBeVisible();
 expect(await chars.evaluateAll(els => els.every(el => getComputedStyle(el).animationName !== 'none'))).toBe(true);
 await expect(scene).toHaveAttribute('data-frame', '1');
 await expect(scene.locator('.naru-dialogue-profile:visible')).toHaveCount(2);
});
