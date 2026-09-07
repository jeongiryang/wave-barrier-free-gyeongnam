import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { deliverNearby, nearbyPlace, openNearby, type MapLayerFixture } from "./nearby-fixtures";

async function changeLanguage(page: Page, english: boolean) {
  await page.keyboard.press("Control+Home");
  const preferences = page.locator(".preference-controls:visible");
  await preferences.getByLabel(english ? "환경설정 열기" : "Open preferences", { exact: true }).click();
  await preferences.getByLabel(english ? "언어" : "Language", { exact: true }).selectOption(english ? "en" : "ko");
  await preferences.getByLabel(english ? "Open preferences" : "환경설정 열기", { exact: true }).click();
}

for (const theme of ["light", "dark"]) {
  test(`map commands, point selection and forecast switch language without rebuilding the map ${theme}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const nearby = await openNearby(page, true, theme);
    await nearby.getByRole("button", { name: "Close nearby places", exact: true }).click();
    const commands = page.getByRole("navigation", { name: "Map tools", exact: true });
    await expect(commands).toBeVisible();
    await expect(page.locator(".route-map-shell")).toHaveAttribute("lang", "en");
    await expect(page.locator(".map-provider-badge strong")).toHaveText("Showing Kakao Maps.");
    await expect(page.getByRole("region", { name: "Interactive map of the departure point and itinerary places", exact: true })).toBeVisible();
    await expect(page.locator(".map-crowd-legend")).toContainText("30-day crowd forecast");
    await expect(page.locator(".map-crowd-legend")).toContainText("Quiet");
    await expect(page.locator(".map-crowd-legend em")).toHaveText("24.0%");
    const departure = commands.getByRole("button", { name: "⇄ Route points", exact: true });
    await departure.focus(); await page.keyboard.press("Enter");
    const panel = page.getByRole("region", { name: "Departure and destination settings", exact: true });
    await expect(panel.getByRole("button", { name: "Close departure and destination settings", exact: true })).toBeFocused();
    await panel.getByRole("button", { name: /Choose departure on map/ }).click();
    await expect(page.locator(".map-provider-badge")).toContainText("Click the map to choose a new departure point.");
    await expect(panel).toContainText("Press Escape or close this panel to cancel.");
    expect((await new AxeBuilder({ page }).include("#map-panel-route").analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(departure).toBeFocused();
    await expect(page.locator(".map-provider-badge")).toContainText("Map point selection cancelled.");
    const expand = commands.locator(".map-expand-button");
    await expect(expand).toHaveAccessibleName("⛶ Expand map");
    await expand.click(); await expect(expand).toHaveAttribute("aria-pressed", "true");
    await expect(expand).toHaveText("× Close expanded map");
    await page.keyboard.press("Escape"); await expect(expand).toBeFocused();
    await expect(expand).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
    const count = await page.evaluate(() => (window as unknown as { mapLayerFixture: MapLayerFixture }).mapLayerFixture.maps.length);
    await changeLanguage(page, false);
    await expect(page.getByRole("navigation", { name: "지도 기능", exact: true })).toBeVisible();
    await expect(page.locator(".map-crowd-legend")).toContainText("여유");
    await changeLanguage(page, true);
    await expect(commands.getByRole("button", { name: "◎ My location", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => (window as unknown as { mapLayerFixture: MapLayerFixture }).mapLayerFixture.maps.length)).toBe(count);
    await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
    for (const width of [390, 960, 1366, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await departure.focus();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator(".route-map-shell").screenshot({ path: test.info().outputPath(`map-language-${theme}-${width}.png`) });
    }
    expect((await new AxeBuilder({ page }).include(".route-map-shell").analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`English map loading and alternative-map notice preserve the itinerary ${theme}`, async ({ page }) => {
    const nearby = await openNearby(page, true, theme);
    await nearby.getByRole("button", { name: "Close nearby places", exact: true }).click();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    // Changing search language invalidates the old recommendation contract.
    await page.getByRole("button", { name: "Find places →", exact: true }).click();
    await expect(page.getByRole("button", { name: "용지호수공원 Add to itinerary", exact: true })).toBeEnabled();
    await page.route("**/api/map-config", async route => {
      await gate;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ provider: "osm" }) });
    });
    await page.getByRole("button", { name: "용지호수공원 Add to itinerary", exact: true }).click();
    try {
      await expect(page.getByRole("status", { name: "Connecting map", exact: true })).toBeVisible();
      await expect(page.locator(".map-loading-skeleton")).toContainText("Connecting to Kakao Maps.");
      await expect(page.locator(".map-provider-badge strong")).toHaveText("Connecting to Kakao Maps.");
    } finally { release(); }
    await expect(page.locator(".map-provider-badge.osm")).toContainText("The main map is unavailable. Showing an alternative map.");
    await expect(page.getByRole("button", { name: "Reconnect the main map", exact: true })).toBeVisible();
    await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
    await changeLanguage(page, false);
    await expect(page.locator(".map-provider-badge.osm")).toContainText("기본 지도를 불러오지 못해 대체 지도를 표시합니다.");
    await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
  });

  test(`English map place details distinguish location from accessibility evidence ${theme}`, async ({ page }) => {
    const nearby = await openNearby(page, true, theme);
    await nearby.getByRole("button", { name: "Restaurants", exact: true }).click();
    await deliverNearby(page, 0, "OK", [nearbyPlace()]);
    await nearby.getByRole("button", { name: "View on map", exact: true }).click();
    const details = page.getByRole("region", { name: "Details for 검증 장소 1", exact: true });
    await expect(details).toBeVisible();
    await expect(details).toContainText("Names, addresses and descriptions are shown in their original language.");
    await expect(details).toContainText("This marker shows a location, not verified accessibility.");
    await expect(details.getByRole("heading", { name: "검증 장소 1", exact: true })).toHaveAttribute("lang", "ko");
    await expect(details.getByRole("button", { name: "Set as departure", exact: true })).toBeEnabled();
    await expect(details.getByRole("button", { name: "Set as destination", exact: true })).toBeEnabled();
    await expect(details.getByRole("link", { name: "Kakao place details and reviews ↗", exact: true })).toHaveAttribute("href", "https://place.map.kakao.com/1");
    expect((await new AxeBuilder({ page }).include("#map-panel-place").analyze()).violations).toEqual([]);
  });
}
