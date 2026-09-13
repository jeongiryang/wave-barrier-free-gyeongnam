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

test('community server controls wait for hydration before layout, filter and search actions work', async ({ page }) => {
  const errors: string[] = [], requests: URL[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockPublicShellApi(page);
  await page.route('**/api/community/posts**', route => {
    requests.push(new URL(route.request().url()));
    return route.fulfill({ json: { posts, page: 1, hasMore: false } });
  });
  let releaseScripts = () => {}, blockedScripts = 0;
  const scriptGate = new Promise<void>(resolve => { releaseScripts = resolve; });
  // Hold executable bundles, keeping the server-rendered DOM observable without
  // substituting its HTML or manipulating the app's hydration state.
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'script') return route.fallback();
    blockedScripts += 1;
    await scriptGate;
    return route.fallback();
  });
  const controls = page.locator('.community-controls');
  const view = page.getByRole('group', { name: '게시글 보기 방식', exact: true });
  const clearPlace = page.getByRole('button', { name: '전체 후기 보기', exact: true });
  const search = page.getByRole('textbox', { name: '여행 후기 검색', exact: true });
  try {
    const response = await page.goto('/community?placeId=1001&placeName=경남도립미술관&region=창원', { waitUntil: 'commit' });
    expect(response?.status()).toBe(200);
    expect(await response?.headerValue('content-type')).toContain('text/html');
    await expect(controls).toBeVisible();
    await expect.poll(() => blockedScripts).toBeGreaterThan(0);
    await expect(controls).toHaveAttribute('aria-busy', 'true');
    await expect(view.getByRole('button')).toHaveCount(3);
    for (const control of await controls.locator('button, input').all()) await expect(control).toBeDisabled();
    await expect(clearPlace).toBeDisabled();
    await expect(search).toHaveValue('');
    expect(requests).toHaveLength(0);
  } finally {
    releaseScripts();
  }
  await page.waitForLoadState('domcontentloaded');
  await expect(controls).toHaveAttribute('aria-busy', 'false');
  for (const control of await controls.locator('button, input').all()) await expect(control).toBeEnabled();
  await expect(clearPlace).toBeEnabled();
  const list = page.locator('.community-list');
  await expect(list.locator('article')).toHaveCount(8);
  expect(requests.at(-1)?.searchParams.get('placeId')).toBe('1001');
  const baseline = requests.map(url => url.href);
  const compact = view.getByRole('button', { name: page.viewportSize()!.width <= 600 ? '2열' : '4열', exact: true });
  await compact.click();
  await expect(compact).toHaveAttribute('aria-pressed', 'true');
  await expect(list).toHaveAttribute('data-layout', 'compact');
  expect(requests.map(url => url.href)).toEqual(baseline);
  await clearPlace.click();
  await expect(page.getByRole('complementary', { name: '관광지 필터', exact: true })).toHaveCount(0);
  await expect.poll(() => requests.at(-1)?.searchParams.get('placeId')).toBeNull();
  await expect(page.locator('.community-editorial-grid')).toHaveAttribute('data-layout', 'compact');
  await controls.getByRole('button', { name: '여행 질문', exact: true }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get('category')).toBe('general');
  await expect(list.locator('article')).toHaveCount(8);
  const beforeSearch = requests.map(url => url.href);
  await search.fill('박물관');
  expect(requests.map(url => url.href)).toEqual(beforeSearch);
  await controls.getByRole('button', { name: '검색', exact: true }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get('search')).toBe('박물관');
  expect(requests.at(-1)?.searchParams.get('category')).toBe('general');
  expect(requests.at(-1)?.searchParams.get('placeId')).toBeNull();
  await expect(list.locator('h3')).toHaveText(posts.map(post => post.title));
  await expect(list).toHaveAttribute('data-layout', 'compact');
  expect(errors).toEqual([]);
});

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
