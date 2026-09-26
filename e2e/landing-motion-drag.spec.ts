import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
import { expectNoOverflow, pauseCurrentClock, prepareStory, storyReady } from './landing-contract';
import { closeNaruTool, naruDialog } from './naru-tool-fixtures';

async function landing(page: Page, motion: 'reduce' | 'no-preference' = 'reduce') {
  await mockPlannerApi(page);
  await prepareStory(page);
  await page.emulateMedia({ reducedMotion: motion });
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: true } }));
  await page.route('**/api/festivals?*', route => route.fulfill({ json: { items: Array.from({ length: 3 }, (_, index) => ({ id: String(7001 + index), name: `검증 축제 ${index + 1}`, image: '/media/night/festival.webp', startDate: '2026-10-01', endDate: '2026-10-03', city: '진주' })) } }));
  await page.goto('/');
  await storyReady(page);
}

test('headline stays readable and stable without playback controls across motion preferences and viewports', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.clock.install();
  await landing(page, 'no-preference');
  const title = page.getByRole('heading', { level: 1, name: '더 넓은 세상을 함께, WAVE', exact: true });
  const phrase = page.locator('.night-hero-phrase');
  const search = page.getByRole('combobox', { name: '어디로 떠나고 싶으세요?', exact: true });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await search.focus();
  await pauseCurrentClock(page);
  await page.clock.runFor(24_000);
  await expect(phrase).toHaveText('더 넓은 세상을함께, WAVE');
  await expect(title).toHaveCount(1);
  await expect(phrase).toHaveAttribute('aria-hidden', 'true');
  await expect(search).toBeFocused();
  await expect(page.locator('.night-hero-motion')).toHaveCount(0);

  for (const width of [320, 390, 960, 1440, 2560]) {
    await page.setViewportSize({ width, height: 960 });
    const box = (await title.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    await expectNoOverflow(page);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'calm');
  await page.clock.runFor(12_000);
  await expect(phrase).toHaveText('더 넓은 세상을함께, WAVE');
  expect(await phrase.evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await expect(title).toHaveCount(1);
});

async function drag(page: Page, target: Locator, dx: number, dy: number) {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 5 });
  await page.mouse.up();
}
async function withinViewport(page: Page, panel: Locator, gap = 8) {
  const box = (await panel.boundingBox())!, viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(gap - 1);
  expect(box.y).toBeGreaterThanOrEqual(gap - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - gap + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - gap + 1);
}

test('mouse header dragging stays bounded and resets on size, close and compact viewport without turning header buttons into handles', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await landing(page);
  const open = page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true });
  await open.click();
  const panel = naruDialog(page);
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: '대화창 작게 보기', exact: true }).click();
  await expect(panel).toHaveClass(/naru-compact/);
  const handle = panel.locator('.naru-heading > div > strong');
  const initial = (await panel.boundingBox())!;
  await drag(page, handle, -120, 50);
  await expect(panel).toHaveAttribute('data-moved', 'true');
  const moved = (await panel.boundingBox())!;
  expect(moved.x).toBeLessThan(initial.x - 100);
  expect(moved.y).toBeGreaterThan(initial.y + 35);
  await drag(page, handle, -2000, -2000);
  await withinViewport(page, panel);
  await drag(page, handle, 3000, 3000);
  await withinViewport(page, panel);
  await page.setViewportSize({ width: 960, height: 850 });
  await withinViewport(page, panel);
  await panel.getByRole('button', { name: '대화창 크게 보기', exact: true }).click();
  await expect(panel).not.toHaveAttribute('data-moved', 'true');
  await withinViewport(page, panel);
  await panel.getByRole('button', { name: '대화창 작게 보기', exact: true }).click();
  await drag(page, panel.getByRole('button', { name: '저장한 여행 작업 열기', exact: true }), 65, 50);
  await expect(panel).not.toHaveAttribute('data-moved', 'true');
  await drag(page, handle, -80, 15);
  await expect(panel).toHaveAttribute('data-moved', 'true');
  await closeNaruTool(page);
  await open.click();
  await expect(panel).toBeVisible();
  await expect(panel).not.toHaveAttribute('data-moved', 'true');
  await page.setViewportSize({ width: 799, height: 900 });
  await drag(page, handle, -100, 40);
  await expect(panel).not.toHaveAttribute('data-moved', 'true');
  await withinViewport(page, panel, 0);
  await expectNoOverflow(page);
});

