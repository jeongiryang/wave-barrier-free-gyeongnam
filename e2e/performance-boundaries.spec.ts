import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions } from "./fixtures";

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

  const accountButton = page.locator(".account-button:visible").first();
  if (await accountButton.count()) {
    await accountButton.hover();
  } else {
    await page.getByRole("button", { name: "주요 메뉴 열기" }).click();
    await page.getByRole("navigation", { name: "모바일 주요 메뉴" }).getByRole("link", { name: "로그인" }).click();
  }
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

  await page.getByRole("navigation", { name: "여행 계획 단계 이동" }).getByRole("button", { name: /이 기기 일정/ }).click();
  await expect(page.locator(".route-map-canvas")).toBeVisible();
  await expect.poll(() => mapConfigRequests).toBeGreaterThan(0);
});

test("짧게 스친 지역 표식은 사진 요청을 만들지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  let photoRequests = 0;
  await page.route(/\/api\/wave\?action=photo&region=/, (route) => {
    photoRequests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ photo: null }) });
  });
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  const marker = page.locator('[data-region-marker="거창"]');
  await marker.hover();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  expect(photoRequests).toBe(0);

  await marker.hover();
  await expect.poll(() => photoRequests).toBe(1);
});
