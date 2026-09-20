import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

test("두 탭에서 날짜 없는 탐색부터 일정 편집·지도·저장·공유까지 이어진다", async ({ page }, info) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/trips', route => route.fulfill({ status: 201, json: { id: 'abcdef123456', url: `${new URL(route.request().url()).origin}/trip/abcdef123456`, revision: 1, expiresAt: Date.now() + 30 * 86400000, live: true } }));
  await page.goto('/planner');
  await expect(page.locator('.simple-planner-tabs button')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: '경남, 모두의 여행지', exact: true })).toBeVisible();
  await chooseTripConditions(page);
  await expect(page.locator('.simple-place-row')).toHaveCount(2);
  await page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
  await expect(page.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true })).toBeVisible();
  await expect(page.locator('.simple-results')).toBeVisible();
  await openItinerary(page, { start: '2026-10-14', end: '2026-10-15' });
  await expect(page.locator('.simple-stops > li')).toHaveCount(1);
  await page.locator('.simple-planner-tabs button').first().click();
  await expect(page.getByRole('button', { name: '용지호수공원 일정에 담기', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '용지호수공원 일정에 담기', exact: true }).click();
  await openItinerary(page);
  await expect(page.locator('.simple-stops > li')).toHaveCount(2);
  await page.getByRole('button', { name: '용지호수공원 같은 날 앞 순서로 이동', exact: true }).click();
  await expect(page.locator('.simple-stops > li h3').first()).toHaveText('용지호수공원');
  await page.getByRole('button', { name: '여행 설정', exact: true }).click();
  const settings = page.getByRole('dialog', { name: '여행 설정', exact: true });
  await settings.getByLabel('하루 시작', { exact: true }).fill('09:30');
  await settings.getByRole('button', { name: '적용', exact: true }).click();
  await expect(page.locator('.simple-itinerary-heading')).toContainText('2026-10-14 — 2026-10-15');
  if (info.project.name.startsWith('mobile')) await page.getByRole('group', { name: '일정 보기 방식' }).getByRole('button', { name: '지도', exact: true }).click();
  await expect(page.locator('.simple-itinerary-map .leaflet-container')).toBeVisible();
  await page.screenshot({ path: info.outputPath('simple-map.png') });
  await page.locator('.simple-trip-actions').getByRole('button', { name: '내 여행에 저장', exact: true }).click();
  await acceptTripTimingWarning(page);
  await expect(page.locator('.simple-save-control')).toContainText('저장');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('wave-travel-book-v1') || '[]').length)).toBe(1);
  await page.locator('.simple-trip-actions').getByRole('button', { name: '공유', exact: true }).click();
  { const create = page.getByRole('button', { name: '공개 링크 만들기', exact: true }); if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); } }
  const share = page.getByRole('dialog', { name: '여행 공유', exact: true });
  await expect(share.getByRole('button', { name: '링크 복사', exact: true })).toBeEnabled();
  await share.getByRole('button', { name: '공유 닫기', exact: true }).click();
  const widths = info.project.name.startsWith('desktop') ? [1440, 960] : [390];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`simple-itinerary-${width}.png`) });
  }
  expect((await new AxeBuilder({ page }).include('#itinerary').analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
