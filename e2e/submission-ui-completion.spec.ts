import { chooseWaveOption } from './wave-select-fixture';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi, openItinerary, plan } from './fixtures';
import { naruDialog, openNaruTool } from './naru-tool-fixtures';
import { prepareStory, storyReady } from './landing-contract';
import { waitForRenderedEntry } from './painted-contrast';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function prepare(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic API not configured' } }));
  await mockPlannerApi(page); await mockPublicShellApi(page);
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: false } }));
  await page.goto('/planner');
  await chooseWaveOption(page.getByRole('combobox', { name: '여행 지역', exact: true }), '창원');
  await expect(page.locator('.simple-place-list .simple-place-row')).toHaveCount(2);
}
async function tool(page: Page, label: string) {
  await openNaruTool(page, label);
}

test('나루 편의 비교가 선택 모드를 열고 비교할 시설은 여행 조건을 바꾸지 않는다', async ({ page }) => {
  await prepare(page);
  const before = await page.evaluate(() => sessionStorage.getItem('wave-session-facilities-v1'));
  await tool(page, '편의 비교');
  await expect(naruDialog(page)).toBeVisible();
  await expect(page.getByRole('button', { name: '비교 선택 닫기', exact: true })).toBeVisible();
  const choices = page.locator('.simple-place-list').getByRole('checkbox', { name: /비교/ });
  await choices.nth(0).check(); await choices.nth(1).check();
  await page.getByRole('button', { name: '선택한 2곳 비교', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '편의를 나란히 살펴보세요.', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('checkbox', { name: '승강기', exact: true }).check();
  await expect(dialog.getByRole('rowheader', { name: '승강기', exact: true })).toBeVisible();
  await expect(dialog.locator('tr').filter({ has: page.getByRole('rowheader', { name: '승강기', exact: true }) }).locator('td[data-state="unknown"]')).toHaveCount(2);
  await dialog.getByRole('checkbox', { name: '승강기', exact: true }).uncheck();
  await expect(dialog.getByRole('rowheader', { name: '승강기', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('wave-session-facilities-v1'))).toBe(before);
  expect((await new AxeBuilder({ page }).include('.place-comparison-dialog').analyze()).violations).toEqual([]);
});

test('나루 캘린더 도구가 공유 메뉴를 직접 열고 사용자 클릭으로 파일을 받는다', async ({ page }) => {
  await prepare(page);
  await page.locator('.simple-place-add').first().click();
  await openItinerary(page, { start: '2026-10-14' });
  await tool(page, '캘린더');
  const share = page.getByRole('dialog', { name: '여행 공유', exact: true });
  await expect(share).toBeVisible(); await expect(naruDialog(page)).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await share.getByRole('button', { name: '캘린더', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe('wave-trip.ics');
  await expect(share).toContainText('캘린더 파일을 내려받았어요.');
});

test('소개 마지막 영역과 푸터가 화면 폭에 맞고 수평 넘침이 없다', async ({ page }) => {
  await prepareStory(page); await page.goto('/'); await storyReady(page);
  const footer = page.locator('.landing-page .landing-finale > .wave-balanced-footer');
  await footer.scrollIntoViewIfNeeded(); await expect(footer).toBeVisible();
  await waitForRenderedEntry(page.locator('#closing .landing-closing-copy'));
  const measured = await footer.evaluate(node => {
    const box = node.getBoundingClientRect();
    const parent = node.closest('.landing-section-pair')!.getBoundingClientRect();
    return { left: box.left, right: box.right, parentLeft: parent.left, parentRight: parent.right, width: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      background: getComputedStyle(node).backgroundColor };
  });
  expect(measured.left).toBeGreaterThanOrEqual(measured.parentLeft);
  expect(measured.right).toBeLessThanOrEqual(measured.parentRight);
  expect(Math.abs((measured.left + measured.right) / 2 - (measured.parentLeft + measured.parentRight) / 2)).toBeLessThanOrEqual(1);
  expect(measured.overflow).toBe(false); expect(measured.background).toBe('rgba(0, 0, 0, 0)');
  // The scenic layout uses a compact closing edge. Check readable containment
  // and separation from the footer instead of restoring the previous padding.
  const closingGeometry = await page.locator('.landing-finale').evaluate(node => {
    const finale = node.getBoundingClientRect();
    const section = node.closest('.landing-section-pair')!.getBoundingClientRect();
    const closing = node.querySelector('#closing')!.getBoundingClientRect();
    const footer = node.querySelector('.wave-balanced-footer')!.getBoundingClientRect();
    const copy = Array.from(node.querySelectorAll('#closing h2, #closing p')).map(element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, height: box.height };
    });
    return { top: finale.top, bottom: section.bottom, closingBottom: closing.bottom, footerTop: footer.top, footerBottom: footer.bottom, width: innerWidth, copy };
  });
  expect(closingGeometry.copy).toHaveLength(2);
  for (const copy of closingGeometry.copy) {
    expect(copy.height).toBeGreaterThan(0);
    expect(copy.left).toBeGreaterThanOrEqual(16);
    expect(copy.right).toBeLessThanOrEqual(closingGeometry.width - 16);
    expect(copy.top).toBeGreaterThanOrEqual(closingGeometry.top);
    expect(copy.bottom).toBeLessThanOrEqual(closingGeometry.closingBottom + 1);
  }
  expect(closingGeometry.footerTop).toBeGreaterThanOrEqual(closingGeometry.closingBottom - 1);
  expect(closingGeometry.bottom - closingGeometry.footerBottom).toBeGreaterThanOrEqual(16);
  for (const link of await footer.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await new AxeBuilder({ page }).include('.landing-page').analyze()).violations).toEqual([]);
});

test('공식 탐색 후보가 정확한 이름으로 조회되고 기존 직접 검색 초안을 보존한다', async ({ page }) => {
  await mockPlannerApi(page); await mockPublicShellApi(page);
  await page.route('**/api/wave?**', route => {
    if (new URL(route.request().url()).searchParams.get('action') !== 'plan') return route.fallback();
    return route.fulfill({ json: { ...plan, additionalExploration: [{ name: '경남도립미술관', scope: '창원', source: '관광 통계', baseYm: '202607', relatedTo: '' }] } });
  });
  let query = '';
  await page.route('**/api/location-search?**', route => {
    query = new URL(route.request().url()).searchParams.get('q') || '';
    return route.fulfill({ json: { places: [], officialPlaces: [], officialState: 'empty' } });
  });
  await page.goto('/planner');
  await chooseWaveOption(page.getByRole('combobox', { name: '여행 지역', exact: true }), '창원');
  await expect(page.locator('.official-exploration')).toBeVisible();
  const searchInput = page.getByRole('combobox', { name: '여행지 검색', exact: true });
  await searchInput.fill('사용자가 입력한 검색 초안');
  const details = page.locator('.official-exploration').getByRole('button', { name: '경남도립미술관 상세정보', exact: true });
  await details.click();
  const dialog = page.getByRole('dialog', { name: '경남도립미술관', exact: true });
  await expect(dialog.getByRole('heading', { name: '경남도립미술관', exact: true })).toBeFocused();
  await expect.poll(() => query).toBe('창원 경남도립미술관');
  await expect(dialog).toContainText('연결된 장소 정보가 아직 없어요.');
  await dialog.getByRole('button', { name: '상세정보 닫기', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(details).toBeFocused();
  await expect(searchInput).toHaveValue('사용자가 입력한 검색 초안');
});

test('관광 수요는 기준월과 미제공 상태를 분리해 표시한다', async ({ page }) => {
  await prepare(page);
  await page.route('**/api/wave?**', route => {
    if (new URL(route.request().url()).searchParams.get('action') !== 'enrich') return route.fallback();
    return route.fulfill({ json: { generatedAt: plan.generatedAt, visitor: { total: 0, byType: {}, startYmd: '', endYmd: '' }, demand: [
      { name: '문화 관심', value: 42, baseYm: '202607', scope: '전국' },
      { name: '자연 관심', value: 30, baseYm: '', scope: '전국' },
    ], camping: [], pet: [], wellness: [], medical: [], language: [], awards: [], water: [], rests: [], events: [], lodging: [], statuses: [] } });
  });
  await page.locator('.simple-place-add').first().click();
  await openItinerary(page, { start: '2026-10-14' });
  await tool(page, '출발 전 확인');
  if (await page.locator('#layers').getAttribute('open') === null) await page.locator('#layers > summary').click();
  await expect(page.locator('.demand-insight')).toContainText('기준월: 2026-07 · 전국');
  await expect(page.locator('.demand-insight')).toContainText('기준월: 미제공 · 전국');
  await expect(page.locator('.demand-insight')).not.toContainText('이번 달');
});
