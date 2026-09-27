import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';
import { chooseWaveOption } from './wave-select-fixture';

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block', contextOptions: { reducedMotion: 'reduce' } });
const key = 'wave-community-bookmarks-v1';
const post = { id: 'team-hover-post', category: 'field-report', title: '함께 확인한 경남 여행의 현장 기록', content: '실제 제공처 주장이 아닌 합성 검증 자료입니다. 긴 본문도 상세 글에서 읽을 수 있어야 합니다.', authorName: '함께 여행한 검증 여행자', createdAt: 1789905600000, updatedAt: 1789905600000, region: '창원', placeId: '1001', placeName: '경남도립미술관', visitDate: '2026-09-20', fieldReports: [{ field: 'entrance', status: 'changed', note: '현장 검증 자료' }], likeCount: 2, commentCount: 3, likedByMe: false, isOwner: false };

async function syntheticOnly(page: Page) {
  const origin = new URL(String(test.info().project.use.baseURL)).origin;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === origin && !url.pathname.startsWith('/api/') ? route.fallback() : route.abort();
  });
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
}
async function community(page: Page) {
  await syntheticOnly(page);
  await page.route('**/api/wave?*', route => new URL(route.request().url()).searchParams.get('action') === 'spot-photo'
    ? route.fulfill({ json: { image: 'https://wave.test/museum.svg', status: 'available' } }) : route.fallback());
  await page.route('**/api/community/posts**', route => route.fulfill({ json: { posts: [post], page: 1, hasMore: false } }));
  await page.route(`**/api/community/posts/${post.id}`, route => route.fulfill({ json: { post, comments: [] } }));
  await page.goto('/community');
  const card = page.locator('.community-list article').filter({ hasText: post.title });
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => card.locator('.community-story-cover img').evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
  return card;
}
async function unclipped(locator: Locator) {
  await expect(locator).toBeVisible();
  const clipping = await locator.evaluate(node => {
    const rect = node.getBoundingClientRect(), failures: string[] = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
      if (/(hidden|clip)/.test(style.overflowX) && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) failures.push(`${parent.className}: horizontal`);
      if (/(hidden|clip)/.test(style.overflowY) && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) failures.push(`${parent.className}: vertical`);
    }
    return failures;
  });
  expect(clipping, 'Visible text and actions must fit their clipping ancestors').toEqual([]);
}

test('community cards reveal through real focus and hover, while touch keeps details and bookmarks available', async ({ page }, info) => {
  const card = await community(page);
  const link = card.getByRole('link', { name: `${post.title} 게시글 읽기` });
  const footer = card.locator('.community-card-footer');
  const hover = await page.evaluate(() => matchMedia('(hover:hover) and (pointer:fine)').matches);
  for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.getByRole('button', { name: '카드형', exact: true }).focus();
    await page.mouse.move(0, 0);
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('h3')).toBeVisible();
    await expect(card.locator('time')).toBeVisible();
    await expect(card.locator('.community-place-tag')).toContainText('창원');
    if (hover) {
      await expect(footer).toHaveCSS('visibility', 'hidden');
      await expect(card.locator('.community-card-copy > p')).toHaveCSS('opacity', '0');
      await card.screenshot({ path: info.outputPath(`community-${width}-off.png`) });
      await card.hover();
      await expect(footer).toHaveCSS('visibility', 'visible');
      await expect(card.locator('.community-story-cover .smart-spot-image')).toHaveCSS('filter', 'blur(6px) brightness(0.76)');
      await page.mouse.move(0, 0);
    } else {
      await expect(footer).toBeVisible();
      await expect(card.locator('.community-card-copy > p')).toHaveCSS('opacity', '1');
    }
    await link.focus();
    await expect(link).toBeFocused();
    await expect(footer).toHaveCSS('visibility', 'visible');
    await expect(card.locator('.community-report-tag').last()).toContainText('공식 점수 미반영');
    // The global reduced-motion policy uses a nonzero micro-duration so
    // transition completion hooks still fire; no perceptible animation remains.
    expect(await footer.evaluate(node => Math.max(...getComputedStyle(node).transitionDuration.split(',').map(value => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000))))).toBeLessThanOrEqual(0.001);
    const save = card.getByRole('button', { name: '이 기기에 저장', exact: true });
    await link.press('Tab');
    await expect(save).toBeFocused();
    await unclipped(save);
    if (hover) await save.press('Enter'); else await save.tap();
    const remove = card.getByRole('button', { name: '저장 해제', exact: true });
    await expect(remove).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key)).toEqual([post.id]);
    if (hover) await remove.press('Enter'); else await remove.tap();
    await save.press('Shift+Tab');
    await expect(link).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await card.screenshot({ path: info.outputPath(`community-${width}-focus.png`) });
  }
  await page.getByRole('button', { name: '목록형', exact: true }).click();
  await expect(page.locator('.community-list')).toHaveAttribute('data-layout', 'list');
  await expect(footer).toBeVisible();
  await expect(card.locator('.community-card-copy > p')).toHaveCSS('opacity', '1');
  await link.focus(); await link.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/community/${post.id}$`));
  await expect(page.getByRole('heading', { name: post.title, exact: true })).toBeVisible();
});

test('revealed community bookmark failure remains readable and preserves existing saved IDs', async ({ page }) => {
  const card = await community(page);
  await card.getByRole('link', { name: `${post.title} 게시글 읽기` }).focus();
  await page.evaluate(key => {
    localStorage.setItem(key, JSON.stringify(['kept-post']));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('Quota', 'QuotaExceededError'); return original.call(this, name, value); };
  }, key);
  const save = card.getByRole('button', { name: '이 기기에 저장', exact: true });
  await save.click();
  const alert = card.getByRole('alert');
  await expect(alert).toContainText('저장 상태를 바꾸지 못했어요.');
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key)).toEqual(['kept-post']);
  await unclipped(save); await unclipped(alert);
});

test('photo-first planner cards retain full-card imagery and usable detail/add controls at three widths', async ({ page }, info) => {
  await syntheticOnly(page);
  await page.goto('/planner');
  await chooseWaveOption(page.getByRole('combobox', { name: '여행 지역', exact: true }), '창원');
  await expect(page.locator('.simple-results')).toHaveAttribute('aria-busy', 'false');
  const card = page.locator('.simple-results > .simple-place-list .simple-place-row').first();
  for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await card.scrollIntoViewIfNeeded();
    const photo = card.locator('.simple-place-photo');
    await expect(photo).toHaveCSS('position', 'absolute');
    await expect.poll(() => photo.locator('img').evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    const bounds = (await card.boundingBox())!, image = (await photo.boundingBox())!;
    expect(Math.abs(bounds.width - image.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(bounds.height - image.height)).toBeLessThanOrEqual(2);
    await unclipped(card.locator('h3'));
    await unclipped(card.locator('.simple-place-city'));
    const details = card.getByRole('button', { name: '경남도립미술관 상세정보', exact: true });
    const add = card.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true });
    for (const button of [details, add]) {
      await unclipped(button); const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      await button.click({ trial: true });
    }
    await card.screenshot({ path: info.outputPath(`planner-photo-${width}.png`) });
    await details.focus(); await details.press('Enter');
    const dialog = page.getByRole('dialog', { name: '경남도립미술관', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('경상남도 창원시 의창구');
    await dialog.getByRole('button', { name: '이 창 닫기', exact: true }).click();
    await expect(details).toBeFocused();
    await add.click();
    const undo = card.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true });
    await expect(undo).toHaveAttribute('aria-pressed', 'true');
    await undo.click();
    await expect(add).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
