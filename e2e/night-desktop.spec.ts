import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi } from './fixtures';

test.use({ viewport: { width: 1440, height: 1050 }, storageState: { cookies: [], origins: [] } });
test('community mockup navigation, stored reactions and category write destination', async ({ page }) => {
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: null }));
  await page.route('**/api/community/posts**', route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  await page.goto('/community');
  const first = page.locator('.night-story-card').first();
  const like = first.getByRole('button', { name: /좋아요$/ });
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await expect(page.locator('.night-story-card').first().getByRole('button', { name: /좋아요$/ })).toHaveAttribute('aria-pressed','true');
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
  await expect(page.getByRole('button',{name:'전체',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(family).toHaveAttribute('aria-pressed','true');
});

test('new community categories survive entry into the existing editor', async ({ page }) => {
  await page.route('**/api/auth/get-session', route=>route.fulfill({json:{user:{id:'test-user',name:'여행자',email:'qa@example.test'},session:{id:'test-session'}}}));
  for(const category of ['tips','together']) {
    await page.goto('/community/new?category='+category);
    await expect(page.getByRole('combobox',{name:'게시판',exact:true})).toHaveValue(category);
  }
});
