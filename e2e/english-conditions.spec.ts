import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

for (const theme of ['light', 'dark'] as const) {
  test(`deferred English ${theme} keeps individual facility drafts, saved preferences and locale-aware search`, async ({ page }) => {
    await mockPlannerApi(page);
    await page.addInitScript(theme => { localStorage.setItem('wave-locale', 'en'); localStorage.setItem('wave-theme', theme); }, theme);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const searches: URL[] = []; page.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/api/wave' && url.searchParams.get('action') === 'plan') searches.push(url); });
    await page.goto('/planner?region=창원');
    await expect(page.locator('.simple-results-heading')).toContainText('2 places loaded');
    await page.locator('.simple-facility-trigger').click();
    const picker = page.getByRole('dialog', { name: '필요한 편의', exact: true });
    await expect(picker.getByRole('checkbox')).toHaveCount(16);
    const before = searches.length;
    for (const name of ['접근로', '수어 안내']) await picker.getByRole('checkbox', { name, exact: true }).check();
    await picker.locator('.simple-saved-preferences > summary').click();
    await picker.getByRole('button', { name: '이 기기에 조건 저장', exact: true }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-travel-profile-v1') || '{}').selectedIds)).toEqual(['route', 'signguide']);
    await picker.getByRole('button', { name: '선택 해제', exact: true }).click();
    await expect(picker.locator('input:checked')).toHaveCount(0);
    await picker.getByRole('button', { name: '저장한 조건 불러오기', exact: true }).click();
    await expect(picker.getByRole('checkbox', { name: '접근로', exact: true })).toBeChecked();
    await expect(picker.getByRole('checkbox', { name: '수어 안내', exact: true })).toBeChecked();
    expect(searches.length).toBe(before);
    await picker.getByRole('button', { name: /^적용/ }).click();
    await expect.poll(() => searches.at(-1)?.searchParams.get('facilityKeys')).toBe('route,signguide');
    await page.getByRole('button', { name: '역사·문화', exact: true }).click();
    await expect.poll(() => searches.at(-1)?.searchParams.get('themes')).toBe('history');
    expect(searches.at(-1)?.searchParams.get('locale')).toBe('en');
    expect(searches.at(-1)?.searchParams.get('facilityKeys')).toBe('route,signguide');
    await expect(page.locator('.simple-results[aria-busy="false"]')).toBeVisible();
    expect((await new AxeBuilder({ page }).include('#conditions').analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}
