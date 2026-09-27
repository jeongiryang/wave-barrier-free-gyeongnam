import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mockPublicShellApi } from './fixtures';

test('landing photographs rotate promptly without consecutive repeats and respect reduced motion', async ({ page }) => {
  await mockPublicShellApi(page);
  const image = await readFile('public/media/wave-story/hero-coast-small.webp');
  await page.route('https://tong.visitkorea.or.kr/**', route => route.fulfill({ contentType: 'image/webp', body: image }));
  await page.route('**/api/wave?**', route => {
    if (new URL(route.request().url()).searchParams.get('action') !== 'enrich') return route.fallback();
    return route.fulfill({ json: { awards: [0, 1, 1, 2].map(id => ({ id: String(id), title: `검증 사진 ${id}`, address: '경상남도', source: '관광공모전 수상작', image: `https://tong.visitkorea.or.kr/test-${id}.webp` })) } });
  });
  await page.addInitScript(() => sessionStorage.setItem('wave-arrival-session-v1', 'done'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  for (const section of ['.scenic-background-home']) {
    const panorama = page.locator(`${section} .award-panorama`);
    await panorama.scrollIntoViewIfNeeded();
    await expect(panorama).toHaveAttribute('data-paused', 'false');
    await expect(panorama.locator('img')).toHaveCount(3);
    await expect.poll(() => panorama.locator('img').evaluateAll(images => images.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const first = await panorama.locator('img.is-current').getAttribute('src');
    await expect(panorama.locator('img.is-current')).not.toHaveAttribute('src', first!, { timeout: 6500 });
  }
  await expect(page.locator('.landing-finale img, .landing-finale .award-panorama-credit')).toHaveCount(0);
  await expect(page.locator('.night-feature-content #naru')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const current = page.locator('.scenic-background-home img.is-current');
  await expect(page.locator('.scenic-background-home .award-panorama')).toHaveAttribute('data-paused', 'true');
  const still = await current.getAttribute('src');
  // The approved fixed scenery rotates every six seconds. Advance past an
  // entire interval to prove reduced motion stopped its timer.
  await page.clock.fastForward(7000);
  await expect(current).toHaveAttribute('src', still!);
});
