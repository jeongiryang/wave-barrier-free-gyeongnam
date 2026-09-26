import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
import { enterDeparture, openDeparture } from './departure-fixtures';
import { closeNaruTool } from './naru-tool-fixtures';
async function prepare(page: Page, en: boolean) {
  await mockPlannerApi(page);
  await page.addInitScript(en => { localStorage.setItem('wave-theme', en ? 'dark' : 'light'); localStorage.setItem('wave-locale', en ? 'en' : 'ko'); }, en);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/planner'); await enterDeparture(page);
  await expect(page.locator('.simple-readiness-heading button')).toHaveAttribute('aria-busy', 'false');
}
for (const en of [false, true]) test(`${en ? 'EN dark' : 'KO light'}: a fast place refresh cannot finish the pending weather refresh`, async ({ page }, testInfo) => {
  await prepare(page, en);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let weatherRequests = 0, planRequests = 0;
  await page.route('**/api/weather?*', async route => { weatherRequests++; await gate; await route.fallback(); });
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/api/wave' && url.searchParams.get('action') === 'plan') planRequests++; });
  const refresh = page.locator('.simple-readiness-heading button');
  try {
    const response = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === '/api/wave' && url.searchParams.get('action') === 'plan'; });
    await refresh.focus(); await page.keyboard.press('Enter'); await response;
    await expect.poll(() => weatherRequests).toBe(1);
    await expect(refresh).toHaveAttribute('aria-busy', 'true'); await expect(refresh).toHaveAttribute('aria-disabled', 'true');
    await expect(refresh).toBeFocused(); await page.keyboard.press('Enter');
    expect(planRequests).toBe(1); expect(weatherRequests).toBe(1);
  } finally { release(); }
  await expect(refresh).toHaveAttribute('aria-busy', 'false'); await expect(refresh).toHaveText('다시 조회'); await expect(refresh).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-saved-places') || '[]'))).toEqual(['1001']);
  expect((await new AxeBuilder({ page }).include('.simple-readiness').analyze()).violations).toEqual([]);
  if (testInfo.project.name === 'desktop-chromium') for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 960 }); await page.locator('.simple-readiness').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`refresh-${en}-${width}.png`) });
  }
});
for (const en of [false, true]) test(`${en ? 'EN dark' : 'KO light'}: empty facility preferences refresh without adding a filter`, async ({ page }) => {
  await prepare(page, en);
  await closeNaruTool(page);
  await page.locator(".wave-header .night-search-link").click(); await page.locator('.simple-facility-trigger').click();
  const picker = page.getByRole('dialog', { name: '필요한 편의', exact: true });
  await picker.getByRole('button', { name: '선택 해제', exact: true }).click();
  const automatic = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/wave' && url.searchParams.get('action') === 'plan' && url.searchParams.get('region') === '창원'
      && url.searchParams.get('profiles') === '' && url.searchParams.get('facilityKeys') === '' && url.searchParams.get('locale') === (en ? 'en' : 'ko');
  });
  await picker.getByRole('button', { name: /^적용/ }).click(); await (await automatic).finished();
  await expect(page.locator('.simple-results')).toHaveAttribute('aria-busy', 'false');
  await page.locator(".wave-header .wave-my-trips").click(); await openDeparture(page);
  const refresh = page.locator('.simple-readiness-heading button'); await expect(refresh).toHaveAttribute('aria-busy', 'false');
  const searches: URL[] = []; page.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/api/wave' && url.searchParams.get('action') === 'plan') searches.push(url); });
  const weather = page.waitForResponse(response => new URL(response.url()).pathname === '/api/weather');
  await refresh.click(); await weather; await expect(refresh).toHaveAttribute('aria-busy', 'false');
  expect(searches).toHaveLength(1); expect(searches[0].searchParams.get('profiles')).toBe(''); expect(searches[0].searchParams.get('facilityKeys')).toBe('');
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]'))).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-saved-places') || '[]'))).toEqual(['1001']);
});

test('an immediate departure recheck consumes the pending search for cleared facilities exactly once', async ({ page }, testInfo) => {
  await page.clock.install();
  await prepare(page, false);
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  const events: { phase: string; event: string; url: string; at: number }[] = [];
  let phase = 'clear preferences';
  const isPlanSearch = (value: string) => {
    const url = new URL(value);
    return url.pathname === '/api/wave' && url.searchParams.get('action') === 'plan';
  };
  page.on('request', request => { if (isPlanSearch(request.url())) events.push({ phase, event: 'request', url: request.url(), at: Date.now() }); });
  page.on('response', async response => {
    if (!isPlanSearch(response.url())) return;
    events.push({ phase, event: 'response', url: response.url(), at: Date.now() });
    await response.finished();
    events.push({ phase, event: 'completed', url: response.url(), at: Date.now() });
  });
  try {
    await closeNaruTool(page);
    await page.locator(".wave-header .night-search-link").click();
    await page.locator('.simple-facility-trigger').click();
    const picker = page.getByRole('dialog', { name: '필요한 편의', exact: true });
    await picker.getByRole('button', { name: '선택 해제', exact: true }).click();
    await picker.getByRole('button', { name: /^적용/ }).click();
    expect(events.filter(event => event.event === 'request')).toHaveLength(0);
    await page.locator(".wave-header .wave-my-trips").click(); await openDeparture(page);
    const refresh = page.locator('.simple-readiness-heading button');
    await expect(refresh).toHaveAttribute('aria-busy', 'false');
    phase = 'explicit recheck before debounce';
    const response = page.waitForResponse(response => isPlanSearch(response.url()));
    const weather = page.waitForResponse(response => new URL(response.url()).pathname === '/api/weather');
    await refresh.click(); await (await response).finished();
    // Weather begins on the next animation frame. Complete that frame without
    // reaching the separately scheduled 250ms automatic place-search timer.
    await page.clock.runFor(32); await (await weather).finished();
    await expect(refresh).toHaveAttribute('aria-busy', 'false');
    expect(events.filter(event => event.event === 'request')).toHaveLength(1);
    await expect.poll(() => events.filter(event => event.event === 'completed').length).toBe(1);
    const queries = () => events.filter(event => event.event === 'request').map(event => Object.fromEntries(new URL(event.url).searchParams));
    const expected = [{ action: 'plan', region: '창원', themes: 'nature', facilityKeys: '', profiles: '', page: '1', locale: 'ko' }];
    expect(queries()).toEqual(expected);
    phase = 'after explicit recheck completed';
    await page.clock.runFor(1000);
    expect(queries()).toEqual(expected);
    expect(events.filter(event => event.event === 'completed')).toHaveLength(1);
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]'))).toEqual([]);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-saved-places') || '[]'))).toEqual(['1001']);
  } finally {
    await testInfo.attach('departure-search-order', { body: JSON.stringify(events, null, 2), contentType: 'application/json' });
  }
});
