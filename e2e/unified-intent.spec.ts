import { test, expect } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
import { prepareStory, storyReady } from './landing-contract';

test('short search explains the requirement, returns focus, and never queries a provider', async ({ page }) => {
  await mockPlannerApi(page);
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/location-search')) requests.push(request.url()); });
  await page.goto('/planner');
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  const input = page.getByRole('combobox', { name: '여행지 검색', exact: true });
  await input.fill('창');
  await page.locator('.simple-direct-search-form').getByRole('button', { name: '검색', exact: true }).click();
  await expect(input).toBeFocused();
  await expect(page.locator('#direct-place-query-notice')).toHaveText('장소나 지역을 두 글자 이상 입력해 주세요.');
  expect(requests).toEqual([]);
  await input.fill('창원');
  await expect(page.locator('#direct-place-query-notice')).toHaveCount(0);
});

test('closing keeps the message and ordinary links with compact solid spacing', async ({ page }) => {
  await prepareStory(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await storyReady(page);
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 700 });
    const closing = page.locator('.landing-finale');
    await closing.scrollIntoViewIfNeeded();
    await expect(closing.locator('#closing-title')).toHaveText('다음 풍경에서만나요');
    await expect(closing.locator('#closing-title')).toBeVisible();
    await expect(closing.locator('img,.award-panorama,.award-panorama-credit')).toHaveCount(0);
    expect(await closing.locator('footer a').count()).toBeGreaterThan(0);
    expect(await closing.evaluate(node => {
      const style = getComputedStyle(node);
      return { top: style.paddingTop, bottom: style.paddingBottom, min: style.minHeight, photo: style.backgroundImage };
    })).toEqual({ top: width <= 700 ? '40px' : '64px', bottom: width <= 700 ? '40px' : '64px', min: '0px', photo: 'none' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await expect(page.locator('.night-feature-content #naru')).toBeVisible();
  await expect(page.locator('.night-feature-content #features')).toBeVisible();
});

test('unavailable panorama photos keep navigation and introduction readable', async ({ page }) => {
  await prepareStory(page);
  await page.route('**/api/wave?**', route => new URL(route.request().url()).searchParams.get('action') === 'enrich'
    ? route.fulfill({ json: { awards: [{ id: 'broken', title: '실패 사진', address: '경상남도', source: '관광공모전 수상작', image: 'https://tong.visitkorea.or.kr/broken.webp' }] } })
    : route.fallback());
  await page.route('https://tong.visitkorea.or.kr/broken.webp', route => route.abort());
  await page.goto('/');
  await storyReady(page);
  await expect(page.locator('.landing-opening .award-panorama img')).toHaveCount(0);
  await expect(page.locator('.landing-opening .award-panorama-credit')).toHaveCount(0);
  await expect(page.locator('.landing-hero-copy h1')).toBeVisible();
  await expect(page.locator('.landing-actions a')).toBeVisible();
  await page.locator('.landing-actions a').click();
  await expect(page).toHaveURL(/\/planner/);
});
