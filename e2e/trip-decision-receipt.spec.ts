import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary, plan as basePlan } from './fixtures';

const places = basePlan.places.map((place, index) => ({
  ...place,
  accessibility: index === 0 ? [
    { key: 'route', label: '접근로', state: 'confirmed' as const, detail: '주출입구까지 평탄한 접근로가 있습니다.' },
    { key: 'restroom', label: '장애인 화장실', state: 'negative' as const, detail: '제공 자료에는 장애인 화장실이 없음으로 표시됩니다.' },
    { key: 'parking', label: '장애인 주차구역', state: 'confirmed' as const, detail: '장애인 주차구역이 있습니다.' },
  ] : [
    { key: 'route', label: '접근로', state: 'confirmed' as const, detail: '공원 접근로 정보가 확인되었습니다.' },
  ],
}));

test('the decision receipt explains selected evidence, route limits and downloads the same audit', async ({ page }, info) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: 'overview', savedPlaces: places });
  await page.route('**/api/wave?action=plan*', route => route.fulfill({ json: { ...basePlan, places } }));
  await page.route('**/api/route*', route => {
    const mode = new URL(route.request().url()).searchParams.get('mode') || 'transit';
    return route.fulfill({ json: { configured: true, alternatives: [{ id: 'verified-route', label: '조회 경로', provider: '합성 경로 제공처', mode, totalTime: 18, payment: null, paymentType: 'unknown', totalWalk: mode === 'transit' ? 7 : 0, transfers: 0, totalDistance: 4300, configured: true, segments: [{ type: mode, name: '조회 경로', minutes: 18 }], geometry: [] }] } });
  });
  await page.goto('/planner');
  await chooseTripConditions(page);
  for (const name of ['경남도립미술관', '용지호수공원']) await page.getByRole('button', { name: `${name} 일정에 담기`, exact: true }).click();
  await openItinerary(page, { start: '2026-09-20' });

  const receipt = page.locator('[data-planner-tool="receipt"]');
  await expect(receipt.getByText('왜 이 일정인가요?', { exact: true })).toBeVisible();
  await receipt.locator(':scope > summary').click();
  await expect(receipt).toContainText('관광 콘텐츠 ID 1001');
  await expect(receipt).toContainText('장애인 화장실');
  await expect(receipt).toContainText('없음');
  await expect(receipt).toContainText('미확인');
  await expect(receipt).toContainText('경로 조회는 휠체어 통행, 경사, 엘리베이터 운영을 보장하지 않습니다.');
  await expect.poll(async () => receipt.getByText(/개 구간의 경로를 조회했습니다/).textContent()).toMatch(/[1-9]\/[1-9]/);

  const event = page.waitForEvent('download');
  await receipt.getByRole('button', { name: '결정 근거 저장', exact: true }).click();
  const download = await event;
  const file = info.outputPath('WAVE-decision-receipt.txt');
  await download.saveAs(file);
  const text = await fs.readFile(file, 'utf8');
  expect(text).toContain('관광 콘텐츠 ID 1001');
  expect(text).toContain('장애인 화장실: 없음으로 확인');
  expect(text).toContain('합성 경로 제공처');
  expect(text).toContain('없는 근거를 AI가 만들어 채우지 않습니다.');

  expect((await new AxeBuilder({ page }).include('[data-planner-tool="receipt"]').analyze()).violations).toEqual([]);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await receipt.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.screenshot({ path: info.outputPath(`decision-receipt-${width}.png`) });
  }
});
