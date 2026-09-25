import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ storageState: { cookies: [], origins: [] } });
for (const path of ['/login', '/register', '/forgot-password', '/reset-password', '/account', '/account/delete-complete', '/privacy', '/terms', '/policies', '/guide', '/travel-book', '/my-trips', '/photo-course', '/outings', '/community/new']) {
  test(`desktop secondary page ${path} retains readable controls and shared navigation`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('.wave-header')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.locator('.wave-night')).toBeVisible();
    const serious = (await new AxeBuilder({ page }).analyze()).violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('account registration retains the selected trip and introduction shares the approved night styling', async ({ page }) => {
  await page.goto('/login?next=%2Fmy-trips%2Ftrip-1');
  await expect(page.locator('.auth-switch').getByRole('link', { name: '회원가입' })).toHaveAttribute('href', '/register?next=%2Fmy-trips%2Ftrip-1');
  await page.goto('/');
  await expect(page.locator('.night-landing.wave-night')).toBeVisible();
  await expect(page.locator('.night-wave-mark')).toHaveCount(1);
});

test('shared trip keeps readable official place cards and dated itinerary', async ({ page }) => {
  await page.route('**/api/trips/night-review', route => route.fulfill({ json: {
    plan: { generatedAt: '2026-09-20T00:00:00Z', places: [{ id: '126661', name: '달아공원', city: '통영', summary: '통영의 바다를 바라보는 여행지', image: '', score: null, features: ['공식 정보 확인'] }], stops: [] },
    selections: { region: '통영', scheduleAssignments: { '126661': '2026-09-21' }, dayStartTime: '10:00' },
    expiresAt: Date.now() + 86400000,
  } }));
  await page.goto('/trip/night-review');
  await expect(page.locator('.shared-places h2')).toHaveText('달아공원');
  await expect(page.getByRole('heading', { name: '날짜별 저장 일정' })).toBeVisible();
  const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  expect(violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
});
