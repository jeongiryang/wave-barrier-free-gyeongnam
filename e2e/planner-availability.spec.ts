import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi, plan } from "./fixtures";

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: "reduce" } });

test("불러온 후보를 유지하고 편의 초안은 적용할 때만 검색한다", async ({ page }, info) => {
  await mockPlannerApi(page);
  const requests: URL[] = [];
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/api/wave' && url.searchParams.get('action') === 'plan') requests.push(url); });
  await page.goto('/planner?region=창원');
  await expect(page.locator('.simple-results-heading h2')).toHaveText('창원 여행지');
  await expect(page.locator('.simple-results .simple-place-row')).toHaveCount(2);
  await expect(page.locator('.simple-results .simple-place-row h3')).toHaveText(plan.places.map(place => place.name));
  const before = requests.length;
  await page.locator('.simple-facility-trigger').click();
  await page.locator('.simple-facility-picker').getByRole('checkbox', { name: '접근로', exact: true }).check();
  await expect(page.locator('.simple-facility-picker').getByRole('checkbox', { name: '접근로', exact: true })).toBeChecked();
  expect(requests.length).toBe(before);
  await page.screenshot({ path: info.outputPath('facility-draft.png') });
  await page.locator('.simple-facility-picker').getByRole('button', { name: /^적용/ }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get('facilityKeys')).toBe('route');
  await expect(page.locator('.simple-results[aria-busy="false"]')).toBeVisible();
  expect(requests.length).toBe(before + 1);
  await page.locator('.simple-activity-filter').getByRole('button', { name: /문화/ }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get('themes')).toBe('history');
  expect(requests.at(-1)?.searchParams.get('facilityKeys')).toBe('route');
  await expect(page.locator('.simple-results')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.simple-results .simple-place-row')).toHaveCount(2);
  await expect(page.locator('.simple-results .simple-place-row h3')).toHaveText(plan.places.map(place => place.name));
  expect((await new AxeBuilder({ page }).include('#conditions').analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("조회 실패·부분 결과·정상 0곳을 구분하고 같은 조건으로 재시도한다", async ({ page }) => {
  await mockPlannerApi(page);
  let state = 'error'; const queries: string[] = [];
  await page.route('**/api/wave?**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('action') !== 'plan') return route.fallback();
    queries.push(url.searchParams.toString());
    if (state === 'error') return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    return route.fulfill({ json: { ...plan, places: [], stops: [], statuses: plan.statuses.map(status => ({ ...status, state: state === 'partial' ? 'error' : 'empty', count: 0 })) } });
  });
  await page.goto('/planner?region=창원');
  const results = page.locator('.simple-results');
  await expect(results.locator('[role="alert"]')).toBeVisible();
  await expect(results.locator('.simple-empty')).toHaveCount(0);
  state = 'partial';
  await results.getByRole('button', { name: '같은 조건으로 다시 시도', exact: true }).click();
  await expect(results.locator('.simple-result-notice')).toContainText('일부 장소 정보를 불러오지 못했어요.');
  await expect(results.locator('.simple-empty')).toHaveCount(0);
  state = 'empty';
  await results.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(results.locator('.simple-empty')).toContainText('이 조건으로 불러온 장소가 없어요.');
  await expect(results.locator('.simple-result-notice')).toHaveCount(0);
  expect(new Set(queries).size).toBe(1);
});
