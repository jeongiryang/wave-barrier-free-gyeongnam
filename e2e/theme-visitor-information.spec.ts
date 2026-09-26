import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary, plan } from './fixtures';
import { openNaruTool } from './naru-tool-fixtures';

for (const mode of ['pet', 'wellness'] as const) {
  test(`${mode} candidate keeps its description and opens same-place visitor information on demand`, async ({ page }, testInfo) => {
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Unmocked fixture request' } });
      return route.continue();
    });
    await mockPublicShellApi(page);
    await mockPlannerApi(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const spot = {
      id: mode === 'pet' ? '128792' : '2755780',
      title: mode === 'pet' ? '여좌천(여좌천로망스다리)' : '천마온천',
      address: '경상남도 창원시 검증용 주소',
      summary: mode === 'pet' ? '합성 제공 설명: 강을 따라 산책하는 공간입니다.' : '',
      image: '', mapX: '128.6594', mapY: '35.1551',
      source: mode === 'pet' ? '반려동물 동반여행' : '웰니스 관광', tag: mode,
    };
    const calls: string[] = [];
    const phone = mode === 'pet' ? '창원시청 관광과 055-225-3691' : '운영 055-298-7111 / 예약 055-123-4567';
    const primaryPhone = mode === 'pet' ? '055-225-3691' : '055-298-7111';
    await page.route('**/api/wave?*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('action') === 'enrich') return route.fulfill({ json: {
        generatedAt: plan.generatedAt, visitor: { total: 0, byType: {}, startYmd: '', endYmd: '' }, demand: [],
        camping: [], pet: [], wellness: [], medical: [], language: [], awards: [], water: [], rests: [], events: [], lodging: [], statuses: [],
        [mode]: [spot],
      } });
      if (url.searchParams.get('action') !== 'visit-info') return route.fallback();
      if (url.searchParams.get('contentId') !== spot.id) return route.fallback();
      calls.push(url.searchParams.get('contentId') || '');
      if (mode === 'wellness' && calls.length === 1) return route.fulfill({ status: 502, json: { status: 'provider-error' } });
      return route.fulfill({ json: {
        id: spot.id, status: 'available', checkedAt: '2026-09-27T00:00:00Z', source: '합성 한국관광공사 운영정보',
        hours: '운영시간은 예약 프로그램에 따라 다름', restDays: '방문 전 문의', fees: '', phone,
      } });
    });
    await page.goto('/planner');
    await chooseTripConditions(page);
    await page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
    await openItinerary(page, { start: '2026-09-29' });
    const savedBefore = await page.evaluate(() => localStorage.getItem('wave-saved-places'));
    await openNaruTool(page, '출발 전 확인');
    await page.locator('#layers > summary').click();
    await page.locator(`#theme-tab-${mode}`).click();
    const card = page.locator('#theme-panel .rich-card').filter({ has: page.getByRole('heading', { name: spot.title, exact: true }) });
    await expect(card).toContainText(spot.address);
    if (spot.summary) await expect(card).toContainText(spot.summary);
    else await expect(card).toContainText('장소 설명이 제공되지 않았어요.');
    await expect(card).toContainText(mode === 'pet' ? '안내견 동반·무장애 편의와는 별도 정보' : '치료 효과나 모든 이용자의 이용 가능성을 보장하지 않아요');
    expect(calls).toEqual([]);
    const hours = card.locator('.visit-hours');
    const disclosure = hours.locator('summary');
    await disclosure.focus();
    await page.keyboard.press('Enter');
    if (mode === 'wellness') {
      await expect(hours.getByRole('alert')).toContainText('불러오지 못했어요');
      await expect(card).toContainText(spot.title);
      await hours.getByRole('button', { name: '다시 확인', exact: true }).click();
    }
    await expect(hours).toContainText(phone);
    await expect(hours.getByRole('link', { name: primaryPhone, exact: true })).toHaveAttribute('href', `tel:${primaryPhone.replaceAll('-', '')}`);
    await expect(hours.locator('a[href^="tel:"]')).toHaveCount(mode === 'pet' ? 1 : 2);
    if (mode === 'wellness') await expect(hours.getByRole('link', { name: '055-123-4567', exact: true })).toHaveAttribute('href', 'tel:0551234567');
    await expect(hours).toContainText('운영시간은 예약 프로그램에 따라 다름');
    await expect(hours).toContainText('당일 변경·예약 가능 여부는 시설에 확인해 주세요.');
    expect(calls).toEqual(mode === 'pet' ? [spot.id] : [spot.id, spot.id]);
    await disclosure.focus();
    await page.keyboard.press('Enter');
    await expect(disclosure).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(hours.getByRole('link', { name: primaryPhone, exact: true })).toBeVisible();
    expect(calls).toHaveLength(mode === 'pet' ? 1 : 2);
    for (const width of testInfo.project.name.startsWith('desktop') ? [1440, 960] : [390]) {
      await page.setViewportSize({ width, height: 960 });
      await disclosure.focus();
      await page.keyboard.press('Enter');
      await expect(disclosure).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(hours.getByRole('link', { name: primaryPhone, exact: true })).toBeVisible();
      await card.scrollIntoViewIfNeeded();
      expect((await new AxeBuilder({ page }).include('#theme-panel').analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${mode}-visitor-information-${width}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(() => localStorage.getItem('wave-saved-places'))).toBe(savedBefore);
  });
}
