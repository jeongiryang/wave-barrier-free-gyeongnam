import { expect, test } from "@playwright/test";
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

  await page.locator(":is(.wave-header-actions,.wave-footer-tools) > a[href=\"/account\"]").hover();
  await expect.poll(() => sessionRequests).toBeGreaterThan(0);
});

test("랜딩 로그인 의도로 세션을 확인해도 키보드 초점과 링크를 유지한다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await mockPublicShellApi(page);
  let sessions = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/auth/get-session") sessions++; });
  await page.goto("/");
  await expect(page.locator(".wave-support-menu")).toHaveAttribute("aria-busy", "false");
  const login = page.locator(".night-login");
  await expect(login).toHaveAttribute("href", "/login?next=%2F");
  await login.focus();
  await expect.poll(() => sessions).toBeGreaterThan(0);
  await expect(login).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(url => url.pathname === "/login" && url.searchParams.get("next") === "/");
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
  let photoRequests = 0;
  await page.route(/\/api\/wave\?action=photo&region=/, (route) => {
    photoRequests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ photo: null }) });
  });
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/");
  await page.locator("#regions").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  const more = page.locator('.simple-show-regions');
  await more.hover(); await page.mouse.move(0, 0); await page.waitForTimeout(250); expect(photoRequests).toBe(0);
  await more.click(); await expect(page.locator('.simple-region-grid .simple-region')).toHaveCount(18);
  const card = page.locator('.simple-region').filter({ has: page.getByRole('heading', { name: '하동', exact: true }) });
  await card.hover(); await expect(card.locator('img')).toHaveAttribute('src', /^https:\/\/tong\.visitkorea\.or\.kr\//); expect(photoRequests).toBe(0);
});
