import { openSupportMenu } from "./support-menu";
import { expect, test } from "@playwright/test";
import { openNearby } from "./nearby-fixtures";

for (const entry of ["toolbar", "panel"] as const) {
  test(`location notice follows runtime language and cancellation reads no coordinates from ${entry}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      let calls = 0;
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
        getCurrentPosition: () => { calls++; },
      } });
      Object.assign(window, { locationRequestCount: () => calls });
    });
    const nearby = await openNearby(page);
    await nearby.getByRole("button", { name: "주변 장소 닫기", exact: true }).click();
    let previous = "ko";
    for (const locale of ["en", "ko", "en"]) {
      await page.keyboard.press("Control+Home");
      await openSupportMenu(page);
      const preferences = page.locator(".preference-controls:visible");
      await openSupportMenu(page);
      await preferences.getByLabel(previous === "ko" ? "환경설정 열기" : "Open preferences", { exact: true }).click();
      await preferences.getByLabel(previous === "ko" ? "언어" : "Language", { exact: true }).selectOption(locale);
      await openSupportMenu(page);
      await preferences.getByLabel(locale === "ko" ? "환경설정 열기" : "Open preferences", { exact: true }).click();
      previous = locale;
      await expect(page.locator("html")).toHaveAttribute("lang", "ko");
      if (entry === "panel") await page.locator('.map-command-bar button[aria-controls="map-panel-route"]').click();
      const button = entry === "toolbar"
        ? page.locator(".map-command-bar").getByRole("button", { name: locale === "en" ? "◎ My location" : "◎ 내 위치", exact: true })
        : page.locator("#map-panel-route").getByRole("button", { name: locale === "en" ? /Start at my location/ : /현재 위치에서 출발/ });
      let message = "";
      let routeRequests = 0;
      const observe = (request: { url(): string }) => { if (new URL(request.url()).pathname === "/api/route") routeRequests++; };
      page.on("request", observe);
      page.once("dialog", async dialog => { message = dialog.message(); await dialog.dismiss(); });
      await button.focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => message).not.toBe("");
      expect(message).toContain(locale === "en" ? "Show your current location?" : "현재 위치를 표시할까요?");
      expect(message).toContain(locale === "en" ? "Kakao" : "카카오");
      expect(message).toContain(locale === "en" ? "public departure point" : "공개 출발 거점");
      await expect(button).toBeFocused();
      expect(await page.evaluate(() => (window as unknown as { locationRequestCount(): number }).locationRequestCount())).toBe(0);
      expect(routeRequests).toBe(0);
      page.off("request", observe);
      await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
      if (entry === "panel") await page.locator("#map-panel-route").getByRole("button", { name: locale === "en" ? "Close departure and destination settings" : "출발지 목적지 설정 닫기", exact: true }).click();
    }
    for (const width of [390, 960, 1366, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.locator(".route-map-shell").scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: test.info().outputPath(`location-cancel-${entry}-${width}.png`) });
    }
    expect(errors).toEqual([]);
  });
}
