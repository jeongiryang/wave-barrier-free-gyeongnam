import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';

test('official candidate photos reject mismatched places and tolerate provider failure', async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  const bitmap = await readFile('public/media/wave-story/hero-coast-small.webp');
  await page.route('https://tong.visitkorea.or.kr/**', route => route.fulfill({ contentType: 'image/webp', body: bitmap }));
  const requested: string[] = [];
  await page.route('**/api/wave?**', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('action') === 'plan') return route.fulfill({ json: { ...plan, additionalExploration: ['정확한 장소', '다른 장소', '오류 장소'].map(name => ({ name, scope: '경남 진주시', source: '합성 관광 통계', baseYm: '202609', relatedTo: '' })) } });
    if (params.get('action') !== 'spot-photo' || params.get('strict') !== '1') return route.fallback();
    const title = params.get('title')!; requested.push(title);
    expect(params.get('region')).toBe('진주');
    if (title === '오류 장소') return route.fulfill({ status: 503, json: {} });
    return route.fulfill({ json: { image: 'https://tong.visitkorea.or.kr/test.webp', matchedTitle: '정확한 장소' } });
  });
  await page.goto('/planner?region=' + encodeURIComponent('창원'));
  const disclosure = page.locator('.official-exploration');
  await expect(disclosure).toBeVisible();
  expect(requested).toEqual([]);
  await disclosure.locator('summary').click();
  const cards = disclosure.locator('.official-exploration-card');
  for (const card of await cards.all()) await card.scrollIntoViewIfNeeded();
  await expect.poll(() => requested.length).toBe(3);
  await expect(cards.nth(0).locator('.official-exploration-photo')).toHaveAttribute('data-loaded', 'true');
  await expect(cards.nth(1).locator('img')).toHaveCount(0);
  await expect(cards.nth(2).locator('img')).toHaveCount(0);
  await expect(cards.nth(2).getByRole('button', { name: '이 관광지 검색' })).toBeEnabled();
});

test('ended festival empty state offers a past range', async ({ page }) => {
  await mockPublicShellApi(page);
  await page.clock.setFixedTime(new Date('2026-09-24T03:00:00Z'));
  await page.route('**/api/festivals?**', route => route.fulfill({ json: { items: [], checkedAt: '2026-09-24T03:00:00Z', partial: false, state: 'empty' } }));
  await page.goto('/festivals');
  const ended = page.getByRole('group', { name: '축제 진행 상태' }).getByRole('button', { name: '종료', exact: true });
  await expect(ended).toBeEnabled();
  await ended.click();
  await expect(ended).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '지난 한 달 보기' }).click();
  const filters = page.getByRole('button', { name: '축제 검색 조건', exact: false });
  if (await filters.isVisible()) await filters.click();
  await expect(page.getByLabel('언제부터', { exact: true })).toHaveValue('2026-08-25');
  await expect(page.getByLabel('언제까지', { exact: true })).toHaveValue('2026-09-23');
});
