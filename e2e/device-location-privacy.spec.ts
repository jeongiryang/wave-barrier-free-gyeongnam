import { expect, test } from '@playwright/test';
import { deliverNearby, nearbyPlace, openMapTool, openNearby, openRouteDetails } from './nearby-fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

interface LocationAudit {
  calls: number;
  baseline: boolean;
  sdk: Array<{ method: string; args: unknown[]; samePublicBounds?: boolean }>;
}
type AuditWindow = Window & {
  deviceLocationAudit: LocationAudit;
  kakao: { maps: { LatLng: new (...args: unknown[]) => object; services: { Places: { prototype: { categorySearch: (...args: unknown[]) => unknown } } } } };
  mapLayerFixture: { maps: Array<Record<string, unknown>> };
};

for (const entry of ['toolbar', 'panel'] as const) test(`accepted ${entry} GPS measures locally while map, nearby, routes, Naru and storage retain public places`, async ({ page }) => {
  const position = { latitude: 35.12345678, longitude: 128.87654321 };
  const requests: string[] = [], routeRequests: string[] = [], assistantPayloads: unknown[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    requests.push(request.url() + (request.postData() || ''));
    if (new URL(request.url()).pathname === '/api/route') routeRequests.push(request.url());
  });
  await page.addInitScript(position => {
    const audit: LocationAudit = { calls: 0, baseline: true, sdk: [] };
    Object.assign(window, { deviceLocationAudit: audit });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(success: PositionCallback) {
      audit.calls++;
      success({ coords: position } as GeolocationPosition);
    } } });
  }, position);
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    assistantPayloads.push(route.request().postDataJSON());
    return route.fulfill({ json: { reply: '합성 검증: 담은 공개 여행지를 그대로 확인했어요.', proposal: null } });
  });
  const nearby = await openNearby(page);
  await nearby.getByRole('button', { name: '주변 장소 닫기', exact: true }).click();
  await openRouteDetails(page);
  await expect(page.locator('.coverage-actions > button').first()).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.route-options')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.coverage-notice')).toContainText('조회가 끝났습니다.');
  await page.clock.install();
  // Instrument actual SDK entry points after its initial public-place setup.
  await page.evaluate(() => {
    const w = window as unknown as AuditWindow, audit = w.deviceLocationAudit, maps = w.kakao.maps;
    maps.LatLng = new Proxy(maps.LatLng, { construct(target, args) {
      audit.sdk.push({ method: 'LatLng', args }); return Reflect.construct(target, args);
    } });
    for (const map of w.mapLayerFixture.maps) {
      let publicBounds: unknown;
      for (const method of ['setCenter', 'panTo', 'setBounds', 'setLevel']) {
        const original = map[method];
        if (typeof original === 'function') map[method] = (...args: unknown[]) => {
          if (method === 'setBounds' && audit.baseline) publicBounds = args[0];
          audit.sdk.push({ method, args, ...(method === 'setBounds' ? { samePublicBounds: publicBounds !== undefined && args[0] === publicBounds } : {}) });
          return Reflect.apply(original, map, args);
        };
      }
    }
    const prototype = maps.services.Places.prototype, original = prototype.categorySearch;
    prototype.categorySearch = function (...args: unknown[]) {
      audit.sdk.push({ method: 'categorySearch', args: args.filter(value => typeof value !== 'function') });
      return Reflect.apply(original, this, args);
    };
  });
  // Capture the real public-place fit caused by opening this tool. Its 260ms
  // resize debounce is separate from the GPS action under test.
  await openMapTool(page, 'route');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
  await page.clock.runFor(300);
  await expect.poll(() => page.evaluate(() => (window as unknown as AuditWindow).deviceLocationAudit.sdk.some(call => call.method === 'setBounds'))).toBe(true);
  if (entry === 'toolbar') {
    await page.locator('#map-panel-route').getByRole('button', { name: '출발지 목적지 설정 닫기', exact: true }).click();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
    await page.clock.runFor(300);
  }
  const mapCount = await page.evaluate(() => {
    const w = window as unknown as AuditWindow; w.deviceLocationAudit.baseline = false; w.deviceLocationAudit.sdk = [];
    return w.mapLayerFixture.maps.length;
  });
  const publicOrigin = page.locator('.map-toolbar > button').first();
  await expect(publicOrigin).toContainText('창원중앙역');
  const storedTrip = await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'));
  const before = [...routeRequests];
  const button = page.locator(entry === 'panel' ? '#map-panel-route' : '.map-command-bar').getByRole('button', { name: /기기에서 거리 확인/ });
  page.once('dialog', dialog => dialog.accept()); await button.click();
  await expect(page.locator('.map-provider-badge')).toContainText(/직선거리 약 [\d.]+km/);
  await expect(page.locator('.map-provider-badge')).toContainText('기기 안에서만 계산');
  await expect(publicOrigin).toContainText('창원중앙역');
  await page.clock.runFor(1000);
  const audit = await page.evaluate(() => (window as unknown as AuditWindow).deviceLocationAudit);
  expect(audit.calls).toBe(1);
  // A longer device-distance notice may change available map padding. It may
  // refit the exact existing public bounds, never create a GPS point or pan.
  for (const call of audit.sdk) expect({ method: call.method, samePublicBounds: call.samePublicBounds }).toEqual({ method: 'setBounds', samePublicBounds: true });
  expect(await page.evaluate(() => (window as unknown as AuditWindow).mapLayerFixture.maps.length)).toBe(mapCount);
  expect(routeRequests).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(storedTrip);

  await openMapTool(page, 'nearby');
  await nearby.getByRole('button', { name: '음식점', exact: true }).click();
  await deliverNearby(page, 0, 'OK', [nearbyPlace()]);
  await expect(nearby.locator('article')).toHaveCount(1);
  const searches = await page.evaluate(() => (window as unknown as AuditWindow).deviceLocationAudit.sdk.filter(call => call.method === 'categorySearch'));
  expect(searches).toHaveLength(1);
  expect(searches[0].args[0]).toBe('FD6');
  expect(JSON.stringify(searches)).toContain('35.23');
  expect(JSON.stringify(searches)).toContain('128.68');
  await nearby.getByRole('button', { name: '주변 장소 닫기', exact: true }).click();
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill('담은 일정을 요약해줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat).toContainText('담은 공개 여행지를 그대로 확인했어요.');
  expect(assistantPayloads).toHaveLength(1);
  const snapshot = await page.evaluate(() => ({ storage: { local: { ...localStorage }, session: { ...sessionStorage } }, sdk: (window as unknown as AuditWindow).deviceLocationAudit.sdk,
    links: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'), link => link.href) }));
  for (const coordinate of Object.values(position).map(String)) {
    expect(requests.join(' ')).not.toContain(coordinate);
    expect(JSON.stringify(assistantPayloads)).not.toContain(coordinate);
    expect(JSON.stringify(snapshot)).not.toContain(coordinate);
  }
  expect(routeRequests).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(storedTrip);
  expect(errors).toEqual([]);
});
