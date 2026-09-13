import { showItineraryMap } from './fixtures';
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
        ? page.locator(".map-command-bar").getByRole("button", { name: locale === "en" ? "Distance on this device" : "기기에서 거리 확인", exact: true })
        : page.locator("#map-panel-route").getByRole("button", { name: locale === "en" ? /Distance on this device/ : /기기에서 거리 확인/ });
      let message = "";
      let routeRequests = 0;
      const observe = (request: { url(): string }) => { if (new URL(request.url()).pathname === "/api/route") routeRequests++; };
      page.on("request", observe);
      page.once("dialog", async dialog => { message = dialog.message(); await dialog.dismiss(); });
      await button.focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => message).not.toBe("");
      expect(message).toContain(locale === "en" ? "Check distance on this device?" : "이 기기에서 거리를 확인할까요?");
      expect(message).toContain(locale === "en" ? "not sent to WAVE, map providers or Naru, or saved" : "WAVE 서버·지도 제공처·나루에 전송하거나 저장하지 않습니다");
      expect(message).toContain(locale === "en" ? "selected public departure" : "선택한 공개 출발지");
      await expect(button).toBeFocused();
      const target = await button.boundingBox();
      expect(target).not.toBeNull();
      expect(target!.width).toBeGreaterThanOrEqual(44);
      expect(target!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => (window as unknown as { locationRequestCount(): number }).locationRequestCount())).toBe(0);
      expect(routeRequests).toBe(0);
      page.off("request", observe);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wave-saved-places') || '[]'))).toHaveLength(1);
      if (entry === "panel") await page.locator("#map-panel-route").getByRole("button", { name: locale === "en" ? "Close departure and destination settings" : "출발지 목적지 설정 닫기", exact: true }).click();
    }
    for (const [index, width] of [390, 960, 1023, 1024, 1366, 1440, 390].entries()) {
      await page.setViewportSize({ width, height: 844 });
      const view = page.getByRole('group', { name: '일정 보기 방식', exact: true });
      // Resizing completes before the matchMedia change has necessarily
      // rendered React's mobile controls. Await the actual new layout first.
      if (width < 1024) {
        await expect(view).toBeVisible();
        await showItineraryMap(page);
        await expect(view.getByRole('button', { name: '지도', exact: true })).toHaveAttribute('aria-pressed', 'true');
        for (const control of await view.getByRole('button').all()) {
          const target = await control.boundingBox();
          expect(target).not.toBeNull();
          expect(target!.width).toBeGreaterThanOrEqual(44);
          expect(target!.height).toBeGreaterThanOrEqual(44);
        }
      } else await expect(view).toHaveCount(0);
      await expect(page.locator('.simple-itinerary-board')).toHaveAttribute('data-map', 'true');
      const map = page.locator('.route-map-shell');
      await expect(map).toBeVisible();
      await map.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: test.info().outputPath(`location-cancel-${entry}-${index}-${width}.png`) });
    }
    expect(await page.evaluate(() => (window as unknown as { locationRequestCount(): number }).locationRequestCount())).toBe(0);
    expect(errors).toEqual([]);
  });
}
