import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { deliverNearby, nearbyPlace, openMapTool, openNearby, openRouteDetails } from './nearby-fixtures';
import { openOnsiteCommunication } from './onsite-communication-fixtures';

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

test('parking location boundary keeps GPS out of API and destination map URL contracts', () => {
  const source = readFileSync(new URL('../features/planner/components/ParkingAlternatives.tsx', import.meta.url), 'utf8');
  expect(source).toContain('navigator.geolocation.getCurrentPosition');
  expect(source).toContain('/api/wave?action=parking-alternatives&contentId=');
  expect(source).not.toMatch(/parking-alternatives[^`\n]*(?:lat|lng|latitude|longitude|accuracy|origin|currentLocation)=/i);
  expect(source).toContain('https://map.kakao.com/link/map/');
  expect(source).not.toMatch(/(?:from|sLat|sLng)=/);
  expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|caches\./);
});

test('restroom location boundary keeps GPS out of API, storage and destination map URL contracts', () => {
  const source = readFileSync(new URL('../features/planner/components/RestroomAlternativeCards.tsx', import.meta.url), 'utf8');
  expect(source).toContain('navigator.geolocation.getCurrentPosition');
  expect(source).toContain('/api/wave?action=restroom-alternatives&contentId=');
  expect(source).not.toMatch(/restroom-alternatives[^`\n]*(?:lat|lng|latitude|longitude|accuracy|origin|currentLocation)=/i);
  expect(source).toContain('https://map.kakao.com/link/map/'); expect(source).not.toMatch(/(?:from|sLat|sLng)=/);
  expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|caches\./);
});

test('parking inquiry component has no location, storage, network, analytics, or dynamic external URL sink', () => {
  const source = readFileSync(new URL('../features/planner/components/ParkingContactPanel.tsx', import.meta.url), 'utf8');
  expect(source).not.toMatch(/geolocation|latitude|longitude|accuracy|currentLocation|userId|trip/i);
  expect(source).not.toMatch(/fetch\(|optionalPlannerJson|localStorage|sessionStorage|indexedDB|document\.cookie|caches\.|analytics|sendBeacon/i);
  expect(source).not.toMatch(/kakaotalk:|intent:|apps\.apple|play\.google|execCommand|postMessage/i);
  expect(source).toContain("https://pf.kakao.com/_LBXwxj/chat");
  expect(source).toContain("https://relaycall.or.kr/user/service/text/text");
});

test('easy trip completion never requests or transfers device location or progress',async({page})=>{
  const requests:string[]=[];
  page.on('request', request => {
    const url = new URL(request.url());
    // Opening the lazy view may fetch its static Vite module on a cold worker.
    // Allow only that exact same-origin, payload-free script; API, beacon,
    // query-string and other requests remain part of the privacy audit.
    const viewModule = url.origin === new URL(page.url()).origin
      && url.pathname === '/features/planner/components/EasyOnTripView.tsx'
      && !url.search && request.method() === 'GET'
      && request.resourceType() === 'script' && request.postData() === null;
    if (!viewModule) requests.push(request.url() + (request.postData() || ''));
  });
  await page.addInitScript(()=>{
    Object.assign(window,{easyTripPrivacyCalls:0});
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(){(window as unknown as {easyTripPrivacyCalls:number}).easyTripPrivacyCalls++;}}});
  });
  const nearby=await openNearby(page);await nearby.getByRole('button',{name:'주변 장소 닫기',exact:true}).click();await openRouteDetails(page);await expect(page).toHaveURL(/#itinerary$/);
  await page.getByRole('button',{name:'여행 당일 진행',exact:true}).click();const panel=page.getByRole('region',{name:'여행 당일 진행',exact:true});
  await page.waitForLoadState('networkidle');requests.length=0;
  await panel.getByRole('button',{name:'쉬운 보기',exact:true}).click();await panel.getByRole('button',{name:'다녀왔어요',exact:true}).click();
  await expect(panel.getByRole('heading',{name:'오늘 일정이 끝났어요',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as {easyTripPrivacyCalls:number}).easyTripPrivacyCalls)).toBe(0);expect(requests).toEqual([]);
  const state=await page.evaluate(()=>({onTrip:localStorage.getItem('wave-on-trip-v1'),trip:localStorage.getItem('wave-current-trip-v1')}));
  expect(state.onTrip).toContain('done');expect(state.onTrip).not.toMatch(/latitude|longitude|accuracy|coords|mapX|mapY/);expect(state.trip).not.toContain('done');
});

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

test('onsite communication never requests location, network, storage, URL, logs or shared data', async ({ page }) => {
  const locationCalls: string[] = [], requests: string[] = [], logs: string[] = [];
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: () => { (window as unknown as { locationCalls: string[] }).locationCalls.push('getCurrentPosition'); },
      watchPosition: () => { (window as unknown as { locationCalls: string[] }).locationCalls.push('watchPosition'); return 1; },
    } });
    (window as unknown as { locationCalls: string[] }).locationCalls = [];
  });
  page.on('request', request => requests.push(request.url() + (request.postData() || '')));
  page.on('console', message => logs.push(message.text()));
  const board = await openOnsiteCommunication(page, false, () => { requests.length = 0; logs.length = 0; });
  const before = await page.evaluate(async () => ({ local: { ...localStorage }, session: { ...sessionStorage }, href: location.href, cookie: document.cookie,
    databases: await indexedDB.databases(), caches: 'caches' in window ? await caches.keys() : [] }));
  const privateText = '현장대화-외부전송금지-528';
  await board.getByRole('button', { name: '직원에게 보여주기', exact: true }).click();
  await board.getByRole('button', { name: '직접 입력', exact: true }).click();
  await board.getByRole('textbox', { name: '직접 입력', exact: true }).fill(privateText);
  await board.getByRole('button', { name: '답변 확정', exact: true }).click();
  await board.getByRole('button', { name: '다시 질문', exact: true }).click();
  await board.getByRole('button', { name: '대화 끝내기', exact: true }).click();
  const after = await page.evaluate(async () => ({ local: { ...localStorage }, session: { ...sessionStorage }, href: location.href, cookie: document.cookie,
    databases: await indexedDB.databases(), caches: 'caches' in window ? await caches.keys() : [], locationCalls: (window as unknown as { locationCalls: string[] }).locationCalls }));
  locationCalls.push(...after.locationCalls);
  expect(locationCalls).toEqual([]);
  expect(requests).toEqual([]);
  expect(after.local).toEqual(before.local);
  expect(after.session).toEqual(before.session);
  expect(after.href).toBe(before.href);
  expect(after.cookie).toBe(before.cookie);
  expect(after.databases).toEqual(before.databases);
  expect(after.caches).toEqual(before.caches);
  for (const privateValue of [privateText, '이용 방법을 알기 쉽게 안내해 주세요.', '현장대화-외부전송금지-528']) {
    expect(requests.join(' ')).not.toContain(privateValue);
    expect(logs.join(' ')).not.toContain(privateValue);
    expect(JSON.stringify(after)).not.toContain(privateValue);
  }
});
