import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
const key = 'wave-community-bookmarks-v1';
const post = { id: 'saved-public-post', category: 'review', title: '함께 다녀온 경남 여행', content: '공개 게시글 검증 자료입니다.', authorName: '검증 여행자', createdAt: 1789905600000, updatedAt: 1789905600000, region: '통영', placeId: null, placeName: null, likeCount: 2, commentCount: 0, likedByMe: false, isOwner: false };
async function themeSetup(page: Page, theme: string) {
  // Public release remains light; explicitly opt into the preserved development
  // theme without changing that public policy.
  await page.addInitScript(theme => {
    localStorage.setItem('wave-dev-presentation', 'enabled');
    localStorage.setItem('wave-theme', theme);
  }, theme);
}
async function accessible(page: Page) {
  const axe = await new AxeBuilder({ page }).include('main').analyze();
  expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
}
async function setup(page: Page) {
  await mockPublicShellApi(page);
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: null }));
  await page.route('**/api/community/posts**', route => route.fulfill({ json: { posts: [post], page: 1, hasMore: false } }));
  await page.route(`**/api/community/posts/${post.id}`, route => route.fulfill({ json: { post, comments: [] } }));
}

for (const theme of ['light', 'dark']) test(`${theme} device bookmarks agree between list and detail, survive reload and can be found and removed without publishing`, async ({ page }) => {
  await setup(page);
  await themeSetup(page, theme);
  const writes: string[] = [];
  page.on('request', request => { if (/\/api\/community\//.test(request.url()) && request.method() !== 'GET') writes.push(request.method()); });
  await page.goto('/community');
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  const card = page.locator('.community-list article').filter({ hasText: post.title });
  await expect(card.getByRole('button', { name: '이 기기에 저장', exact: true })).toBeEnabled();
  await accessible(page);
  await card.getByRole('button', { name: '이 기기에 저장', exact: true }).click();
  await expect(card.getByRole('button', { name: '저장 해제', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key)).toEqual([post.id]);
  await card.getByRole('link', { name: `${post.title} 게시글 읽기` }).click();
  await expect(page.locator('.detail-actions').getByRole('button', { name: '저장 해제', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await accessible(page);
  await page.reload();
  await expect(page.locator('.detail-actions').getByRole('button', { name: '저장 해제', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: '여행자 이야기', exact: true }).click();
  await page.getByRole('button', { name: '저장한 글', exact: true }).click();
  const saved = page.locator('#community-saved-posts');
  await expect(saved.getByRole('link', { name: post.title, exact: true })).toHaveAttribute('href', `/community/${post.id}`);
  await expect(saved).toContainText('계정과 동기화되지 않습니다.');
  await accessible(page);
  await saved.getByRole('button', { name: '저장 해제', exact: true }).click();
  await expect(saved.getByRole('heading', { name: '이 기기에 저장한 글' })).toBeFocused();
  await expect(saved).toContainText('아직 이 기기에 저장한 글이 없습니다.');
  await expect(card.getByRole('button', { name: '이 기기에 저장', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(writes).toEqual([]);
});

for (const theme of ['light', 'dark']) test(`${theme} unavailable posts and provider failure keep the bookmark until explicit removal, retry reads fresh content`, async ({ page }) => {
  await setup(page);
  await themeSetup(page, theme);
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify(['removed-post', 'unavailable-post'])), key);
  await page.route('**/api/community/posts/removed-post', route => route.fulfill({ status: 404, json: { error: '없음' } }));
  let failed = true;
  await page.route('**/api/community/posts/unavailable-post', route => route.fulfill(failed ? { status: 503, json: { error: '일시 오류' } } : { json: { post: { ...post, id: 'unavailable-post', title: '다시 확인한 글' }, comments: [] } }));
  await page.goto('/community');
  await page.getByRole('button', { name: '저장한 글', exact: true }).click();
  const saved = page.locator('#community-saved-posts');
  await expect(saved).toContainText('삭제되었거나 공개되지 않은 글입니다.');
  await expect(saved).toContainText('게시글을 불러오지 못했어요. 저장 기록은 유지합니다.');
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await accessible(page);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key)).toEqual(['removed-post', 'unavailable-post']);
  failed = false;
  await saved.getByRole('button', { name: '게시글 다시 확인', exact: true }).click();
  await expect(saved.getByRole('link', { name: '다시 확인한 글' })).toHaveAttribute('href', '/community/unavailable-post');
  await saved.locator('li').filter({ hasText: '삭제되었거나 공개되지 않은 글입니다.' }).getByRole('button', { name: '저장 해제' }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key)).toEqual(['unavailable-post']);
});

for (const theme of ['light', 'dark']) test(`${theme} blocked storage never claims save success and a retry recovers without losing existing IDs`, async ({ page }) => {
  await setup(page);
  await themeSetup(page, theme);
  await page.goto('/community');
  const card = page.locator('.community-list article').filter({ hasText: post.title });
  await expect(card.getByRole('button', { name: '이 기기에 저장', exact: true })).toBeEnabled();
  await page.evaluate(key => {
    localStorage.setItem(key, JSON.stringify(['kept-post']));
    const original = Storage.prototype.setItem;
    Object.assign(window, { restoreBookmarkStorage: () => { Storage.prototype.setItem = original; } });
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('Quota', 'QuotaExceededError'); return original.call(this, name, value); };
  }, key);
  await card.getByRole('button', { name: '이 기기에 저장', exact: true }).click();
  await expect(card.getByRole('alert')).toContainText('저장 상태를 바꾸지 못했어요.');
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await accessible(page);
  await expect(card.getByRole('button', { name: '이 기기에 저장', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key)).toEqual(['kept-post']);
  await page.evaluate(() => (window as unknown as { restoreBookmarkStorage: () => void }).restoreBookmarkStorage());
  await card.getByRole('button', { name: '이 기기에 저장', exact: true }).click();
  await expect(card.getByRole('button', { name: '저장 해제', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key)).toEqual([post.id, 'kept-post']);
});
