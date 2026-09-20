import { openNaruTool } from './naru-tool-fixtures';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi, openItinerary, plan } from './fixtures';

test('동행 공통분모·스트레스 테스트·현장 재확인 순환을 한 여행에서 사용한다', async ({ page }) => {
  const places = plan.places.map(place => ({ ...place, checkedAt: '2026-09-16T00:00:00Z', accessibility: [{ key: 'route', label: '접근로', state: 'confirmed' as const, detail: '공식 제공처 확인' }] }));
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true, savedPlaces: places });
  await page.route('**/api/wave?action=plan*', route => route.fulfill({ json: { ...plan, places, criteria: { facilityKeys: ['route'] } } }));
  await page.addInitScript(places => {
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: {
      'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001","1002"]',
      'wave-saved-place-catalog-v1': JSON.stringify(places), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001","1002"]}',
      'wave-trip-schedule-v1': JSON.stringify({ travelStart: '2026-09-20', travelEnd: '2026-09-20', dayStartTime: '10:00', scheduleAssignments: { 1001: '2026-09-20', 1002: '2026-09-20' }, comfort: { maxWalkMinutes: 15, breakEveryMinutes: 60, breakMinutes: 15 } }),
    }}));
    sessionStorage.setItem('wave-session-facilities-v1', '["route"]');
  }, places);
  await page.route('**/api/observations?*', route => route.fulfill({ json: { reports: [{ id: 'report-1', placeId: '1001', observedAt: Date.now(), readings: { mobility: 'blocked' } }], checkedAt: Date.now(), source: 'traveller', ttl: 7200000 } }));
  await page.goto('/planner');
  await openItinerary(page);
  await openNaruTool(page, '출발 전 확인');
  await page.getByText('비·휴무·피로에 대비하기', { exact: true }).click();
  const lab = page.getByRole('heading', { name: '여행 점검', exact: true }).locator('..');
  await lab.getByText('동행자 공통 조건', { exact: true }).click();
  await expect(lab).toContainText('함께 지킬 조건: 접근로');
  await expect(lab.getByRole('listitem')).toHaveCount(2);
  await lab.getByText('일정 스트레스 테스트', { exact: true }).click();
  await lab.getByRole('button', { name: '한 곳 휴무', exact: true }).click();
  await expect(lab).toContainText('휴무를 가정한 결과예요.');
  expect((await new AxeBuilder({ page }).include('#departure-readiness').analyze()).violations).toEqual([]);
  await openNaruTool(page, '페이스·감각지도·여행여권');
  await page.getByRole('button', { name: '감각지도·지금 현장', exact: true }).click();
  await page.getByText(/공식정보 재확인 목록/).click();
  await expect(page.getByText('공식 접근로 정보와 최근 현장 관찰이 달라요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '공식 원문·문의 확인', exact: true }).first()).toBeVisible();
});
