import { expect, test } from '@playwright/test';
import { mockPublicShellApi } from './fixtures';

test.use({storageState:{cookies:[],origins:[]}});
for (const failure of [false,true]) test(`saved comment preserves the article while its refresh ${failure?'fails':'waits'}`,async({page})=>{
  await mockPublicShellApi(page);
  await page.route('**/api/auth/get-session',r=>r.fulfill({json:{user:{id:'comment-owner',name:'검증 여행자'},session:{id:'synthetic'}}}));
  const post={id:'refresh-check',category:'review',title:'댓글 작성 중에도 읽는 여행 기록',content:'이 본문은 댓글 등록 후 재조회 중에도 유지됩니다.',authorName:'검증 여행자',createdAt:Date.now(),updatedAt:Date.now(),region:'통영',likeCount:0,commentCount:0,likedByMe:false,isOwner:true};
  let saved=false,refreshStarted=false,release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/community/posts/refresh-check',async r=>{
    if(saved){refreshStarted=true;await gate;if(failure)return r.fulfill({status:503,json:{error:'synthetic refresh failure'}});}
    await r.fulfill({json:{post,comments:saved?[{id:'new-comment',content:'새 댓글 저장 확인',authorName:'검증 여행자',createdAt:Date.now(),updatedAt:Date.now(),isOwner:true}]:[]}});
  });
  let writes=0;
  await page.route('**/api/community/posts/refresh-check/comments',r=>{writes++;saved=true;return r.fulfill({status:201,json:{id:'new-comment'}});});
  await page.goto('/community/refresh-check');
  await expect(page.getByRole('button',{name:'댓글 등록',exact:true})).toBeVisible();
  await page.getByLabel('댓글 남기기',{exact:true}).fill('새 댓글 저장 확인');
  await page.getByRole('button',{name:'댓글 등록',exact:true}).click();
  try{
    await expect.poll(()=>refreshStarted).toBe(true);
    await expect(page.locator('.detail-content')).toContainText(post.content);
    await expect(page.locator('.community-detail-state')).toHaveCount(0);
    await expect(page.getByLabel('댓글 남기기',{exact:true})).toHaveValue('');
    release();
    if(failure){await expect(page.getByRole('alert')).toContainText('변경 내용은 저장됐지만 최신 댓글을 불러오지 못했습니다.');await expect(page.locator('.detail-content')).toContainText(post.content);}
    else await expect(page.locator('.comment-list')).toContainText('새 댓글 저장 확인');
    expect(writes).toBe(1);
  }finally{release();}
});

test('a late comment refresh cannot overwrite a newer successful like', async ({ page }) => {
  await mockPublicShellApi(page);
  await page.route('**/api/auth/get-session', r => r.fulfill({ json: { user: { id: 'comment-owner', name: '검증 여행자' }, session: { id: 'synthetic' } } }));
  const post = { id: 'like-refresh-check', category: 'review', title: '댓글과 공감 경합 검증', content: '댓글과 공감이 함께 보존되어야 하는 본문입니다.', authorName: '다른 여행자', createdAt: Date.now(), updatedAt: Date.now(), region: '통영', likeCount: 0, commentCount: 0, likedByMe: false, isOwner: false };
  let saved = false, refreshStarted = false, release!: () => void, likeWrites = 0, commentWrites = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/community/posts/like-refresh-check', async r => {
    const snapshot = structuredClone(post);
    if (saved) { refreshStarted = true; await gate; }
    await r.fulfill({ json: { post: snapshot, comments: saved ? [{ id: 'saved-comment', content: '새 댓글 조회 결과', authorName: '검증 여행자', createdAt: Date.now(), updatedAt: Date.now(), isOwner: true }] : [] } });
  });
  await page.route('**/api/community/posts/like-refresh-check/comments', r => { commentWrites++; saved = true; return r.fulfill({ status: 201, json: { id: 'saved-comment' } }); });
  await page.route('**/api/community/posts/like-refresh-check/like', r => { likeWrites++; post.likeCount = 1; post.likedByMe = true; return r.fulfill({ json: { liked: true, likeCount: 1 } }); });
  await page.goto('/community/like-refresh-check');
  await page.getByLabel('댓글 남기기', { exact: true }).fill('새 댓글 조회 결과');
  await page.getByRole('button', { name: '댓글 등록', exact: true }).click();
  try {
    await expect.poll(() => refreshStarted).toBe(true);
    await page.getByRole('button', { name: /도움이 됐어요/ }).click();
    await expect(page.getByRole('button', { name: /공감했어요/ })).toHaveAttribute('aria-pressed', 'true');
    release();
    await expect(page.locator('.comment-list')).toContainText('새 댓글 조회 결과');
    await expect(page.getByRole('button', { name: /공감했어요/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /공감했어요/ })).toContainText('1');
    expect(likeWrites).toBe(1); expect(commentWrites).toBe(1);
  } finally { release(); }
});
