import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

for (const focus of ["panel", "outside", "pending-location"]) test(`a final map failure closes an open point panel and respects ${focus} focus`, async ({ page }) => {
  // Under CPU pressure an animation frame can run before React commits the error UI.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const state = { calls: 0, release: () => undefined as void };
    Object.assign(window, { locationFixture: state });
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (success: PositionCallback) => {
      state.calls++;
      state.release = () => success({ coords: { latitude: 35.3, longitude: 128.7 } } as GeolocationPosition);
    } } });
  });
  let reject!: () => void;
  const held = new Promise<void>((resolve) => { reject = resolve; });
  let routeRequests = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/route") routeRequests++; });
  await page.route(/\/leaflet\.js(?:\?|$)/, async (route) => { await held; await route.abort(); });
  try {
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    await page.locator(".itinerary-route-coverage select").selectOption("car");
    await page.locator('.map-command-bar button[aria-controls="map-panel-route"]').click();
    const panel = page.locator("#map-panel-route");
    await expect(panel).toBeVisible();
    const pick = panel.getByRole("button", { name: /지도에서 출발지 선택/ });
    if (focus === "pending-location") {
      page.once("dialog", (dialog) => dialog.accept());
      await panel.getByRole("button", { name: /현재 위치에서 출발/ }).click();
      expect(await page.evaluate(() => (window as unknown as { locationFixture: { calls: number } }).locationFixture.calls)).toBe(1);
    } else {
      await pick.click();
      await expect(pick).toHaveAttribute("aria-pressed", "true");
    }
    const outside = page.locator(".route-option").first();
    if (focus === "outside") await outside.focus();
    const requestsBefore = routeRequests;
    reject();
    await expect(page.locator(".map-provider-badge.error")).toBeVisible();
    await expect(panel).toHaveCount(0);
    await expect(page.locator(".map-pick-notice,.roadview-pick-banner,#map-roadview-panel")).toHaveCount(0);
    const retry = page.locator(".map-unavailable").getByRole("button", { name: "페이지와 지도 다시 불러오기", exact: true });
    await expect(retry).toBeVisible();
    if (focus === "outside") await expect(outside).toBeFocused();
    else await expect(retry).toBeFocused();
    if (focus === "pending-location") await page.evaluate(() => (window as unknown as { locationFixture: { release: () => void } }).locationFixture.release());
    await expect(page.locator(".map-provider-badge.error")).toBeVisible();
    expect(routeRequests).toBe(requestsBefore);
    expect(await page.evaluate(() => (window as unknown as { locationFixture: { calls: number } }).locationFixture.calls)).toBe(focus === "pending-location" ? 1 : 0);
    await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
    await retry.scrollIntoViewIfNeeded();
    expect(await retry.evaluate((element) => { const b = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); })).toBe(true);
    expect((await new AxeBuilder({ page }).include(".route-map-shell").analyze()).violations).toEqual([]);
    await page.locator(".map-unavailable").screenshot({ path: test.info().outputPath(`map-failure-${focus}.png`) });
  } finally { reject(); }
});
