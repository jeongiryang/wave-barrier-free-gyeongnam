import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { prepareStory, storyReady } from './landing-contract';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';

test('family recommendation releases its derived alcohol filter and preserves an explicit preference', async ({ page }) => {
  await mockPublicShellApi(page);
  const item = { ...plan.places[0], contentTypeId: '15', image: '', startDate: '2026-09-27', endDate: '2026-10-10', state: 'ongoing', phone: '', officialUrl: '', accessibility: [] };
  await page.route('**/api/festivals?**', route => route.fulfill({ json: { items: [{ ...item, id: '3001', name: '가을 가족 축제' }, { ...item, id: '3002', name: '가을 맥주 축제' }], state: 'live', partial: false, checkedAt: '2026-09-27T03:00:00Z' } }));
  await page.goto('/festivals');
  const filters = page.getByRole('button', { name: '축제 검색 조건', exact: false });
  if (await filters.isVisible()) await filters.click();
  const group = page.getByRole('group', { name: '축제 키워드' });
  const family = group.getByRole('button', { name: '가족 추천', exact: true });
  const alcohol = group.getByRole('button', { name: '주류 행사 제외', exact: true });
  const all = group.getByRole('button', { name: '전체', exact: true });
  await expect(page.locator('.festival-card')).toHaveCount(2);
  await family.click(); await expect(alcohol).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.festival-card')).toHaveCount(1);
  await all.click(); await expect(alcohol).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.festival-card')).toHaveCount(2);
  await family.click(); await family.click(); await expect(alcohol).toHaveAttribute('aria-pressed', 'false');
  await family.click(); await alcohol.click(); await expect(family).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.festival-card')).toHaveCount(2);
  await alcohol.click(); await group.getByRole('button', { name: '가을축제', exact: true }).click();
  await expect(alcohol).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('.festival-card')).toHaveCount(1);
});

test('regional covers remain selectable when the photo API fails, and image failures have a visible fallback', async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  const bitmap = await readFile('public/media/wave-story/hero-coast-small.webp');
  await page.route('https://tong.visitkorea.or.kr/**', route => route.fulfill({ contentType: 'image/webp', body: bitmap }));
  await page.route('**/api/wave?**', route => new URL(route.request().url()).searchParams.get('action') === 'photo' ? route.fulfill({ status: 503, json: {} }) : route.fallback());
  await page.goto('/planner');
  const toggle = page.getByRole('button', { name: '지도에서 지역 고르기' });
  if (await toggle.isVisible()) await toggle.click();
  const picker = page.locator('.night-planner-region-map .region-picker-preview');
  await expect(page.locator('#conditions')).toHaveAttribute('aria-busy', 'false');
  await picker.scrollIntoViewIfNeeded();
  await expect(picker.locator('[data-region-photo] image')).toHaveCount(18);
  await picker.getByRole('button', { name: '진주', exact: true }).click();
  await expect(picker.getByRole('tooltip')).toContainText('지역 대표 사진');
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toContainText('진주');
  await page.keyboard.press('Escape');
  await page.route('https://tong.visitkorea.or.kr/**', route => route.abort());
  await page.reload();
  if (await toggle.isVisible()) await toggle.click();
  await picker.scrollIntoViewIfNeeded();
  await expect(picker.locator('.region-photo-placeholder')).toHaveCount(18);
  await picker.getByRole('button', { name: '거제', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toContainText('거제');
});

test('Naru welcome remains available after scrolling and opens the real conversation', async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/planner');
  const bubble = page.locator('.naru-welcome-bubble');
  await expect(bubble).toContainText('언제든 나루에게 물어보세요. 함께 여행을 준비해요.');
  await page.locator('.simple-footer').scrollIntoViewIfNeeded();
  await expect(bubble).toBeVisible();
  await bubble.locator('.naru-welcome-message').click();
  await expect(page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화' })).toBeVisible();
});


test('map lettering starts when the map enters view, not while above the section', async ({ page }) => {
  await prepareStory(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await storyReady(page);
  const writing = page.locator('.night-map-signature .wave-written-line');
  await expect(writing).toHaveAttribute('data-writing', 'false');
  await page.locator('.night-journey-map').scrollIntoViewIfNeeded();
  await expect(writing).toHaveAttribute('data-writing', 'true');
  await expect(writing.locator('.wave-written-character').last()).toHaveCSS('opacity', '1');
});
