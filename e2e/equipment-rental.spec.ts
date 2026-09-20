import { openNaruTool } from './naru-tool-fixtures';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions, openItinerary } from './fixtures';
import { alternativePlan } from './alternative-fixtures';
import { enterDeparture } from './departure-fixtures';

async function setupPlanner(page: Page) {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true, savedPlaces: alternativePlan.places });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/wave?action=plan*', route => route.fulfill({ json: alternativePlan }));
  await page.addInitScript(() => {
    localStorage.setItem('wave-trip-schedule-v1', JSON.stringify({ travelStart: '2026-09-15', travelEnd: '2026-09-16', dayStartTime: '10:00', scheduleAssignments: { '1001': '2026-09-15', '1002': '2026-09-15', '1003': '2026-09-15' }, visitMinutesByPlaceId: {}, breakMinutesByPlaceId: {} }));
    localStorage.setItem('wave-trip-order-v1', JSON.stringify({ mode: 'manual', ids: ['1001', '1002', '1003'] }));
  });
  await page.goto('/planner');
  await chooseTripConditions(page);
  for (const name of ['경남도립미술관', '용지호수공원', '시민문화쉼터']) await page.getByRole('button', { name: name + ' 일정에 담기', exact: true }).click();
  await openItinerary(page);
}

test('the equipment rental list opens from the help request "기기가 고장 났어요" situation, with no server calls', async ({ page }) => {
  await setupPlanner(page);
  await openNaruTool(page, '이동 구간 확인');
  await page.getByRole('button', { name: '도움이 필요해요', exact: true }).scrollIntoViewIfNeeded();
  // Route checks start after a 650ms debounce, beyond networkidle's 500ms window.
  // Wait for the itinerary's completed state before auditing this local-only tool.
  await expect(page.locator('.coverage-notice')).toContainText('조회가 끝났습니다.');
  await expect(page.locator('.coverage-actions > button').first()).toHaveAttribute('aria-busy', 'false');
  await page.waitForLoadState('networkidle');
  const apiCallUrls: string[] = [];
  await page.route('**/api/**', route => { apiCallUrls.push(route.request().url()); return route.fulfill({ status: 503, json: { error: 'must not be called' } }); });

  await page.getByRole('button', { name: '도움이 필요해요', exact: true }).click();
  const dialog = page.locator('dialog[aria-labelledby="help-request-title"]');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '기기가 고장 났어요', exact: true }).click();
  const section = dialog.getByRole('region', { name: '보조기기 대여처', exact: true });
  await expect(section).toBeVisible();
  await expect(section).toContainText('대여 가능 여부와 조건은 기관에서 정해요. 전화로 먼저 확인해 주세요.');
  // 확인된 기관이 아직 없으므로(human-gate), 목록 대신 정직한 상태 문장만 보여야 한다.
  await expect(section).toContainText('확인된 대여처가 아직 없어요.');
  await expect(section.locator('input, textarea')).toHaveCount(0);

  expect(apiCallUrls, `unexpected calls: ${apiCallUrls.join(', ')}`).toEqual([]);
  expect((await new AxeBuilder({ page }).include('[aria-labelledby="help-request-title"]').analyze()).violations).toEqual([]);
});

test('the departure readiness "보조기기" item has no automatic dialing and no input fields', async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/planner');
  const readiness = await enterDeparture(page);
  const item = readiness.locator('details').filter({ has: page.locator('strong').filter({ hasText: /^보조기기$/ }) });
  await expect(item).toBeVisible();
  await expect(item).toContainText('대여 가능 여부와 조건은 기관에서 정해요. 전화로 먼저 확인해 주세요.');
  await expect(item.locator('input, textarea, form')).toHaveCount(0);
  // "전화 앱 열기"가 있다면 tel: 링크여야 하고, 클릭만으로 자동 발신이 되어서는 안 된다(전화 앱 여는 것까지만).
  const callLinks = item.getByRole('link', { name: /전화 앱 열기/ });
  const count = await callLinks.count();
  for (let i = 0; i < count; i++) await expect(callLinks.nth(i)).toHaveAttribute('href', /^tel:/);
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await new AxeBuilder({ page }).include('.simple-readiness').analyze()).violations).toEqual([]);
  }
});

test('help request offline flow keeps working after the equipment situation is added', async ({ page }) => {
  await setupPlanner(page);
  await openNaruTool(page, '이동 구간 확인');
  await page.getByRole('button', { name: '도움이 필요해요', exact: true }).scrollIntoViewIfNeeded();
  // Route checks start after a 650ms debounce, beyond networkidle's 500ms window.
  // Wait for the itinerary's completed state before auditing this local-only tool.
  await expect(page.locator('.coverage-notice')).toContainText('조회가 끝났습니다.');
  await expect(page.locator('.coverage-actions > button').first()).toHaveAttribute('aria-busy', 'false');
  await page.waitForLoadState('networkidle');
  const apiCallUrls: string[] = [];
  await page.route('**/api/**', route => { apiCallUrls.push(route.request().url()); return route.fulfill({ status: 503, json: { error: 'must not be called' } }); });

  await page.getByRole('button', { name: '도움이 필요해요', exact: true }).click();
  const dialog = page.locator('dialog[aria-labelledby="help-request-title"]');
  await expect(dialog.getByRole('button', { name: '이 화면 보여주기', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: '이 화면 보여주기', exact: true }).click();
  await expect(dialog).toContainText('도움이 필요합니다');
  expect(apiCallUrls).toEqual([]);
});
