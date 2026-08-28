import { expect, test } from "@playwright/test";
import { CLIENT_BUDGET_MS, SERVER_BUDGET_MS } from "../lib/request-budget.js";
import { mockPlannerApi } from "./fixtures";

/**
 * 상류가 느렸을 뿐 서버가 정상 응답한 결과를 클라이언트가 버리면 안 된다.
 * 예전에는 경로 요청의 서버 상류 타임아웃과 클라이언트 예산이 똑같이 12초라,
 * 느린 상류에서 200 응답이 도착해도 화면에는 "준비 중"만 남았다.
 */
test.setTimeout(90_000);

test("느리지만 성공한 경로 응답을 버리지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);

  // 서버가 자기 예산을 거의 다 쓰고 정상 응답하는 상황. 클라이언트 예산은
  // 이보다 길어야 하므로 이 응답은 반드시 화면에 닿아야 한다.
  const serverSlowestMs = SERVER_BUDGET_MS.route + 1_500;
  expect(serverSlowestMs, "클라이언트 예산이 서버 최악 응답을 감싸야 한다").toBeLessThan(CLIENT_BUDGET_MS.route);

  await page.route("**/api/route**", async (requestRoute) => {
    await new Promise((resolve) => setTimeout(resolve, serverSlowestMs));
    await requestRoute.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        configured: true,
        alternatives: [{
          id: "slow-car", label: "느린 자동차 경로", provider: "Kakao Mobility", mode: "car",
          totalTime: 25, payment: 0, totalWalk: 0, transfers: 0, totalDistance: 8800,
          configured: true,
          segments: [{ type: "car", name: "추천 자동차 경로", minutes: 25 }],
          geometry: [{ lat: 35.227, lng: 128.681 }, { lat: 35.238, lng: 128.691 }],
        }],
        providers: [{ id: "kakao", name: "자동차 길찾기", role: "실제 도로 경로", configured: true, state: "connected" }],
        context: { nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] },
        message: "연결된 교통 API의 경로를 비교합니다.",
      }),
    });
  });

  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  await expect(page.getByText("느린 자동차 경로").first()).toBeVisible({ timeout: 25_000 });
});
