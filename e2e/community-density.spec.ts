import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

const posts = Array.from({ length: 8 }, (_, index) => ({
  id: `density-${index}`, category: 'place', title: `여행자의 현장 기록 ${index + 1}`,
  content: '합성 검증 자료: 공식 접근성 정보와 구분되는 여행자의 경험입니다.', region: '창원',
  placeId: '1001', placeName: '경남도립미술관', authorName: '합성 여행자',
  createdAt: 1789905600000, updatedAt: 1789905600000, commentCount: index,
  likeCount: 0, likedByMe: false, isOwner: false,
}));

async function expectColumns(grid: Locator, columns: number) {
  await expect(grid).toBeVisible();
  await expect.poll(() => grid.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(/\s+/).length)).toBe(columns);
  const boxes = await grid.locator(':scope > article').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, right: box.right, width: box.width };
  }));
  expect(boxes.length).toBeGreaterThan(0);
  expect(boxes.slice(0, columns).every(box => Math.abs(box.y - boxes[0].y) <= 1)).toBe(true);
  for (let index = 1; index < Math.min(columns, boxes.length); index++) expect(boxes[index].x).toBeGreaterThanOrEqual(boxes[index - 1].right - 1);
  for (const box of boxes) { expect(box.width).toBeGreaterThan(80); expect(box.x).toBeGreaterThanOrEqual(-1); }
}

test('community density changes both real post and editorial grids without changing records or fetching again', async ({ page }) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockPublicShellApi(page);
  await page.route('**/api/community/posts**', route => {
    requests.push(route.request().url());
    return route.fulfill({ json: { posts, page: 1, hasMore: false } });
  });
  await page.goto('/community');
  const list = page.locator('.community-list'), stories = page.locator('.community-editorial-grid');
  await expect(list.locator('article')).toHaveCount(8);
  await expect(stories.locator('article')).toHaveCount(3);
  const storyLinks = await stories.locator('h3 a').evaluateAll(nodes => nodes.map(node => (node as HTMLAnchorElement).getAttribute('href')));
  const credits = await stories.locator('figcaption a').evaluateAll(nodes => nodes.map(node => ({ href: (node as HTMLAnchorElement).href, text: node.textContent })));
  expect(credits.length).toBeGreaterThan(0);
  const baseline = [...requests], view = page.getByRole('group', { name: '게시글 보기 방식', exact: true });
  for (const width of [1440, 960, 601, 600, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const mobile = width <= 600;
    for (const [layout, name, columns] of [
      ['cards', mobile ? '1열' : '2열', mobile ? 1 : 2],
      ['compact', mobile ? '2열' : '4열', mobile ? 2 : 4],
      ['list', '목록', 1],
    ] as const) {
      const button = view.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible(); await button.focus(); await button.press('Enter');
      await expect(button).toBeFocused(); await expect(button).toHaveAttribute('aria-pressed', 'true');
      const target = (await button.boundingBox())!;
      expect(target.height).toBeGreaterThanOrEqual(44); expect(target.width).toBeGreaterThanOrEqual(44);
      await expect(list).toHaveAttribute('data-layout', layout); await expect(stories).toHaveAttribute('data-layout', layout);
      await expectColumns(list, columns); await expectColumns(stories, columns);
      await expect(list.locator('h3')).toHaveText(posts.map(post => post.title));
      expect(await list.locator('article > a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).toEqual(posts.map(post => `/community/${post.id}`));
      expect(await stories.locator('h3 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).toEqual(storyLinks);
      expect(await stories.locator('figcaption a').evaluateAll(nodes => nodes.map(node => ({ href: (node as HTMLAnchorElement).href, text: node.textContent })))).toEqual(credits);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      expect(requests).toEqual(baseline);
    }
    if (width === 1440 || width === 390) await page.locator('.community-workspace').screenshot({ path: test.info().outputPath(`community-density-${width}.png`) });
  }
  expect((await new AxeBuilder({ page }).include('.community-controls').include('.community-list').analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
