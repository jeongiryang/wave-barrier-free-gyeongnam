import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions, openItinerary } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

test("공개 랜딩은 첫 화면에서 인증 세션을 요청하지 않고 계정 의도 뒤에 연결한다", async ({ page }) => {
  await mockPublicShellApi(page);
  let sessionRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/get-session") sessionRequests += 1;
  });

  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  await page.waitForTimeout(500);
  expect(sessionRequests).toBe(0);

  await page.locator(".wave-header").getByRole("button", { name: "계정 관리", exact: true }).click();
  await expect.poll(() => sessionRequests).toBeGreaterThan(0);
});

test("랜딩 로그인 의도로 세션을 확인해도 키보드 초점과 링크를 유지한다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await mockPublicShellApi(page);
  let sessions = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/auth/get-session") sessions++; });
  await page.goto("/");
  await expect(page.locator(".wave-support-menu")).toHaveAttribute("aria-busy", "false");
  const account = page.locator('.wave-header .wave-profile-entry');
  await expect(account).toHaveAttribute('type', 'button');
  await expect(account).toHaveAccessibleName('계정 관리');
  await account.focus();
  await expect(account).toBeFocused();
  await account.press('Enter');
  await expect.poll(() => sessions).toBeGreaterThan(0);
  const login = page.locator('.wave-header').getByRole('link', { name: '로그인', exact: true });
  const trigger = page.locator('.wave-header .account-menu:not(.wave-support-menu) > button');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await trigger.press('Tab');
  await expect(login).toBeFocused();
  await expect(login).toHaveAttribute('href', '/login');
  await login.press('Enter');
  await expect(page).toHaveURL(url => url.pathname === '/login');
});

test("안내형 플래너의 숨은 지도는 일정 단계가 열릴 때까지 네트워크를 쓰지 않는다", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  let mapConfigRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/map-config") mapConfigRequests += 1;
  });

  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  await page.waitForTimeout(500);
  expect(mapConfigRequests).toBe(0);
  await expect(page.locator(".route-map-canvas")).toHaveCount(0);

  await page.locator('.simple-place-row').first().locator('.simple-place-add').click(); await openItinerary(page);
  if ((page.viewportSize()?.width || 0) < 1024) {
    const mapToggle = page.getByRole('group', { name: '일정 보기 방식' });
    await expect(mapToggle).toBeVisible();
    await mapToggle.getByRole('button', { name: '지도', exact: true }).click();
  }
  await expect(page.locator(".route-map-canvas")).toBeVisible();
  await expect.poll(() => mapConfigRequests).toBeGreaterThan(0);
});

test("지역 사진 선택과 hover는 불필요한 사진 API 요청을 만들지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  const bitmap = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: bitmap }));
  await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\//, route => route.abort());
  // The adjacent map legitimately loads 18 thumbnails when it intersects. Hold
  // only that observer until the card's zero-request boundary has been checked.
  // Replay its real entries afterward so the independent map path is also tested.
  await page.addInitScript(() => {
    const NativeObserver = window.IntersectionObserver;
    const pending = new Map<IntersectionObserver, { entries: IntersectionObserverEntry[]; callback: IntersectionObserverCallback }>();
    let released = false;
    const gate = { held: false, release() {
      released = true;
      const callbacks = [...pending.entries()]; pending.clear();
      for (const [observer, { entries, callback }] of callbacks) callback(entries, observer);
    } };
    (window as Window & { __regionPhotoMapGate?: typeof gate }).__regionPhotoMapGate = gate;
    window.IntersectionObserver = class extends NativeObserver {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super((entries, observer) => {
          const mapEntries = entries.filter(entry => entry.target.matches('.night-journey-map .region-picker'));
          if (!released && mapEntries.length) {
            gate.held = true;
            pending.set(observer, { entries: mapEntries, callback });
            entries = entries.filter(entry => !mapEntries.includes(entry));
          }
          if (entries.length) callback(entries, observer);
        }, options);
      }
      disconnect() { pending.delete(this); super.disconnect(); }
    };
  });
  let photoRequests = 0;
  const mapRequests: { region: string | null; method: string; keys: string[] }[] = [];
  await page.route(/\/api\/wave\?action=photo&region=/, (route) => {
    photoRequests += 1;
    const url = new URL(route.request().url());
    mapRequests.push({ region: url.searchParams.get('region'), method: route.request().method(), keys: [...url.searchParams.keys()].sort() });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ photo: null }) });
  });
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/");
  // Confirm the real map observer has fired, without letting its separate
  // requests race the card assertions as viewport/layout timing changes.
  await page.locator("#story .night-journey-map").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (window as Window & { __regionPhotoMapGate?: { held: boolean } }).__regionPhotoMapGate?.held);
  expect(photoRequests).toBe(0);
  await page.locator("#regions").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  const more = page.locator('.simple-show-regions');
  await more.hover(); await page.mouse.move(0, 0); await page.waitForTimeout(250); expect(photoRequests).toBe(0);
  await more.click(); await expect(page.locator('.simple-region-grid .simple-region')).toHaveCount(18);
  const card = page.locator('.simple-region').filter({ has: page.getByRole('heading', { name: '하동', exact: true }) });
  await card.hover(); await expect(card.locator('img')).toHaveAttribute('src', /^https:\/\/tong\.visitkorea\.or\.kr\//); expect(photoRequests).toBe(0);
  await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(photoRequests).toBe(0);

  await page.evaluate(() => (window as Window & { __regionPhotoMapGate?: { release: () => void } }).__regionPhotoMapGate?.release());
  await page.locator('#story .night-journey-map').scrollIntoViewIfNeeded();
  await expect.poll(() => photoRequests).toBe(18);
  const mapRegions = await page.locator('#story .night-journey-map [data-region-photo]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-region-photo')).sort());
  expect(mapRegions).toHaveLength(18);
  expect(mapRequests.map(request => request.region).sort()).toEqual(mapRegions);
  expect(mapRequests.every(request => request.method === 'GET')).toBe(true);
  for (const request of mapRequests) expect(request.keys).toEqual(['action', 'region']);
});
