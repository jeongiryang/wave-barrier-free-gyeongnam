import { expect, test } from '@playwright/test';
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, plan } from './fixtures';
test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('official candidate details recover, preserve unknown consent, save a real record and show a transient toast', async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  const candidate = { name: '확인 후보 미술관', scope: '경남 창원시', source: '합성 통계', baseYm: '202609', relatedTo: '' };
  const place = { ...plan.places[0], id: '1009', name: candidate.name, accessibility: [], features: [], knownFields: 0, unknownFields: 5 };
  await page.route('**/api/wave?action=plan*', route => route.fulfill({ json: { ...plan, additionalExploration: [candidate] } }));
  let calls = 0;
  await page.route('**/api/location-search?*', route => {
    calls++;
    if (calls === 1) return route.fulfill({ json: { places: [], officialPlaces: [], officialState: 'error' } });
    return route.fulfill({ json: { places: [], officialState: 'available', officialPlaces: [place, { ...place, id: '1010', city: '진주', address: '경남 진주시' }, { ...place, id: '1011', name: '다른 미술관' }] } });
  });
  await page.goto('/planner'); await chooseTripConditions(page);
  const card = page.locator('.official-exploration-card');
  await expect(card.locator('.place-card-actions button')).toHaveCount(2);
  await card.getByRole('button', { name: `${candidate.name} 일정에 담기`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: candidate.name, exact: true });
  await expect(dialog).toContainText('장소 정보를 불러오지 못했어요.');
  await dialog.getByRole('button', { name: '다시 불러오기', exact: true }).click();
  await expect(dialog.locator('section h3')).toHaveCount(1);
  const add = dialog.getByRole('button', { name: '일정에 담기', exact: true });
  await expect(add).toBeDisabled();
  await dialog.getByLabel('방문 전 확인할 후보로 담기', { exact: true }).check();
  await add.click();
  const toast = page.locator('.wave-action-toast');
  await expect(toast).toBeVisible(); await expect(toast).toHaveText('일정에 담았습니다.');
  await expect(dialog.getByRole('button', { name: '담았음 · 되돌리기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values['wave-saved-places']))).toEqual(['1009']);
  await expect(toast).toBeHidden({ timeout: 4500 });
  await dialog.getByRole('button', { name: '담았음 · 되돌리기', exact: true }).click();
  await expect(toast).toHaveText('일정에서 뺐습니다.');
  await page.keyboard.press('Escape');
  await expect(card.getByRole('button', { name: `${candidate.name} 일정에 담기`, exact: true })).toBeFocused();
});

test('like feedback waits for the server, supports undo and reports failure without a false success', async ({ page }) => {
  await mockPublicShellApi(page);
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: { user: { id: 'toast-user', name: '검증 여행자' }, session: { id: 'synthetic' } } }));
  const post = { id: 'toast-check', category: 'review', title: '공감 알림 확인', content: '합성 테스트 게시글입니다.', authorName: '검증 여행자', createdAt: Date.now(), updatedAt: Date.now(), region: '창원', likeCount: 0, commentCount: 0, likedByMe: false, isOwner: false };
  await page.route('**/api/community/posts/toast-check', route => route.fulfill({ json: { post, comments: [] } }));
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let calls = 0;
  await page.route('**/api/community/posts/toast-check/like', async route => { calls++; if (calls === 1) await gate; if (calls === 3) return route.fulfill({ status: 503, json: { error: '좋아요를 반영하지 못했습니다.' } }); return route.fulfill({ json: { liked: calls === 1, likeCount: calls === 1 ? 1 : 0 } }); });
  await page.goto('/community/toast-check');
  const like = page.locator('.community-like'), toast = page.locator('.wave-action-toast');
  await like.click(); await expect(like).toBeDisabled(); await expect(toast).toBeHidden(); release();
  await expect(like).toHaveAttribute('aria-pressed', 'true'); await expect(toast).toHaveText('좋아요를 눌렀습니다.');
  await expect(toast).toBeHidden({ timeout: 4500 });
  await like.click(); await expect(toast).toBeVisible(); await expect(toast).toHaveText('좋아요를 취소했습니다.');
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  await like.click(); await expect(toast).toHaveText('좋아요를 반영하지 못했습니다.');
  await expect(like).toHaveAttribute('aria-pressed', 'false'); expect(calls).toBe(3);
});


test('a blocked trip write reports failure and never shows saved feedback', async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  await page.goto('/planner'); await chooseTripConditions(page);
  const add = page.locator('.simple-results > .simple-place-list .simple-place-add').first();
  await expect(add).toBeEnabled();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { if (key === 'wave-current-trip-v1') throw new DOMException('Synthetic full storage', 'QuotaExceededError'); return original.call(this, key, value); };
  });
  await add.click();
  await expect(page.locator('.wave-action-toast')).toContainText('저장하지 못했어요');
  await expect(add).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.simple-results > .simple-place-list .place-save-feedback').first()).toBeEmpty();
});
