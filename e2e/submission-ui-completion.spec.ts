import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi, openItinerary, plan } from './fixtures';
import { naruDialog } from './naru-tool-fixtures';
import { prepareStory, storyReady } from './landing-contract';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function prepare(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic API not configured' } }));
  await mockPlannerApi(page); await mockPublicShellApi(page);
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: false } }));
  await page.goto('/planner');
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await expect(page.locator('.simple-place-list .simple-place-row')).toHaveCount(2);
}
async function tool(page: Page, label: string) {
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = naruDialog(page);
  await chat.getByRole('tab', { name: '여행 도구', exact: true }).click();
  await chat.getByRole('region', { name: '모든 여행 도구', exact: true }).locator('.naru-tools').getByRole('button', { name: label, exact: true }).click();
}

test('나루 편의 비교가 선택 모드를 열고 비교할 시설은 여행 조건을 바꾸지 않는다', async ({ page }) => {
  await prepare(page);
  const before = await page.evaluate(() => sessionStorage.getItem('wave-session-facilities-v1'));
  await tool(page, '편의 비교');
  await expect(naruDialog(page)).toBeHidden();
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
  await expect(share).toBeVisible(); await expect(naruDialog(page)).toBeHidden();
  const downloaded = page.waitForEvent('download');
  await share.getByRole('button', { name: '캘린더', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe('wave-trip.ics');
  await expect(share).toContainText('캘린더 파일을 내려받았어요.');
});

test('소개 마지막 영역과 푸터가 화면 폭에 맞고 수평 넘침이 없다', async ({ page }) => {
  await prepareStory(page); await page.goto('/'); await storyReady(page);
  const footer = page.locator('.landing-page > .wave-balanced-footer');
  await footer.scrollIntoViewIfNeeded(); await expect(footer).toBeVisible();
  const measured = await footer.evaluate(node => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, width: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      background: getComputedStyle(node).backgroundColor };
  });
  expect(Math.abs(measured.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(measured.right - measured.width)).toBeLessThanOrEqual(1);
  expect(measured.overflow).toBe(false); expect(measured.background).toBe('rgb(5, 14, 25)');
  expect((await new AxeBuilder({ page }).include('.landing-page').analyze()).violations).toEqual([]);
});

test('공식 탐색 후보 버튼이 이름을 채워 직접 검색을 실행한다', async ({ page }) => {
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
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await page.locator('.official-exploration > summary').click();
  await page.getByRole('button', { name: '이 관광지 검색', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '여행지 검색', exact: true })).toHaveValue('창원 경남도립미술관');
  await expect.poll(() => query).toBe('창원 경남도립미술관');
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
