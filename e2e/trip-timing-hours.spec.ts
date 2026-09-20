import { expect, test, type Page } from '@playwright/test';
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary } from './fixtures';

async function setup(page: Page, hours: string) {
  await mockPublicShellApi(page); await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let requests = 0, shares = 0;
  await page.route('**/api/wave?action=visit-info&*', route => {
    requests++;
    return route.fulfill({ json: { id: '1001', status: 'available', checkedAt: '2026-09-21T00:00:00Z', source: '한국관광공사', hours, restDays: '연중무휴' } });
  });
  await page.route('**/api/trips', route => { shares++; return route.fulfill({ status: 503, json: { error: 'No public write expected' } }); });
  await page.goto('/planner'); await chooseTripConditions(page);
  await page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
  await openItinerary(page, { start: '2026-10-07' });
  await setStart(page, '08:00');
  return { requests: () => requests, shares: () => shares };
}
async function setStart(page: Page, value: string) {
  await page.getByRole('button', { name: '여행 설정', exact: true }).click();
  const settings = page.getByRole('dialog', { name: '여행 설정', exact: true });
  await settings.getByLabel('하루 시작', { exact: true }).fill(value);
  await settings.getByRole('button', { name: '적용', exact: true }).click();
}
const review = (page: Page) => page.getByRole('dialog', { name: '저장·공유 전 일정 확인', exact: true });
const count = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('wave-travel-book-v1') || '[]').length);

test('existing operating-hours evidence immediately guards device save and public share without extra provider requests', async ({ page }) => {
  const calls = await setup(page, '09:00~18:00');
  expect(calls.requests()).toBe(0);
  const hours = page.locator('.simple-stops .visit-hours');
  await hours.locator('summary').click(); await expect(hours).toContainText('예상 도착이 개장 전이에요');
  // No intervening itinerary edit: the completed evidence request itself must update the guard.
  await page.locator('[data-planner-tool=save] > button').click();
  await expect(review(page)).toContainText('경남도립미술관: 개장 전 도착');
  expect(await count(page)).toBe(0);
  await review(page).getByRole('button', { name: '돌아가서 수정', exact: true }).click();
  await page.locator('button[data-planner-tool=share]').click();
  const share = page.getByRole('dialog', { name: '여행 공유', exact: true });
  await share.getByRole('button', { name: '공개 링크 만들기', exact: true }).click();
  await expect(review(page)).toContainText('개장 전 도착'); expect(calls.shares()).toBe(0);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await setStart(page, '18:00');
  await page.locator('[data-planner-tool=save] > button').click();
  await expect(review(page)).toContainText('폐장 후 도착');
  await review(page).getByRole('button', { name: '확인하고 계속', exact: true }).click();
  await expect.poll(() => count(page)).toBe(1);
  expect(calls.requests()).toBe(1); expect(calls.shares()).toBe(0);
});

test('conditional operating hours stay unconfirmed and do not invent a save conflict', async ({ page }) => {
  const calls = await setup(page, '하절기 09:00~18:00 / 동절기 10:00~17:00');
  const hours = page.locator('.simple-stops .visit-hours');
  await hours.locator('summary').click(); await expect(hours).toContainText('이용시간이 없거나 조건에 따라 달라요');
  await page.locator('[data-planner-tool=save] > button').click();
  await expect.poll(() => count(page)).toBe(1); await expect(review(page)).toHaveCount(0);
  expect(calls.requests()).toBe(1); expect(calls.shares()).toBe(0);
});

test('newly loaded hours guard the next automatic edit until their warning is accepted', async ({ page }) => {
  const calls = await setup(page, '09:00~18:00');
  const save = page.locator('[data-planner-tool=save] > button');
  await save.click(); await expect.poll(() => count(page)).toBe(1);
  const before = await page.evaluate(() => localStorage.getItem('wave-travel-book-v1'));
  const hours = page.locator('.simple-stops .visit-hours');
  await hours.locator('summary').click(); await expect(hours).toContainText('예상 도착이 개장 전이에요');
  // Reading evidence alone must not rewrite an unchanged saved trip.
  await setStart(page, '07:00');
  await expect(page.locator('[data-planner-tool=save]')).toContainText('일정의 시간과 날짜를 확인한 뒤 저장');
  expect(await page.evaluate(() => localStorage.getItem('wave-travel-book-v1'))).toBe(before);
  await save.click(); await expect(review(page)).toContainText('개장 전 도착');
  await review(page).getByRole('button', { name: '확인하고 계속', exact: true }).click();
  await expect(page.locator('[data-planner-tool=save]')).toContainText('내 여행에 저장했어요');
  expect(calls.requests()).toBe(1);
});
