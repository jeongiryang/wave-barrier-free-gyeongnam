import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { mockPublicShellApi, mockPlannerApi } from './fixtures';

test('Naru greeting progresses to a child conversation and respects reduced motion', async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  await page.goto('/planner');
  const story = page.locator('.naru-conversation-footer');
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute('data-font-ready', 'true');
  await expect(story).toHaveAttribute('data-step', '4', { timeout: 25000 });
  await expect(story.locator('.naru-story-dialogue li.is-visible')).toHaveCount(4);
  await expect(story.getByText('나루야, 공룡 보러 가고 싶어!')).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.naru-conversation-footer').analyze()).violations).toEqual([]);
  await story.getByRole('button', { name: '나루와 대화하기' }).click();
  await expect(page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(story).toHaveAttribute('data-step', '4');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('all regions use API photos and whole-region selection highlights every boundary', async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  const bitmap = await readFile('public/media/wave-story/hero-coast-small.webp');
  await page.route('https://tong.visitkorea.or.kr/**', route => route.fulfill({ contentType: 'image/webp', body: bitmap }));
  await page.route('**/api/wave?**', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('action') !== 'photo') return route.fallback();
    const region = url.searchParams.get('region');
    return route.fulfill({ json: { photo: { title: `${region} 관광사진`, image: `https://tong.visitkorea.or.kr/${encodeURIComponent(region || '')}.webp`, location: `경상남도 ${region}`, photographer: '한국관광공사' } } });
  });
  await page.goto('/planner?region=' + encodeURIComponent('경남 전체'));
  const toggle = page.getByRole('button', { name: '지도에서 지역 고르기' });
  if (await toggle.isVisible()) await toggle.click();
  const picker = page.locator('.region-picker-preview').first();
  await picker.scrollIntoViewIfNeeded();
  await expect(picker.locator('[data-region-photo] image')).toHaveCount(18);
  await expect(picker.locator('[data-region-boundary][data-selected=true]')).toHaveCount(18);
  await expect(picker.locator('.declining-region-filter,.declining-region-notice')).toHaveCount(0);
  await picker.getByRole('button', { name: '진주', exact: true }).click();
  await expect(picker.getByRole('tooltip')).toContainText('진주 관광사진');
  await expect(picker.locator('[data-region-boundary][data-selected=true]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(picker.getByRole('tooltip')).toHaveCount(0);
});
