import { withRouteCoverage } from "./nearby-fixtures";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";
import { openMapTool, openPlannerMap, openRouteDetails } from "./nearby-fixtures";

test("external directions preserve the public departure, destination and selected mode", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openPlannerMap(page);
  await openRouteDetails(page);
  await withRouteCoverage(page);
  const panel = page.locator(".route-compare-panel");
  await withRouteCoverage(page, async () => { await page.locator(".itinerary-route-coverage select").selectOption("car"); });
  await expect(panel.locator(".route-option")).toHaveCount(2);
  for (const [label, mode] of [["자동차", "car"], ["대중교통", "traffic"], ["도보", "walk"], ["자전거", "bicycle"]]) {
    await panel.getByRole("group", { name: "이동수단별 예상 시간" }).getByRole("button", { name: new RegExp(label) }).click();
    const link = panel.locator('a[href^="https://map.kakao.com/"]');
    await expect(link).toHaveAttribute("href", `https://map.kakao.com/link/by/${mode}/${encodeURIComponent("창원중앙역")},35.2422,128.6982/${encodeURIComponent("경남도립미술관")},35.238,128.691`);
  }
});

test("the second itinerary journey exports its own departure instead of the daily origin", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 담기", exact: true }).click();
  await openPlannerMap(page);
  await openRouteDetails(page);
  await withRouteCoverage(page);
  const coverage = page.locator(".itinerary-route-coverage");
  await withRouteCoverage(page, async () => { await coverage.getByRole("combobox", { name: "이동수단", exact: true }).selectOption("car"); });
  await expect(coverage.locator('[role="status"]')).toContainText("전체 2구간 중 2구간 확인");
  await expect(coverage.locator(".coverage-actions button").first()).toHaveAttribute("aria-busy", "false");
  await withRouteCoverage(page, async () => { await expect(coverage.getByRole("button", { name: "이 구간 지도에서 보기", exact: true })).toHaveCount(2); });
  const second = coverage.locator("li").nth(1);
  await expect(second).toContainText("경남도립미술관 → 용지호수공원");
  await withRouteCoverage(page, async () => { await second.getByRole("button", { name: "이 구간 지도에서 보기", exact: true }).click(); });
  await expect(page.locator('.route-compare-panel a[href^="https://map.kakao.com/"]')).toHaveAttribute("href", `https://map.kakao.com/link/by/car/${encodeURIComponent("경남도립미술관")},35.238,128.691/${encodeURIComponent("용지호수공원")},35.229,128.683`);
});

test("device distance preserves the public journey and keeps coordinates out of external URLs and rechecks", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.addInitScript(() => Object.defineProperty(navigator, "geolocation", {
    configurable: true, value: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 35.3, longitude: 128.7 } } as GeolocationPosition) },
  }));
  const requests: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/route") requests.push(request.url()); });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openPlannerMap(page);
  await openRouteDetails(page);
  await withRouteCoverage(page);
  await withRouteCoverage(page, async () => { await page.locator(".itinerary-route-coverage select").selectOption("car"); });
  await expect(page.locator(".route-option")).toHaveCount(2);
  const coverage = page.locator(".itinerary-route-coverage");
  // The map's selected-leg lookup and the automatic itinerary lookup finish
  // independently. Establish the privacy boundary after both public checks.
  await expect(coverage.locator('[role="status"]')).toContainText("전체 1구간 중 1구간 확인");
  await expect(coverage.locator(".coverage-actions button").first()).toHaveAttribute("aria-busy", "false");
  for (const request of requests) {
    const params = new URL(request).searchParams;
    expect(Object.fromEntries(params)).toEqual({ startLat: "35.2422", startLng: "128.6982", endLat: "35.238", endLng: "128.691", mode: params.get("mode") });
    expect(["car", "transit"]).toContain(params.get("mode"));
  }
  const before = requests.length;
  await openMapTool(page, "route");
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#map-panel-route").getByRole("button", { name: /기기에서 거리 확인/ }).click();
  const panel = page.locator(".route-compare-panel");
  await expect(page.locator(".map-provider-badge")).toContainText(/직선거리 약 [\d.]+km/);
  await expect(page.locator(".map-toolbar > button").first()).toContainText("창원중앙역");
  await expect(panel.locator('a[href^="https://map.kakao.com/"]')).toHaveAttribute("href", `https://map.kakao.com/link/by/car/${encodeURIComponent("창원중앙역")},35.2422,128.6982/${encodeURIComponent("경남도립미술관")},35.238,128.691`);
  await expect(coverage.locator('[role="status"]')).toContainText("전체 1구간 중 1구간 확인");
  expect(requests).toHaveLength(before);
  await withRouteCoverage(page, async () => { await coverage.locator(".coverage-actions button").first().click(); });
  await expect.poll(() => requests.length).toBe(before + 1);
  await expect(coverage.locator(".coverage-actions button").first()).toHaveAttribute("aria-busy", "false");
  expect(Object.fromEntries(new URL(requests.at(-1)!).searchParams)).toEqual({ startLat: "35.2422", startLng: "128.6982", endLat: "35.238", endLng: "128.691", mode: "car" });
  await page.clock.install(); await page.clock.runFor(1000);
  expect(requests).toHaveLength(before + 1);
  expect(requests.some(request => new URL(request).searchParams.get("startLat") === "35.3" || new URL(request).searchParams.get("startLng") === "128.7")).toBe(false);
  await panel.screenshot({ path: test.info().outputPath("device-distance-public-journey.png") });
});
