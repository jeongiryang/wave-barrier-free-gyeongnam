import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';

const start = '2026-10-14', end = '2026-10-15', id = '11111111-1111-4111-8111-111111111111';
async function prepare(page: Page, account: boolean, warning = true) {
  await mockPublicShellApi(page); await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const writes: unknown[] = [], shares: unknown[] = [];
  let saved: unknown;
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: account ? { user: { id: 'timing-owner', name: '일정 확인', email: 'timing@example.test' }, session: { id: 'timing-session' } } : null }));
  await page.route('**/api/account/travel**', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: saved });
    const body = route.request().postDataJSON(); writes.push(body);
    saved = { id: body.id || id, payload: body.payload, revision: writes.length, role: 'owner', updatedAt: Date.now() };
    return route.fulfill({ json: saved });
  });
  await page.route('**/api/trips', route => { shares.push(route.request().postDataJSON()); return route.fulfill({ status: 201, json: { id: 'abcdef123456', url: `${new URL(page.url()).origin}/trip/abcdef123456`, revision: 1, expiresAt: Date.now() + 30 * 86400000, live: true } }); });
  await page.addInitScript(({ places, start, end, id, warning }) => {
    localStorage.setItem('wave-current-trip-v1', JSON.stringify({ version: 1, values: {
      'wave-planner-region-v1': '창원', 'wave-trip-themes-v1': '[]', 'wave-saved-places': '["1001","1002"]',
      'wave-saved-place-catalog-v1': JSON.stringify(places), 'wave-trip-order-v1': '{"mode":"manual","ids":["1001","1002"]}',
      'wave-trip-identity-v1': JSON.stringify({ version: 1, id, binding: null, share: null }),
      'wave-trip-schedule-v1': JSON.stringify({ travelStart: start, travelEnd: warning ? end : start, dayStartTime: warning ? '23:00' : '09:00', travelMode: 'transit', scheduleAssignments: { '1001': start, '1002': start }, visitMinutesByPlaceId: { '1001': 120, '1002': 120 }, fixedVisits: warning ? { '1002': { kind: 'visit', time: '09:00', position: 1 } } : {}, breakMinutesByPlaceId: {}, restPurposeByPlaceId: {}, dayDeadlines: {} }),
    } }));
  }, { places: plan.places, start, end, id, warning });
  await page.goto('/planner');
  await page.getByRole('group', { name: '여행 설계 화면', exact: true }).getByRole('button', { name: /^내 일정/ }).click();
  await expect(page.locator('[data-planner-tool=save] > button')).toBeEnabled();
  return { writes, shares };
}
const review = (page: Page) => page.getByRole('dialog', { name: '저장·공유 전 일정 확인', exact: true });
const bookCount = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('wave-travel-book-v1') || '[]').length as number);

for (const account of [false, true]) test(`${account ? 'account' : 'device'} save requires readable warning confirmation and cancellation preserves the unsaved trip`, async ({ page }) => {
  const app = await prepare(page, account);
  const save = page.locator('[data-planner-tool=save] > button');
  await save.click();
  await expect(review(page)).toBeVisible();
  await expect(review(page)).toContainText('자정을 넘겨요');
  await expect(review(page)).toContainText('담은 장소가 없어요');
  await expect(review(page)).toContainText('늦을 수 있어요');
  expect(app.writes).toHaveLength(0); expect(await bookCount(page)).toBe(0);
  await review(page).getByRole('button', { name: '돌아가서 수정', exact: true }).click();
  await expect(save).toBeFocused();
  expect(app.writes).toHaveLength(0); expect(await bookCount(page)).toBe(0);
  await save.click(); await review(page).getByRole('button', { name: '확인하고 계속', exact: true }).click();
  await expect(review(page)).toHaveCount(0);
  if (account) await expect.poll(() => app.writes.length).toBe(1);
  else await expect.poll(() => bookCount(page)).toBe(1);
  expect(app.shares).toHaveLength(0);
});

test('public creation remains private until the schedule warning is explicitly accepted', async ({ page }) => {
  const app = await prepare(page, false);
  await page.locator('button[data-planner-tool=share]').click();
  const share = page.getByRole('dialog', { name: '여행 공유', exact: true });
  expect(app.shares).toHaveLength(0);
  await share.getByRole('button', { name: '공개 링크 만들기', exact: true }).click();
  await expect(review(page)).toContainText('자정을 넘겨요');
  expect(app.shares).toHaveLength(0);
  await page.keyboard.press('Escape');
  await expect(share).toBeVisible(); expect(app.shares).toHaveLength(0);
  await share.getByRole('button', { name: '공개 링크 만들기', exact: true }).click();
  await review(page).getByRole('button', { name: '확인하고 계속', exact: true }).click();
  await expect.poll(() => app.shares.length).toBe(1);
  await expect(share.getByRole('link', { name: '공유 일정 보기', exact: true })).toBeVisible();
});

for (const account of [false, true]) test(`${account ? 'account' : 'device'} automatic saves pause when a newly edited schedule crosses midnight`, async ({ page }) => {
  const app = await prepare(page, account, false);
  const save = page.locator('[data-planner-tool=save] > button');
  await save.click();
  if (account) await expect.poll(() => app.writes.length).toBe(1);
  else await expect.poll(() => bookCount(page)).toBe(1);
  const before = account ? JSON.stringify(app.writes) : await page.evaluate(() => localStorage.getItem('wave-travel-book-v1'));
  await page.getByRole('button', { name: '여행 설정', exact: true }).click();
  const settings = page.getByRole('dialog', { name: '여행 설정', exact: true });
  await settings.getByLabel('하루 시작', { exact: true }).fill('23:00');
  await settings.getByRole('button', { name: '적용', exact: true }).click();
  await expect(page.locator('[data-planner-tool=save]')).toContainText('일정의 시간과 날짜를 확인한 뒤 저장');
  expect(account ? JSON.stringify(app.writes) : await page.evaluate(() => localStorage.getItem('wave-travel-book-v1'))).toBe(before);
  await save.click(); await expect(review(page)).toContainText('자정을 넘겨요');
  await review(page).getByRole('button', { name: '확인하고 계속', exact: true }).click();
  await expect(page.locator('[data-planner-tool=save]')).toContainText('내 여행에 저장했어요');
  if (account) await expect.poll(() => app.writes.length).toBe(2);
  else await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wave-travel-book-v1') || '[]')[0]?.dayStartTime)).toBe('23:00');
});
