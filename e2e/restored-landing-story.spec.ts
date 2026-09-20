import { expect, test } from '@playwright/test';
import { prepareStory, storyReady, chapterIds, expectNoOverflow, expectUsableTarget } from './landing-contract';

test.use({ storageState: { cookies: [], origins: [] } });

for (const motion of ['no-preference', 'reduce'] as const) test(`restored scenery follows each readable chapter and returns with original credits in ${motion} motion`, async ({ page, isMobile }) => {
  const width = isMobile ? 390 : 1440;
  const requests: string[] = [];
  page.on('request', request => { if (/\/api\/(wave|assistant|community)(?:[/?]|$)/.test(request.url())) requests.push(request.url()); });
  await prepareStory(page); await page.emulateMedia({ reducedMotion: motion });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/'); await storyReady(page);
  expect(await page.locator('main section[id]').evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
  const steps = page.locator('.night-journey-tabs button');
  await expect(steps).toHaveCount(3);
  for (const index of [0, 1, 2, 1, 0]) {
    await steps.nth(index).click();
    await expect(steps.nth(index)).toHaveAttribute('aria-pressed', 'true');
    for (const other of [0, 1, 2].filter(value => value !== index)) await expect(steps.nth(other)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.night-journey-input h3')).toBeVisible();
    await expectNoOverflow(page);
  }
  const closing = page.locator('#closing');
  await expect(closing.locator('img,a,button')).toHaveCount(0);
  await expect(closing.getByRole('heading')).toHaveText('다음 풍경에서만나요');
  await expectUsableTarget(page.locator('.night-journey-input > .night-primary'));
  await expectUsableTarget(page.locator('#departure a[href="/guide"]'));
  await expect(page.locator('#departure .horizon-checks li')).toHaveText(['운영시간', '날씨', '이동수단', '편의시설']);
  await expectUsableTarget(page.locator('#community a.simple-text-link[href="/community"]'));
  await expect(page.locator('.simple-region')).toHaveCount(5);
  expect(requests).toEqual([]);
  await page.screenshot({ path: test.info().outputPath(`restored-scenes-${motion}-${width}.png`), fullPage: true });
});
