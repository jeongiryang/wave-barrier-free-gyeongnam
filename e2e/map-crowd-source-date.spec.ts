import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, openItinerary, plan, showItineraryMap } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function showCrowdMap(page: Page) {
  const compact = page.viewportSize()!.width < 1024;
  const view = page.getByRole('group', { name: '일정 보기 방식', exact: true });
  // Resizing returns before React handles matchMedia's change event. Wait for
  // the responsive controls before the shared helper checks their visibility.
  await expect(view).toHaveCount(compact ? 1 : 0);
  if (compact) await expect(view).toBeVisible();
  await showItineraryMap(page);
  if (compact) await expect(view.getByRole('button', { name: '지도', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.simple-itinerary-board')).toHaveAttribute('data-map', 'true');
}

for (const baseYmd of ['20260918', '', '20260230']) test(`지도 혼잡 예측에 ${baseYmd === '20260918' ? '유효한 기준일' : baseYmd ? '잘못된 기준일의 미확인 상태' : '누락된 기준일의 미확인 상태'}과 제공처를 표시한다`, async ({ page }, info) => {
  const crowd = { rate: 76.7, baseYmd, place: plan.places[0].name };
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic API not configured' } }));
  await mockPlannerApi(page, { preserveView: true, crowdRate: crowd.rate }); await mockPublicShellApi(page);
  await page.route('**/api/wave?**', route => {
    const action = new URL(route.request().url()).searchParams.get('action');
    if (action === 'plan') return route.fulfill({ json: { ...plan, crowd } });
    if (action === 'crowd') return route.fulfill({ json: { crowd } });
    return route.fallback();
  });
  await page.goto('/planner');
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
  await openItinerary(page, { start: '2026-09-21', end: '2026-09-21' });
  await showCrowdMap(page);
  const legend = page.getByRole('complementary', { name: '혼잡 예측', exact: true });
  await expect(legend).toContainText('76.7%');
  await expect(legend).toContainText('한국관광공사 예측');
  await expect(legend).toContainText('실시간 인원·대기시간 아님');
  if (baseYmd === '20260918') {
    await expect(legend).toContainText('기준일 2026-09-18');
    await expect(legend.locator('time')).toHaveAttribute('datetime', '2026-09-18');
  } else {
    await expect(legend).toContainText('기준일 미확인');
    await expect(legend.locator('time')).toHaveCount(0);
    await expect(legend).not.toContainText('기준일 2026-09-21');
  }
  for (const width of info.project.name.startsWith('mobile') ? [390, 320] : [1440, 960, 390, 320, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await showCrowdMap(page);
    await expect(legend.locator('.map-crowd-evidence')).toBeVisible();
    expect(await legend.locator('.map-crowd-evidence').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    // Put the evidence near the fixed launcher's vertical range, as when the
    // visitor scrolls to the map bottom. Inspect text, not transparent padding.
    await legend.evaluate(node => window.scrollBy(0, node.getBoundingClientRect().bottom - innerHeight + 12));
    await expect(page.locator('.naru-launcher')).toBeVisible();
    const geometry = await legend.locator('.map-crowd-evidence').evaluate(node => {
      const launcher = document.querySelector('.naru-launcher')!.getBoundingClientRect();
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const overlaps: string[] = [];
      let text: Node | null;
      while ((text = walker.nextNode())) {
        if (!text.textContent?.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(text);
        for (const rect of range.getClientRects()) {
          if (Math.min(rect.right, launcher.right) > Math.max(rect.left, launcher.left) && Math.min(rect.bottom, launcher.bottom) > Math.max(rect.top, launcher.top)) overlaps.push(text.textContent);
        }
      }
      const legendBox = node.closest('.map-crowd-legend')!.getBoundingClientRect();
      const map = node.closest('.route-map-shell')!.getBoundingClientRect();
      return { overlaps, legendHeight: legendBox.height, mapHeight: map.height };
    });
    expect(geometry.overlaps, `${width}px crowd evidence must remain readable beside the fixed launcher`).toEqual([]);
    expect(geometry.legendHeight, `${width}px map retains room for places and routes`).toBeLessThanOrEqual(geometry.mapHeight * .4);
    if (baseYmd === '20260918') await legend.screenshot({ path: info.outputPath(`crowd-evidence-${width}.png`) });
  }
});
