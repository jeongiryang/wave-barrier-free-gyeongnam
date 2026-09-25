import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, plan } from './fixtures';
import { prepareStory, storyReady } from './landing-contract';

const festival = { ...plan.places[0], id: '3001', contentTypeId: '15', name: '합성 바다 축제', image: '/media/night/festival.webp', startDate: '2026-09-20', endDate: '2026-09-25', state: 'ongoing', facilityState: 'available', accessibility: [] };
async function setup(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-09-21T03:00:00Z'));
  await prepareStory(page); await mockPlannerApi(page);
  await page.route('**/api/festivals?**', route => route.fulfill({ json: { items: [festival, { ...festival, id: '3002', name: '합성 다음 축제', state: 'upcoming' }], checkedAt: '2026-09-21T03:00:00Z', state: 'live', partial: false } }));
  await page.route('**/api/community/posts**', route => route.fulfill({ json: { posts: [{ id: 'mobile-real-post', title: '통영 여행 이야기', content: '방문 날짜와 이동 조건을 함께 기록했습니다.', category: 'review', region: '통영', authorName: '여행자', createdAt: '2026-09-20T10:00:00Z', likeCount: 2, commentCount: 1 }], page: 1, hasMore: false } }));
}
for (const route of ['/', '/planner', '/community', '/festivals']) test(`mobile reference ${route}: compact header and functional content`, async ({ page }, info) => {
  await setup(page); await page.goto(route);
  if (route === '/') await storyReady(page);
  // The approved mobile header has a 44px action row and a navigation row.
  await expect(page.locator('.wave-header')).toHaveCSS('height', '96px');
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (route === '/') {
    await expect(page.locator('.landing-opening .award-panorama')).toBeVisible();
    await expect(page.locator('.landing-hero-copy h1')).toHaveCSS('font-size', '32px');
    const shortcuts = page.locator('.night-feature-links');
    await expect.poll(() => shortcuts.evaluate(node => node.previousElementSibling?.classList.contains('landing-opening'))).toBe(true);
    for (const link of (await shortcuts.getByRole('link').all()).slice(0, 4)) {
      await link.scrollIntoViewIfNeeded();
      const box = (await link.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(844);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expect(shortcuts.locator('strong').first()).toHaveCSS('font-size', '14px');
  } else if (route === '/planner') {
    await expect(page.locator('.simple-region-grid')).toBeVisible();
    await expect.poll(() => page.locator('.simple-region-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(3);
    await expect(page.locator('#conditions')).toHaveAttribute('aria-busy', 'false');
    const regionCards = page.locator('#planner-region-options .simple-region-link');
    await expect(regionCards).toHaveCount(6);
    // The 840px opening now precedes discovery; every region remains reachable.
    await regionCards.last().scrollIntoViewIfNeeded();
    const lastRegion = (await regionCards.last().boundingBox())!;
    expect(lastRegion.y).toBeGreaterThanOrEqual(0);
    expect(lastRegion.y + lastRegion.height).toBeLessThanOrEqual(844);
    expect(lastRegion.height).toBeGreaterThanOrEqual(44);
    const metadata = page.locator('.simple-region-metadata').first();
    await expect(metadata.locator('.simple-region-credit')).toBeHidden();
    const metadataToggle = metadata.getByRole('button');
    await metadataToggle.focus(); await page.keyboard.press('Enter');
    await expect(metadata.locator('.simple-region-credit')).toBeVisible();
    expect(await metadata.locator('.simple-region-credit').getAttribute('href')).toMatch(/^https?:/);
    await metadataToggle.click();
    await expect(page.locator('.night-planner-region-map')).toBeHidden();
    await page.getByRole('button', { name: '지도에서 지역 고르기', exact: false }).click();
    await expect(page.locator('.night-planner-region-map')).toBeVisible();
    await page.getByRole('button', { name: '지도에서 지역 고르기', exact: false }).click();
  } else if (route === '/community') {
    await expect(page.locator('.community-list article')).toHaveCount(1);
    await expect(page.getByRole('link', { name: '통영 여행 이야기 게시글 읽기' })).toBeVisible();
    const card = page.locator('.community-list article');
    const cover = page.locator('.community-story-cover');
    await expect(cover).toHaveCSS('position', 'absolute');
    // The local-save action is outside the photographic story link.
    const cardBounds = (await card.locator(':scope > a').boundingBox())!, coverBounds = (await cover.boundingBox())!;
    expect(Math.abs(coverBounds.height - cardBounds.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(coverBounds.width - cardBounds.width)).toBeLessThanOrEqual(2);
    expect(cardBounds.height).toBeGreaterThanOrEqual(340);
  } else {
    await expect(page.locator('.festival-card')).toHaveCount(2);
    await expect(page.getByRole('region', { name: '축제 찾기', exact: true })).toBeHidden();
    await page.getByRole('button', { name: '축제 검색 조건', exact: false }).click();
    await expect(page.getByLabel('언제부터', { exact: true })).toHaveValue('2026-09-21');
    await page.getByRole('button', { name: '축제 검색 조건', exact: false }).click();
    await page.getByRole('group', { name: '축제 진행 상태' }).getByRole('button', { name: '예정', exact: true }).click();
    await expect(page.locator('.festival-card')).toHaveCount(1);
    await expect(page.locator('.festival-card')).toContainText('합성 다음 축제');
  }
  const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(item => ['serious', 'critical'].includes(item.impact || ''));
  expect(violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
  await page.screenshot({ path: info.outputPath(`${route.replaceAll('/', '') || 'home'}-390.png`), fullPage: true });
});

test('festival duplicate confirmation preserves the trip until a date choice and opens the exact visit', async ({ page }) => {
  await setup(page);
  const schedule = { travelStart: '2026-09-20', travelEnd: '2026-09-22', dayStartTime: '10:00', scheduleAssignments: { '3001': '2026-09-20' }, visitMinutesByPlaceId: { '3001': 120 }, fixedVisits: {} };
  await page.addInitScript(({ event, schedule }) => {
    if (!localStorage.getItem('wave-current-trip-v1')) localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: { 'wave-planner-region-v1': event.city, 'wave-saved-places': '["3001"]', 'wave-saved-place-catalog-v1': JSON.stringify([event]), 'wave-trip-order-v1': '{"mode":"manual","ids":["3001"]}', 'wave-trip-schedule-v1': JSON.stringify(schedule) } }));
  }, { event: festival, schedule });
  await page.route('**/api/wave?**', route => new URL(route.request().url()).searchParams.get('action') === 'places' ? route.fulfill({ json: { places: [festival], missing: [] } }) : route.fallback());
  await page.goto('/festivals');
  const card = page.locator('.festival-card').filter({ has: page.getByRole('heading', { name: festival.name, exact: true }) });
  await card.locator('.night-festival-more > summary').click();
  await card.getByLabel('방문 날짜').fill('2026-09-21');
  const before = await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'));
  await card.getByRole('button', { name: '내 일정에 담기', exact: true }).click();
  const confirmation = page.getByRole('region', { name: '이미 담긴 축제' });
  await expect(confirmation).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(before);
  await confirmation.getByRole('button', { name: '선택 날짜로 변경', exact: true }).click();
  await expect(confirmation).toContainText('기존 방문일 2026-09-21');
  const after = await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('wave-current-trip-v1')!).values['wave-trip-schedule-v1']));
  expect(after).toEqual({ ...schedule, scheduleAssignments: { '3001': '2026-09-21' } });
  await confirmation.getByRole('link', { name: '기존 일정 보기' }).click();
  await expect(page.locator('#itinerary-stop-3001 h3 button')).toBeFocused();
});

test('960px dates and place detail use the available width; desktop layout remains expanded', async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 960, height: 900 }); await page.goto('/festivals');
  const dates = page.locator('.night-date-pair input');
  await expect(dates).toHaveCount(2);
  for (const input of await dates.all()) expect((await input.boundingBox())!.width).toBeGreaterThanOrEqual(140);
  await page.goto('/planner?region=창원');
  await page.getByRole('button', { name: '경남도립미술관 상세 보기', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /경남도립미술관/ });
  await expect(dialog).toBeVisible(); expect((await dialog.boundingBox())!.width).toBeGreaterThanOrEqual(930);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
  for (const width of [1440, 2560, 3840]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator('.night-planner-region-map')).toBeVisible();
    expect(await page.locator('.night-planner-hero').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(2);
  }
});
