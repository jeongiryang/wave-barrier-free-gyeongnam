import { test, expect } from '@playwright/test';
test.use({viewport:{width:1440,height:1000},storageState:{cookies:[],origins:[]}});

test('real posts preserve compact view, search and server-side sort without fixture activity',async({page})=>{
  await page.route('**/api/auth/get-session',route=>route.fulfill({json:null}));
  await page.route('**/api/community/posts**',route=>route.fulfill({json:{posts:[{id:'real-post',title:'직접 다녀온 여행',content:'방문 당시 경험입니다.',authorName:'실제 작성자',createdAt:Date.UTC(2026,8,20),category:'review',likeCount:1,commentCount:2}],page:1,hasMore:false}}));
  await page.goto('/community');
  await expect(page.getByRole('link',{name:'직접 다녀온 여행 게시글 읽기'})).toHaveAttribute('href','/community/real-post');
  await expect(page.locator('.night-story-card')).toHaveCount(0);
  await expect(page.locator('.community-list')).toContainText('좋아요 1 · 댓글 2');
  await page.getByRole('button',{name:'조밀한 카드',exact:true}).click();
  await expect(page.locator('.community-list')).toHaveAttribute('data-layout','compact');
  const search=page.waitForRequest(req=>req.url().includes('/api/community/posts')&&new URL(req.url()).searchParams.get('search')==='직접');
  await page.getByRole('textbox',{name:'여행 후기 검색'}).fill('직접');
  await page.getByRole('button',{name:'검색',exact:true}).click();
  await search;
  const request=page.waitForRequest(req=>req.url().includes('/api/community/posts')&&new URL(req.url()).searchParams.get('sort')==='popular');
  await page.getByRole('button',{name:'인기순',exact:true}).click();
  await request;
});

test('community provider errors are not disguised as empty success or sample stories',async({page})=>{
  await page.route('**/api/auth/get-session',route=>route.fulfill({json:null}));
  let failed=true;
  await page.route('**/api/community/posts**',route=>route.fulfill(failed?{status:503,json:{error:'Unavailable'}}:{json:{posts:[],page:1,hasMore:false}}));
  await page.goto('/community');
  await expect(page.getByRole('alert')).toContainText('후기를 불러오지 못했습니다.');
  await expect(page.locator('.night-story-card')).toHaveCount(0);
  await expect(page.getByText('아직 등록된 후기나 질문이 없습니다.',{exact:true})).toHaveCount(0);
  failed=false;
  await page.getByRole('button',{name:'다시 시도',exact:true}).click();
  await expect(page.getByText('아직 등록된 후기나 질문이 없습니다.',{exact:true})).toBeVisible();
});
