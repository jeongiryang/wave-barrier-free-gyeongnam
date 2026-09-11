import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

test("external directions preserve the public departure, destination and selected mode", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const panel = page.locator(".route-compare-panel");
  await page.locator(".itinerary-route-coverage select").selectOption("car");
  await expect(panel.locator(".route-option")).toHaveCount(2);
  for (const [label, mode] of [["자동차", "car"], ["대중교통", "traffic"], ["도보", "walk"], ["자전거", "bicycle"]]) {
    await panel.getByRole("group", { name: "이동수단별 예상 시간" }).getByRole("button", { name: new RegExp(label) }).click();
    const link = panel.locator('a[href^="https://map.kakao.com/"]');
    await expect(link).toHaveAttribute("href", `https://map.kakao.com/link/by/${mode}/${encodeURIComponent("창원중앙역")},35.2422,128.6982/${encodeURIComponent("경남도립미술관")},35.238,128.691`);
  }
});

test("the second itinerary journey exports its own departure instead of the daily origin", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  const coverage = page.locator(".itinerary-route-coverage");
  await coverage.getByRole("combobox", { name: "이동수단", exact: true }).selectOption("car");
  await coverage.getByRole("button", { name: "모든 구간 조회하기", exact: true }).click();
  await expect(coverage.getByRole("button", { name: "이 구간 지도에서 보기", exact: true })).toHaveCount(2);
  const second = coverage.locator("li").nth(1);
  await expect(second).toContainText("경남도립미술관 → 용지호수공원");
  await second.getByRole("button", { name: "이 구간 지도에서 보기", exact: true }).click();
  await expect(page.locator('.route-compare-panel a[href^="https://map.kakao.com/"]')).toHaveAttribute("href", `https://map.kakao.com/link/by/car/${encodeURIComponent("경남도립미술관")},35.238,128.691/${encodeURIComponent("용지호수공원")},35.229,128.683`);
});

test("device location stays out of external URLs and route requests with an explicit recovery message", async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(() => Object.defineProperty(navigator, "geolocation", {
    configurable: true, value: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 35.3, longitude: 128.7 } } as GeolocationPosition) },
  }));
  const requests: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/route") requests.push(request.url()); });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator(".itinerary-route-coverage select").selectOption("car");
  await expect(page.locator(".route-option")).toHaveCount(2);
  const before = requests.length;
  await page.locator('.map-command-bar button[aria-controls="map-panel-route"]').click();
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#map-panel-route").getByRole("button", { name: /현재 위치에서 출발/ }).click();
  const panel = page.locator(".route-compare-panel");
  await expect(panel).toContainText("현재 위치 좌표는 WAVE 경로 API나 외부 링크에 넣지 않습니다.");
  await expect(panel.locator('a[href^="https://map.kakao.com/"]')).toHaveAttribute("href", `https://map.kakao.com/link/to/${encodeURIComponent("경남도립미술관")},35.238,128.691`);
  expect(requests.length).toBe(before);
  await panel.screenshot({ path: test.info().outputPath("private-origin-recovery.png") });
});
