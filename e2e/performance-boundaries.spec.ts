import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions } from "./fixtures";

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

  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator(".planner-navigation nav button").nth(3).click();
  await page.getByRole("button", { name: "지도 함께 보기", exact: true }).click();
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
  const marker = page.getByRole("button", { name: "다음 지역", exact: true });
  await marker.hover();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  expect(photoRequests).toBe(0);

  await marker.hover();
  await marker.click();
  await expect(page.locator("[data-region-stage]")).toHaveAttribute("data-active-region", "하동");
  await expect(page.locator(".region-featured-card .region-scene-photo img")).toHaveAttribute("src", /^https:\/\/tong\.visitkorea\.or\.kr\//);
  expect(photoRequests).toBe(0);
});
