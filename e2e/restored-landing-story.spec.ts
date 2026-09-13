import { expect, test } from '@playwright/test';
import { prepareStory, storyReady, chapterIds, expectNoOverflow, expectUsableTarget } from './landing-contract';
import { horizonPhotos } from '../features/landing/horizon-photos';

test.use({ storageState: { cookies: [], origins: [] } });

for (const motion of ['no-preference', 'reduce'] as const) test(`restored scenery follows each readable chapter and returns with original credits in ${motion} motion`, async ({ page, isMobile }) => {
  const width = isMobile ? 390 : 1440;
  const requests: string[] = [];
  page.on('request', request => { if (/\/api\/(wave|assistant|community)(?:[/?]|$)/.test(request.url())) requests.push(request.url()); });
  await prepareStory(page); await page.emulateMedia({ reducedMotion: motion });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/'); await storyReady(page);
  expect(await page.locator('.landing-page > section[id]').evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
  const stream = page.locator('.horizon-chapters'), chapters = page.locator('.horizon-chapter-copy');
  const backdrops = page.locator('.horizon-chapter-backdrops > div');
  const photos = [horizonPhotos.park, horizonPhotos.garden, horizonPhotos.coast];
  await expect(chapters).toHaveCount(3); await expect(backdrops).toHaveCount(3);
  for (const index of [0, 1, 2, 1, 0]) {
    await chapters.nth(index).evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(stream).toHaveAttribute('data-active-chapter', String(index));
    await expect(chapters.nth(index).locator('h3')).toBeVisible();
    await expect(backdrops.filter({ has: page.locator('img') })).toHaveCount(3);
    const active = backdrops.nth(index);
    await expect(active).toHaveAttribute('aria-hidden', 'false'); await expect(active).not.toHaveAttribute('inert', '');
    for (const other of [0, 1, 2].filter(value => value !== index)) {
      await expect(backdrops.nth(other)).toHaveAttribute('aria-hidden', 'true');
      await expect(backdrops.nth(other)).toHaveAttribute('inert', '');
    }
    const image = active.locator('img');
    await expect(image).toHaveAttribute('src', photos[index].image);
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    const bounds = await image.evaluate(node => {
      const image = node.getBoundingClientRect(), frame = node.closest('figure')!.getBoundingClientRect();
      return { imageHeight: image.height, frameHeight: frame.height, imageWidth: image.width, frameWidth: frame.width, fit: getComputedStyle(node).objectFit };
    });
    expect(Math.abs(bounds.imageHeight - bounds.frameHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds.imageWidth - bounds.frameWidth)).toBeLessThanOrEqual(1); expect(bounds.fit).toBe('cover');
    const credit = active.getByRole('link', { name: /사진 원본/ });
    await expect(credit).toHaveAttribute('href', photos[index].sourceUrl);
    await expect(active.locator('figcaption')).toContainText(photos[index].photographer);
    await expect(active.locator('figcaption')).toContainText(photos[index].license);
    await credit.focus(); await expect(credit).toBeFocused();
    for (const inactive of [0, 1, 2].filter(value => value !== index)) {
      for (const hiddenLink of await backdrops.nth(inactive).locator('a').all()) {
        await hiddenLink.evaluate((node: HTMLElement) => node.focus({ preventScroll: true }));
        await expect(credit).toBeFocused();
      }
    }
    if (motion === 'reduce') expect(await active.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
    await expectNoOverflow(page);
  }
  await expectUsableTarget(page.locator('#story .horizon-text-link'));
  await expectUsableTarget(page.locator('#departure a[href="/planner"]'));
  await expect(page.locator('#departure .horizon-checks li')).toHaveText(['운영시간', '날씨', '이동수단', '편의시설']);
  await expectUsableTarget(page.locator('#community a[href="/community"]'));
  await expectUsableTarget(page.locator('#closing > a[href="/planner"]'));
  await expect(page.locator('.simple-region')).toHaveCount(6);
  expect(requests).toEqual([]);
  await page.screenshot({ path: test.info().outputPath(`restored-scenes-${motion}-${width}.png`), fullPage: true });
});
