import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi } from './fixtures';

test.use({ viewport: { width: 1440, height: 1050 }, storageState: { cookies: [], origins: [] } });
test('community banner navigation and category write destination use real posts only', async ({ page }) => {
  // The navigation contract must not wait on third-party tourism image delivery.
  await page.route('https://tong.visitkorea.or.kr/**', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><rect width="800" height="520" fill="#d6edf5"/></svg>',
  }));
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: null }));
  await page.route('**/api/community/posts**', route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  await page.goto('/community');
  await expect(page.getByText('아직 등록된 후기나 질문이 없습니다.', { exact: true })).toBeVisible();
  await expect(page.locator('.night-story-card')).toHaveCount(0);
  await expect(page.locator('.night-popular-region')).not.toContainText(['342개의 이야기']);
  await page.getByRole('button', { name: '다음 배너', exact: true }).click();
  await expect(page.locator('.night-banner')).toContainText('02 / 03');
  await page.getByRole('button', { name: '함께 여행해요', exact: true }).click();
  await expect(page.getByRole('link', { name: '글 쓰기', exact: true })).toHaveAttribute('href',/category%3Dtogether/);
  await page.getByRole('button', { name: '전체', exact: true }).click();
  const violations = (await new AxeBuilder({ page }).include('main').analyze()).violations.filter(v=>v.impact==='critical'||v.impact==='serious');
  expect(violations).toEqual([]);
});

test('festival keyword never clears the alcohol preference', async ({ page }) => {
  await mockPlannerApi(page);
  await page.route('**/api/festivals**', route=>route.fulfill({json:{items:[],state:'available',partial:false,checkedAt:'2026-09-20T00:00:00Z'}}));
  await page.goto('/festivals');
  const family=page.getByRole('button',{name:'주류 행사 제외',exact:true});
  await family.click();
  await page.getByRole('button',{name:'문화예술',exact:true}).click();
  await expect(family).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'경남 전체 보기',exact:true}).click();
  await expect(page.getByRole('group',{name:'축제 키워드'}).getByRole('button',{name:'전체',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(family).toHaveAttribute('aria-pressed','true');
});

test('new community categories survive entry into the existing editor', async ({ page }) => {
  await page.route('**/api/auth/get-session', route=>route.fulfill({json:{user:{id:'test-user',name:'여행자',email:'qa@example.test'},session:{id:'test-session'}}}));
  for(const category of ['tips','together']) {
    await page.goto('/community/new?category='+category);
    await expect(page.getByRole('combobox',{name:'게시판',exact:true})).toHaveValue(category);
  }
});
