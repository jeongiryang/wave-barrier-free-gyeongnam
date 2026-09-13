import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { deliverNearby, nearbyPlace, nearbyRequests, openNearby, addAnotherMapPlace, ensureMapView, openMapTool, type MapLayerFixture } from "./nearby-fixtures";

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
  await expect(page.locator(".simple-stops > li")).toHaveCount(1);
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
  await expect.poll(() => nearbyRequests(page)).toBe(1);
  if (completed) { await deliverNearby(page, 0, "OK", [nearbyPlace()]); await expect(panel.locator("article")).toHaveCount(1); }
  let currentEvidenceReceived = false, beforeEvidenceMap: number | undefined;
  page.on("response", response => {
    const url = new URL(response.url());
    if (url.pathname === "/api/wave" && url.searchParams.get("action") === "places" && url.searchParams.get("ids") === "1001,1002") currentEvidenceReceived = true;
  });
  const mapCount = () => page.evaluate(() => (window as unknown as { mapLayerFixture: MapLayerFixture }).mapLayerFixture.maps.length);
  await page.route("**/api/map-config", async route => {
    if (currentEvidenceReceived) beforeEvidenceMap = await mapCount();
    await route.fallback();
  });
  await addAnotherMapPlace(page);
  await expect(page.locator(".simple-stops > li")).toHaveCount(2);
  // The new saved IDs trigger a later evidence lookup and another legitimate
  // map generation. Recheck that complete map, then issue the one fresh search.
  await expect.poll(() => beforeEvidenceMap).toBeDefined();
  await expect.poll(mapCount).toBeGreaterThan(beforeEvidenceMap!);
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  await openMapTool(page, "nearby");
  await expect(panel.getByRole("button", { name: "음식점", exact: true })).toHaveAttribute("aria-pressed", "false");
  await deliverNearby(page, 0, "OK", [nearbyPlace()]);
  await expect(panel.locator("article")).toHaveCount(0);
  await expect(panel.getByRole("status")).toHaveCount(0);
  expect(await nearbyRequests(page)).toBe(1);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await expect.poll(() => nearbyRequests(page), { message: "The explicit search on the new map creates exactly one fresh request" }).toBe(2);
  await deliverNearby(page, 1, "OK", [nearbyPlace(2)]);
  await expect(panel.locator("article")).toContainText("검증 장소 2");
  expect(await nearbyRequests(page)).toBe(2);
});

test("nearby search waits for the replacement map and needs one explicit request after it is ready", async ({ page }, info) => {
  const panel = await openNearby(page);
  const food = panel.getByRole("button", { name: "음식점", exact: true });
  await food.click();
  await expect.poll(() => nearbyRequests(page)).toBe(1);
  await deliverNearby(page, 0, "OK", [nearbyPlace()]);
  await expect(panel.locator("article")).toHaveCount(1);
  const mapCount = () => page.evaluate(() => (window as unknown as { mapLayerFixture: MapLayerFixture }).mapLayerFixture.maps.length);
  const before = await mapCount();
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let held = 0;
  let evidenceReceived = false, renderedCurrentEvidence = false;
  const evidence = page.waitForResponse(response => {
    const url = new URL(response.url());
    const current = url.pathname === "/api/wave" && url.searchParams.get("action") === "places" && url.searchParams.get("ids") === "1001,1002";
    if (current) evidenceReceived = true;
    return current;
  });
  await page.route("**/api/map-config", async route => {
    held++;
    if (evidenceReceived) renderedCurrentEvidence = true;
    await pending;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ provider: "kakao", javascriptKey: "e2e-stub-key" }) });
  });
  try {
    await addAnotherMapPlace(page);
    await expect.poll(() => held).toBeGreaterThan(0);
    await expect(page.locator(".map-provider-badge.loading")).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(food).toHaveAttribute("aria-pressed", "false");
    await deliverNearby(page, 0, "OK", [nearbyPlace()]);
    await expect(panel.locator("article")).toHaveCount(0);
    await food.focus();
    await page.keyboard.press("Enter");
    await info.attach("nearby-search-during-map-replacement", { body: JSON.stringify({ before, during: await mapCount(), requests: await nearbyRequests(page), status: await panel.getByRole("status").allTextContents(), disabled: await food.isDisabled() }, null, 2), contentType: "application/json" });
    await expect(food).toBeDisabled();
    await expect(food).toBeFocused();
    await expect(food).toHaveAttribute("aria-pressed", "false");
    await expect(panel.getByRole("status")).toContainText("지도를 준비하고 있어요");
    await expect(panel).not.toContainText("불러오지 못했습니다");
    expect(await nearbyRequests(page)).toBe(1);
    expect(await mapCount()).toBe(before);
    // Saved-place evidence arrives after the itinerary changes. Hold the map
    // through that response and its renderer request, so the later explicit
    // search belongs to the completed replacement rather than an interim map.
    await (await evidence).finished();
    await expect.poll(() => renderedCurrentEvidence).toBe(true);
  } finally { release(); }
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  await expect.poll(mapCount).toBeGreaterThan(before);
  await expect(food).toBeEnabled();
  await expect(food).toHaveAttribute("aria-pressed", "false");
  expect(await nearbyRequests(page), "Finishing the map replacement must not search automatically").toBe(1);
  await food.click();
  await expect.poll(() => nearbyRequests(page)).toBe(2);
  await deliverNearby(page, 1, "OK", [nearbyPlace(2)]);
  await expect(panel.locator("article")).toHaveCount(1);
  await expect(panel.locator("article")).toContainText("검증 장소 2");
  expect(await nearbyRequests(page)).toBe(2);
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
  await page.setViewportSize({ width: 320, height: 568 });
  const panel = await openNearby(page, true, theme);
  await panel.getByRole("button", { name: "Restaurants", exact: true }).click();
  await deliverNearby(page, 0, "OK", Array.from({ length: 15 }, (_, index) => nearbyPlace(index + 1)));
  await expect(panel.locator("article")).toHaveCount(15);
  for (const [width, height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440]]) {
    await page.setViewportSize({ width, height });
    await ensureMapView(page);
    const categories = panel.locator(".map-tool-grid > button"); await expect(categories).toHaveCount(14);
    expect(await categories.evaluateAll((buttons) => buttons.map((button) => { const b = button.getBoundingClientRect(); return { name: button.textContent, width: b.width, height: b.height, scrollWidth: button.scrollWidth, clientWidth: button.clientWidth }; }).filter((b) => b.width < 44 || b.height < 44 || b.scrollWidth > b.clientWidth + 1)), `${theme} categories at ${width}px`).toEqual([]);
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

test("nearby category labels fit wider fallback fonts at every required width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const panel = await openNearby(page, true);
  await page.addStyleTag({ content: ".map-nearby-panel button { font-family: Verdana, sans-serif !important; }" });
  for (const [width, height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440]]) {
    await page.setViewportSize({ width, height });
    await ensureMapView(page);
    const categories = panel.locator(".map-tool-grid > button");
    await expect(categories).toHaveCount(14);
    expect(await categories.evaluateAll((buttons) => buttons.map((button) => { const b = button.getBoundingClientRect(); return { name: button.textContent, width: b.width, height: b.height, scrollWidth: button.scrollWidth, clientWidth: button.clientWidth }; }).filter((b) => b.width < 44 || b.height < 44 || b.scrollWidth > b.clientWidth + 1)), `fallback categories at ${width}px`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
