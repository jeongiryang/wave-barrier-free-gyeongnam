import { expect, test } from '@playwright/test';
import { mockPublicShellApi } from './fixtures';

const account = { user: { id: 'qa-account', name: '계정 확인 여행자', email: 'qa@example.com' }, session: { id: 'qa-session' } };
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }

for (const authenticated of [false, true]) test(`pending account never flashes anonymous inputs before ${authenticated ? 'signed-in' : 'guest'} resolves`, async ({ page }) => {
  await mockPublicShellApi(page);
  const gate = deferred(); let requests = 0;
  await page.route('**/api/auth/get-session', async route => { requests++; await gate.promise; await route.fulfill({ json: authenticated ? account : null }); });
  await page.goto('/login?next=%2Fplanner');
  await expect.poll(() => requests).toBeGreaterThan(0);
  await expect(page.getByRole('region', { name: '계정 확인', exact: true })).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#auth-email, #auth-password')).toHaveCount(0);
  await expect(page.locator('.wave-header .night-login')).toHaveText('계정');
  await expect(page.locator('.wave-header .night-signup')).toHaveCount(0);
  gate.release();
  if (authenticated) {
    await expect(page.getByRole('link', { name: '계속하기' })).toHaveAttribute('href', '/planner');
    await expect(page.locator('#auth-email, #auth-password')).toHaveCount(0);
    await expect(page.locator('.wave-header .night-login')).toHaveText('계정 관리');
  } else {
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();
    await expect(page.locator('.wave-header .night-login')).toHaveText('로그인');
  }
});

test('public introduction defers session lookup and retains keyboard focus when the neutral account link resolves', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await mockPublicShellApi(page);
  await page.addInitScript(() => sessionStorage.setItem('wave-arrival-session-v1', 'done'));
  const gate = deferred(); let requests = 0;
  await page.route('**/api/auth/get-session', async route => { requests++; await gate.promise; await route.fulfill({ json: null }); });
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  const entry = page.locator('.wave-header .night-login');
  await expect(entry).toHaveText('계정');
  expect(requests).toBe(0);
  await entry.focus();
  await expect.poll(() => requests).toBeGreaterThan(0);
  await expect(entry).toBeFocused();
  gate.release();
  await expect(entry).toHaveText('로그인');
  await expect(entry).toBeFocused();
  await expect(entry).toHaveAttribute('href', '/login?next=%2F');
});

test('account settings exposes logout, recovers failure, and keeps current-device travel on success', async ({ page }) => {
  await mockPublicShellApi(page);
  const trip = JSON.stringify({ version: 1, values: { 'wave-saved-places': '["1001"]', 'wave-trip-schedule-v1': '{"travelStart":"2026-09-21","travelEnd":"2026-09-21"}' } });
  await page.addInitScript(value => { if (!localStorage.getItem('wave-current-trip-v1')) localStorage.setItem('wave-current-trip-v1', value); }, trip);
  let signedOut = false, attempts = 0;
  const firstAttempt = deferred();
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: signedOut ? null : account }));
  await page.route('**/api/account/login-methods', route => route.fulfill({ json: { password: true, kakao: false } }));
  await page.route('**/api/auth/sign-out', async route => {
    attempts++;
    if (attempts === 1) { await firstAttempt.promise; await route.fulfill({ status: 503, json: { message: 'synthetic service unavailable' } }); return; }
    signedOut = true; await route.fulfill({ json: { success: true } });
  });
  await page.goto('/account');
  const panel = page.getByRole('region', { name: '로그인 관리', exact: true });
  const logout = panel.getByRole('button', { name: '로그아웃', exact: true });
  await expect(logout).toHaveAccessibleDescription(/이 기기에 담은 여행과 일정은 남아/);
  const stored = await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'));
  expect(stored).toBe(trip);
  await logout.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(() => attempts).toBe(1);
  await expect(panel.getByRole('button')).toBeDisabled();
  firstAttempt.release();
  await expect(panel.getByRole('alert')).toContainText('로그아웃을 완료하지 못했습니다');
  await expect(logout).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(stored);
  await Promise.all([page.waitForEvent('domcontentloaded'), logout.click()]);
  await expect(page.getByText('계정 관리를 사용하려면 로그인해 주세요.', { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(stored);
});
