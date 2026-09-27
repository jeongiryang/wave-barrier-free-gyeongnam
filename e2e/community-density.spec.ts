import { readFile } from 'node:fs/promises';
import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPublicShellApi } from './fixtures';
import { horizonPhotos } from '../features/landing/horizon-photos';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

const posts = Array.from({ length: 8 }, (_, index) => ({
  id: `density-${index}`, category: 'place', title: `여행자의 현장 기록 ${index + 1}`,
  content: '합성 검증 자료: 공식 접근성 정보와 구분되는 여행자의 경험입니다.', region: '창원',
  placeId: '1001', placeName: '경남도립미술관', authorName: '합성 여행자',
  createdAt: 1789905600000, updatedAt: 1789905600000, commentCount: index,
  likeCount: 0, likedByMe: false, isOwner: false,
}));

test('empty search explains the filter and can recover without dropping the place', async ({ page }) => {
  await mockPublicShellApi(page);
  const requests: URL[] = [];
  await page.route('**/api/community/posts**', route => {
    const url = new URL(route.request().url());
    requests.push(url);
    return route.fulfill({ json: { posts: url.searchParams.has('search') ? [] : posts, page: 1, hasMore: false } });
  });
  await page.goto('/community?placeId=1001&placeName=경남도립미술관&region=창원');
  await expect(page.locator('.community-list article')).toHaveCount(8);
  await page.getByRole('textbox', { name: '여행 후기 검색', exact: true }).fill('없는검색어');
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await expect(page.getByText('검색 조건에 맞는 게시글이 없습니다.', { exact: true })).toBeVisible();
  await expect(page.getByText('아직 등록된 후기나 질문이 없습니다.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '검색 조건 초기화', exact: true }).click();
  await expect(page.locator('.community-list article')).toHaveCount(8);
  await expect(page.getByRole('textbox', { name: '여행 후기 검색', exact: true })).toHaveValue('');
  expect(requests.at(-1)?.searchParams.get('placeId')).toBe('1001');
  expect(requests.at(-1)?.searchParams.has('search')).toBe(false);
});

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
  const controls = page.locator('.night-community-toolbar');
  const view = page.getByRole('group', { name: '게시글 보기 방식', exact: true });
  const sortbar = page.locator('#night-all-stories');
  const savedPosts = page.getByRole('button', { name: '저장한 글', exact: true });
  const clearPlace = page.getByRole('button', { name: '전체 후기 보기', exact: true });
  const search = page.getByRole('textbox', { name: '여행 후기 검색', exact: true });
  try {
    const response = await page.goto('/community?placeId=1001&placeName=경남도립미술관&region=창원', { waitUntil: 'commit' });
    expect(response?.status()).toBe(200);
    expect(await response?.headerValue('content-type')).toContain('text/html');
    await expect(controls).toBeVisible();
    await expect.poll(() => blockedScripts).toBeGreaterThan(0);
    await expect(controls).toHaveAttribute('aria-busy', 'true');
    await expect(sortbar).toHaveAttribute('aria-busy', 'true');
    await expect(savedPosts).toBeDisabled();
    for (const control of await sortbar.getByRole('group', { name: '게시글 정렬', exact: true }).getByRole('button').all()) await expect(control).toBeDisabled();
    for (const control of await view.getByRole('button').all()) await expect(control).toBeDisabled();
    // Native popover disclosure works before React; actions which mutate the
    // search must still wait for their handlers to be ready.
    await page.getByRole('button', { name: '지역별 이야기 찾기', exact: true }).click();
    const regionPopover = page.locator('.community-tools-popover:popover-open');
    await expect(regionPopover.getByRole('heading', { name: '지역별 이야기 찾기', exact: true })).toBeVisible();
    for (const control of await regionPopover.locator('.community-region-shortcuts button').all()) await expect(control).toBeDisabled();
    await regionPopover.getByRole('button', { name: '지역별 이야기 닫기', exact: true }).click();
    await expect(view.getByRole('button')).toHaveCount(2);
    for (const control of await controls.locator('button, input').all()) await expect(control).toBeDisabled();
    await expect(clearPlace).toBeDisabled();
    await expect(search).toHaveValue('');
    expect(requests).toHaveLength(0);
  } finally {
    releaseScripts();
  }
  await page.waitForLoadState('domcontentloaded');
  await expect(controls).toHaveAttribute('aria-busy', 'false');
  await expect(sortbar).toHaveAttribute('aria-busy', 'false');
  await expect(savedPosts).toBeEnabled();
  for (const control of await sortbar.getByRole('button').all()) await expect(control).toBeEnabled();
  for (const control of await controls.locator('button, input').all()) await expect(control).toBeEnabled();
  await expect(clearPlace).toBeEnabled();
  const list = page.locator('.community-list');
  await expect(list.locator('article')).toHaveCount(8);
  expect(requests.at(-1)?.searchParams.get('placeId')).toBe('1001');
  const baseline = requests.map(url => url.href);
  const compact = view.getByRole('button', { name: '목록형', exact: true });
  await compact.click();
  await expect(compact).toHaveAttribute('aria-pressed', 'true');
  await expect(list).toHaveAttribute('data-layout', 'list');
  expect(requests.map(url => url.href)).toEqual(baseline);
  await clearPlace.click();
  await expect(page.getByRole('complementary', { name: '관광지 필터', exact: true })).toHaveCount(0);
  await expect.poll(() => requests.at(-1)?.searchParams.get('placeId')).toBeNull();
  await expect(page.locator('.community-editorial-grid')).toHaveAttribute('data-layout', 'list');
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
  await expect(list).toHaveAttribute('data-layout', 'list');
  await page.getByRole('button', { name: '지역별 이야기 찾기', exact: true }).click();
  const readyRegions = page.locator('.community-tools-popover:popover-open');
  for (const control of await readyRegions.locator('.community-region-shortcuts button').all()) await expect(control).toBeEnabled();
  await readyRegions.getByRole('button', { name: '통영', exact: true }).click();
  await expect(readyRegions).toHaveCount(0);
  await expect.poll(() => requests.at(-1)?.searchParams.get('search')).toBe('통영');
  expect(requests.at(-1)?.searchParams.get('category')).toBeNull();
  expect(requests.at(-1)?.searchParams.get('placeId')).toBeNull();
  await expect(search).toHaveValue('통영');
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
  await expect(page.locator('.community-guides .community-travel-stories')).toBeVisible();
  await expect(list.locator('article')).toHaveCount(8);
  await expect(stories.locator('article')).toHaveCount(3);
  const storyLinks = await stories.locator('h3 a').evaluateAll(nodes => nodes.map(node => (node as HTMLAnchorElement).getAttribute('href')));
  const photos = await stories.locator('.editorial-photo img').evaluateAll(nodes => nodes.map(node => ({ src: node.getAttribute('src'), alt: node.getAttribute('alt') })));
  const captions = await stories.locator('figcaption').allTextContents();
  expect(photos).toHaveLength(3); expect(captions).toHaveLength(3);
  const baseline = [...requests], view = page.getByRole('group', { name: '게시글 보기 방식', exact: true });
  for (const width of [1440, 960, 601, 600, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const mobile = width <= 600;
    for (const [layout, name, columns] of [
      ['cards', '카드형', mobile ? 1 : 2],
      
      ['list', '목록형', 1],
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
      expect(await stories.locator('.editorial-photo img').evaluateAll(nodes => nodes.map(node => ({ src: node.getAttribute('src'), alt: node.getAttribute('alt') })))).toEqual(photos);
      expect(await stories.locator('figcaption').allTextContents()).toEqual(captions);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}px ${layout} must fit the viewport`).toBeLessThanOrEqual(1);
      expect(requests).toEqual(baseline);
    }
    if (width === 1440 || width === 390) await page.locator('.community-workspace').screenshot({ path: test.info().outputPath(`community-density-${width}.png`) });
  }
  expect((await new AxeBuilder({ page }).include('.night-community-toolbar').include('.night-sortbar').include('.community-list').analyze()).violations).toEqual([]);
  // Attribution moved to the shared source page; layout changes must retain
  // the same photographs and the real author/license behind its visible link.
  await page.locator('.wave-balanced-footer a[href="/policies#content-credits"]').click();
  for (const photo of Object.values(horizonPhotos)) {
    const credit = page.locator('#content-credits li').filter({ has: page.locator(`img[src="${photo.image}"]`) });
    await expect(credit).toContainText(photo.photographer);
    await expect(credit.locator(`a[href="${photo.sourceUrl}"]`)).toBeVisible();
    await expect(credit.locator(`a[href="${photo.licenseUrl}"]`)).toHaveText(photo.license);
  }
  expect(errors).toEqual([]);
});

test('structured service errors show readable recovery copy', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/community/posts?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'unavailable' } }) }));
  await page.goto('/community');
  const error = page.locator('.community-state[role=alert]');
  await expect(error).toContainText('잠시 후 다시 시도해 주세요.');
  await expect(error).not.toContainText('[object Object]');
  await expect(error.getByRole('button', { name: '다시 시도' })).toBeEnabled();
});


test('loading cards match the final grid and photo loading never draws fake text behind a post', async ({page}, info) => {
  await mockPublicShellApi(page);
  let releasePosts = () => {}, releasePhoto = () => {};
  const postGate = new Promise<void>(resolve => { releasePosts = resolve; });
  const photoGate = new Promise<void>(resolve => { releasePhoto = resolve; });
  await page.route('**/api/community/posts**', async route => { await postGate; await route.fulfill({json:{posts:posts.slice(0,4),page:1,hasMore:false}}); });
  await page.route('**/api/wave?**', async route => {
    if(new URL(route.request().url()).searchParams.get('action') !== 'spot-photo') return route.fallback();
    await photoGate;await route.fulfill({json:{image:'https://tong.visitkorea.or.kr/loading-check.webp'}});
  });
  const bitmap = await readFile('public/media/wave-story/hero-coast-small.webp');
  await page.route('https://tong.visitkorea.or.kr/loading-check.webp', route => route.fulfill({contentType:'image/webp',body:bitmap}));
  try {
    await page.goto('/community');
    const loading=page.locator('.community-skeletons');await loading.scrollIntoViewIfNeeded();
    await expect(loading.locator('article')).toHaveCount(4);
    const columns=await loading.evaluate(e=>getComputedStyle(e).gridTemplateColumns);
    await expect(loading.locator('article').first()).toHaveCSS('animation-name','none');
    await loading.screenshot({path:info.outputPath('community-loading-grid.png')});
    releasePosts();
    const grid=page.locator('.community-list:not(.community-skeletons)');
    await expect(grid.locator('article')).toHaveCount(4);
    await expect(grid).toHaveCSS('grid-template-columns',columns);
    await expect(grid.locator('.smart-image-skeleton')).toHaveCount(4);
    await expect(grid.locator('.smart-image-skeleton i,.smart-image-skeleton b')).toHaveCount(0);
    await expect(grid.getByRole('heading',{name:'여행자의 현장 기록 1'})).toBeVisible();
    await grid.screenshot({path:info.outputPath('community-photo-loading.png')});
    releasePhoto();
    await expect(grid.locator('.smart-image-skeleton')).toHaveCount(0);
    await expect(grid.locator('.smart-image-fallback')).toHaveCount(0);
    expect(await grid.locator('img').first().evaluate(e=>(e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  } finally {releasePosts();releasePhoto();}
});
