import { expect, test } from '@playwright/test';
import { mockPublicShellApi } from './fixtures';
import { openSupportMenu } from './support-menu';

for (const authenticated of [false, true]) test(`late ${authenticated ? 'signed-in' : 'guest'} session cannot steal focus or close a subsequently opened support menu`, async ({ page }) => {
  await mockPublicShellApi(page);
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/auth/get-session', async route => {
    await ready;
    await route.fulfill({ json: authenticated ? { user: { id: 'qa-menu-user', name: '메뉴 여행자', email: 'menu@example.com' }, session: { id: 'qa-menu-session' } } : null });
  });
  await page.goto('/');
  try {
    await openSupportMenu(page);
    await page.locator('.wave-header').getByRole('button', { name: '계정 관리', exact: true }).click();
    const account = page.locator('.wave-header .account-menu:not(.wave-support-menu) > button');
    await expect(page.locator('.wave-header').getByRole('status')).toHaveText('계정 상태를 불러오는 중');
    await account.press('Escape');
    await expect(account).toBeFocused();
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    await openSupportMenu(page);
    const support = page.getByRole('button', { name: 'WAVE 이용 안내 메뉴', exact: true });
    await expect(support).toBeFocused();
    const resolved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/get-session');
    release();
    await (await resolved).finished();
    await expect(account).toHaveAccessibleName(authenticated ? '메뉴 여행자 계정 메뉴' : '계정 계정 메뉴');
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(support).toBeFocused();
    await expect(support).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.wave-support-panel')).toBeVisible();
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    await support.press('Escape');
    await expect(support).toBeFocused();
    await expect(support).toHaveAttribute('aria-expanded', 'false');
    await account.click();
    await expect(account).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.wave-header').getByRole('link', { name: authenticated ? '계정 관리' : '로그인', exact: true })).toBeVisible();
  } finally { release(); }
});
