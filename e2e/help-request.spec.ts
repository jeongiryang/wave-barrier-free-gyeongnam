import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions, openItinerary } from './fixtures';
import { alternativePlan } from './alternative-fixtures';

async function setup(page: Page) {
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
  await page.locator('.simple-more-trip-tools > summary').click();
}

const openHelpFromDayTools = async (page: Page) => {
  await page.getByRole('button', { name: '도움이 필요해요', exact: true }).click();
  return page.locator('dialog[aria-labelledby="help-request-title"]');
};

test('help dialog opens immediately with the intended first focus and default message, without calling the server', async ({ page }) => {
  await setup(page);
  // 도구 묶음을 펼치면 이 기능과 무관한 지도·시설 정보 배경 호출이 뒤늦게 끝날 수
  // 있다. 그 호출이 가라앉을 때까지 기다린 뒤부터, 도움 요청 화면을 여는 동안의
  // 호출만 기록한다. 이 기능은 서버를 호출하지 않는다. 페이지 전체를
  // context.setOffline으로 끊으면 이 화면과 무관한 지도 청크 로딩까지 함께 깨져
  // 검증 대상이 아닌 실패가 섞이므로, 이 기능이 실제로 의존하는 경계인
  // 서버 호출 자체를 차단해서 확인한다.
  await page.waitForLoadState('networkidle').catch(() => {});
  const apiCallUrls: string[] = [];
  await page.route('**/api/**', route => { apiCallUrls.push(route.request().url()); return route.fulfill({ status: 503, json: { error: 'must not be called by help request' } }); });

  const dialog = await openHelpFromDayTools(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '이 화면 보여주기', exact: true })).toBeFocused();
  await expect(dialog).toContainText('도움이 필요합니다');
  await expect(dialog).toContainText('W.A.V.E는 위치를 대신 전달하지 않아요');

  await dialog.getByRole('button', { name: '이 화면 보여주기', exact: true }).click();
  const bigText = dialog.locator('p', { hasText: '도움이 필요합니다' }).last();
  await expect(bigText).toBeVisible();
  const fontSize = await bigText.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(32);
  await dialog.getByRole('button', { name: '돌아가기', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '이 화면 보여주기', exact: true })).toBeVisible();

  expect(apiCallUrls, `unexpected calls: ${apiCallUrls.join(", ")}`).toEqual([]);
});

test('choosing a situation only swaps the sentence, and closing discards state and restores focus', async ({ page }) => {
  await setup(page);
  const opener = page.getByRole('button', { name: '도움이 필요해요', exact: true });
  const dialog = await openHelpFromDayTools(page);
  await dialog.getByRole('button', { name: '길을 못 찾겠어요', exact: true }).click();
  await expect(dialog).toContainText('길을 찾기 어려워서');
  await expect(dialog.getByRole('heading', { name: '도움이 필요할 때' })).toBeVisible();

  await dialog.getByRole('button', { name: '도움 요청 닫기', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  const reopened = await openHelpFromDayTools(page);
  await expect(reopened).not.toContainText('길을 찾기 어려워서');
  await expect(reopened.getByRole('button', { name: '길을 못 찾겠어요', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('help request dialog has no axe violations at three widths', async ({ page }) => {
  await setup(page);
  await openHelpFromDayTools(page);
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await new AxeBuilder({ page }).include('[aria-labelledby="help-request-title"]').analyze()).violations).toEqual([]);
  }
});