test('lower stories follow a vertical reading order, festival copy overlays photographs and the GitHub mark is centered', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await landing(page);
  const stories = page.locator('.night-discover-grid > section');
  await expect(stories).toHaveCount(3);
  await stories.nth(1).scrollIntoViewIfNeeded();
  const boxes = await Promise.all((await stories.all()).map(story => story.boundingBox()));
  for (let index = 1; index < boxes.length; index++) expect(boxes[index]!.y).toBeGreaterThanOrEqual(boxes[index - 1]!.y + boxes[index - 1]!.height);
  const cards = page.locator('.night-festival-preview-cards > a');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    const image = (await card.locator('img').boundingBox())!;
    const copy = (await card.locator('.night-festival-preview-copy').boundingBox())!;
    expect(copy.x).toBeGreaterThanOrEqual(image.x - 1);
    expect(copy.y).toBeGreaterThanOrEqual(image.y - 1);
    expect(copy.y + copy.height).toBeLessThanOrEqual(image.y + image.height + 1);
    await expect(card).toHaveAttribute('href', '/festivals');
  }
  const github = page.getByRole('link', { name: 'WAVE GitHub 저장소 열기', exact: true });
  await github.scrollIntoViewIfNeeded();
  const circle = (await github.boundingBox())!, mark = (await github.locator('svg').boundingBox())!;
  expect(circle.width).toBeGreaterThanOrEqual(44); expect(circle.height).toBeGreaterThanOrEqual(44);
  expect(Math.abs(circle.x + circle.width / 2 - mark.x - mark.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(circle.y + circle.height / 2 - mark.y - mark.height / 2)).toBeLessThanOrEqual(1);
  await github.focus(); await expect(github).toBeFocused();
  await expectNoOverflow(page);
});

test('cold Naru loading stays a dark bounded dismissible surface instead of flashing full-width skeleton lines', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let delayedModules = 0;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (route.request().resourceType() === 'script' && (/\/app\/planner\/page\.tsx$/.test(url.pathname) || /\/assets\/planner-[^/]+\.js$/.test(url.pathname))) {
      delayedModules++;
      await gate;
    }
    await route.fallback();
  });
  try {
    await landing(page);
    await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
    await expect.poll(() => delayedModules).toBeGreaterThan(0);
    const loading = page.locator('.global-workspace-loading');
    await expect(loading.getByRole('status')).toContainText('여행과 나루를 준비하고 있어요.');
    await expect(loading.locator('.wave-skeleton-lines')).toHaveCount(0);
    const colors = await loading.evaluate(node => ({ background: getComputedStyle(node).backgroundColor, position: getComputedStyle(node).position }));
    expect(colors.position).toBe('fixed');
    const channels = colors.background.match(/\d+/g)!.slice(0, 3).map(Number);
    expect(Math.max(...channels)).toBeLessThan(80);
    expect((await loading.boundingBox())!.width).toBeLessThanOrEqual(440);
    await withinViewport(page, loading);
    await loading.getByRole('button', { name: '나루 준비 닫기', exact: true }).click();
    await expect(loading).toBeHidden();
    await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true })).toBeVisible();
    release();
    await expect(page.locator('.global-travel-workspace .planner-page')).toBeAttached();
    // Let the lazy workspace's launch effect run, so an immediate pre-mount
    // absence cannot hide a late reopen after cancellation.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(loading).toHaveCount(0);
    await expect(naruDialog(page)).toBeHidden();
    await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
    await expect(naruDialog(page)).toBeVisible();
    await closeNaruTool(page);
    await expect(naruDialog(page)).toBeHidden();
    await expectNoOverflow(page);
  } finally { release(); }
});
