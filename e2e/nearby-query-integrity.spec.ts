import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { deliverNearby, nearbyPlace, nearbyRequests, openNearby } from "./nearby-fixtures";

for (const english of [false, true]) for (const theme of ["light", "dark"]) test(`nearby errors, empty results and explicit retry remain accessible in ${english ? "English" : "Korean"} ${theme}`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const panel = await openNearby(page, english, theme);
  await panel.getByRole("button", { name: english ? "Restaurants" : "음식점", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText(english ? "Searching" : "검색 중");
  await deliverNearby(page, 0, "ERROR");
  await expect(panel.getByRole("status")).toContainText(english ? "could not be loaded" : "불러오지 못했습니다");
  await expect(panel.getByRole("status")).not.toContainText(english ? "No places" : "찾지 못했습니다");
  const retry = panel.getByRole("button", { name: english ? "Search nearby again" : "주변 장소 다시 검색", exact: true });
  await retry.focus(); await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
  expect(await nearbyRequests(page)).toBe(2); await expect(retry).toBeFocused(); await expect(retry).toHaveAttribute("aria-disabled", "true");
  await deliverNearby(page, 1, "ZERO_RESULT");
  await expect(panel.getByRole("status")).toContainText(english ? "No places" : "찾지 못했습니다");
  await expect(panel.locator("article")).toHaveCount(0); await expect(retry).toBeFocused();
  await page.keyboard.press("Enter"); expect(await nearbyRequests(page)).toBe(3);
  await deliverNearby(page, 2, "OK", [nearbyPlace()]);
  await expect(panel.locator("article")).toHaveCount(1); await expect(retry).toBeFocused();
  await expect(panel.getByRole("link")).toHaveAttribute("href", "https://place.map.kakao.com/1");
  expect((await new AxeBuilder({ page }).include("#map-panel-nearby").analyze()).violations).toEqual([]);
  await panel.getByRole("button", { name: english ? "View on map" : "지도에서 보기", exact: true }).click();
  await expect(page.locator("#map-panel-place")).toContainText("검증 장소 1");
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("category changes and panel closure reject earlier results without another automatic query", async ({ page }) => {
  const panel = await openNearby(page);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await panel.getByRole("button", { name: "숙박", exact: true }).click();
  await deliverNearby(page, 1, "OK", [nearbyPlace(2)]); await deliverNearby(page, 0, "OK", [nearbyPlace(1)]);
  await expect(panel.locator("article")).toHaveCount(1); await expect(panel.locator("article")).toContainText("검증 장소 2");
  await expect(panel.getByRole("button", { name: "숙박", exact: true })).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: "주변 장소 다시 검색", exact: true }).click();
  await page.keyboard.press("Escape");
  const trigger = page.locator('.map-command-bar button[aria-controls="map-panel-nearby"]');
  await expect(trigger).toBeFocused(); await deliverNearby(page, 2, "OK", [nearbyPlace(3)]);
  await trigger.click(); await expect(panel.locator("article")).toHaveCount(0);
  expect(await nearbyRequests(page)).toBe(3);
});

for (const completed of [false, true]) test(`changing itinerary replaces the map and clears ${completed ? "completed" : "pending"} nearby results`, async ({ page }) => {
  const panel = await openNearby(page);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  if (completed) { await deliverNearby(page, 0, "OK", [nearbyPlace()]); await expect(panel.locator("article")).toHaveCount(1); }
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
  await expect(panel.getByRole("button", { name: "음식점", exact: true })).toHaveAttribute("aria-pressed", "false");
  await deliverNearby(page, 0, "OK", [nearbyPlace()]);
  await expect(panel.locator("article")).toHaveCount(0);
  await expect(panel.getByRole("status")).toHaveCount(0);
  expect(await nearbyRequests(page)).toBe(1);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await deliverNearby(page, 1, "OK", [nearbyPlace(2)]);
  await expect(panel.locator("article")).toContainText("검증 장소 2");
});

for (const failure of ["malformed", "coordinates", "origin", "radius", "throw", "timeout"]) test(`nearby ${failure} failure provides recovery and ignores late data`, async ({ page }) => {
  if (failure === "timeout") await page.clock.install();
  const panel = await openNearby(page);
  if (failure === "throw") await page.evaluate(() => { (window as unknown as { nearbyFixture: { throwNext: boolean } }).nearbyFixture.throwNext = true; });
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  if (failure === "timeout") await page.clock.fastForward(10_001);
  else if (failure !== "throw") await deliverNearby(page, 0, "OK", failure === "malformed" ? { places: [] } : [{ ...nearbyPlace(), distance: "0",
    ...(failure === "origin" ? { x: "0", y: "0" } : failure === "radius" ? { x: "128.68", y: "35.43" } : { x: "", y: " " }) }]);
  await expect(panel.getByRole("status")).toContainText("불러오지 못했습니다");
  await expect(panel.locator("article")).toHaveCount(0);
  await panel.getByRole("button", { name: "주변 장소 다시 검색", exact: true }).click();
  if (failure !== "throw") await deliverNearby(page, 0, "OK", [nearbyPlace(8)]);
  await expect(panel.locator("article")).toHaveCount(0);
  await deliverNearby(page, failure === "throw" ? 0 : 1, "OK", [nearbyPlace(9)]);
  await expect(panel.locator("article")).toContainText("검증 장소 9");
});

for (const theme of ["light", "dark"]) test(`nearby ${theme} shows all fifteen places and fourteen usable categories across required widths`, async ({ page }, testInfo) => {
  const panel = await openNearby(page, true, theme);
  await panel.getByRole("button", { name: "Restaurants", exact: true }).click();
  await deliverNearby(page, 0, "OK", Array.from({ length: 15 }, (_, index) => nearbyPlace(index + 1)));
  await expect(panel.locator("article")).toHaveCount(15);
  for (const [width, height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440]]) {
    await page.setViewportSize({ width, height });
    const categories = panel.locator(".map-tool-grid > button"); await expect(categories).toHaveCount(14);
    expect(await categories.evaluateAll((buttons) => buttons.every((button) => { const b = button.getBoundingClientRect(); return b.width >= 44 && b.height >= 44 && button.scrollWidth <= button.clientWidth + 1; }))).toBe(true);
    await panel.getByRole("button", { name: "Close nearby places", exact: true }).focus();
    for (let index = 0; index < 14; index += 1) {
      await page.keyboard.press("Tab");
      await expect(categories.nth(index)).toBeFocused();
      expect(await categories.nth(index).evaluate((button) => { const b = button.getBoundingClientRect(); return button.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)); })).toBe(true);
    }
    const retry = panel.getByRole("button", { name: "Search nearby again", exact: true }); await page.keyboard.press("Tab"); await expect(retry).toBeFocused();
    expect(await retry.evaluate((button) => { const b = button.getBoundingClientRect(); return b.width >= 44 && b.height >= 44 && button.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)); })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if ([390,1366].includes(width)) await panel.screenshot({ path: testInfo.outputPath(`nearby-${width}-${theme}.png`) });
  }
  expect((await new AxeBuilder({ page }).include("#map-panel-nearby").analyze()).violations).toEqual([]);
});
