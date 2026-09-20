import { test, expect } from '@playwright/test';
test.use({viewport:{width:1440,height:1000},storageState:{cookies:[],origins:[]}});

test('saved stories remain discoverable, compact is selectable and matching stories suppress false empty state',async({page})=>{
  await page.route('**/api/auth/get-session',route=>route.fulfill({json:null}));
  await page.route('**/api/community/posts**',route=>route.fulfill({json:{posts:[],page:1,hasMore:false}}));
  await page.goto('/community');
  const first=page.locator('.night-story-card').first();
  await first.getByRole('button',{name:/ 저장$/}).click();
  await page.getByRole('button',{name:'저장한 이야기',exact:true}).click();
  await expect(page.locator('.night-story-card')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button',{name:'저장한 이야기',exact:true}).click();
  await expect(page.locator('.night-story-card')).toHaveCount(1);
  await page.getByRole('button',{name:'조밀한 카드',exact:true}).click();
  await expect(page.locator('.night-story-grid').first()).toHaveAttribute('data-layout','compact');
  await page.getByRole('button',{name:'저장한 이야기',exact:true}).click();
  await page.getByRole('textbox',{name:'여행 후기 검색'}).fill('휠체어로도');
  await page.getByRole('button',{name:'검색',exact:true}).click();
  await expect(page.locator('.night-story-card')).toHaveCount(1);
  await expect(page.getByText('검색 조건에 맞는 게시글이 없습니다.',{exact:true})).toHaveCount(0);
  const request=page.waitForRequest(req=>req.url().includes('/api/community/posts')&&new URL(req.url()).searchParams.get('sort')==='popular');
  await page.getByRole('button',{name:'인기순',exact:true}).click();
  await request;
});
