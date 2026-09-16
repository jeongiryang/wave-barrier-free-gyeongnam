import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";
import { CLIENT_BUDGET_MS } from "../lib/request-budget.js";

for (const failure of ["timeout", "server", "offline"] as const) for (const en of [false, true]) {
  test(`${en ? "EN guided dark" : "KO overview light"}: ${failure} keeps the previous trip and identifies the failure`, async ({ page }, testInfo) => {
    await mockPlannerApi(page, { plannerView: en ? "guided" : "overview" });
    await page.addInitScript(en => { localStorage.setItem("wave-theme", en ? "dark" : "light"); localStorage.setItem("wave-locale", en ? "en" : "ko"); }, en);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: `경남도립미술관 ${en ? "add to itinerary" : "일정에 담기"}`, exact: true }).click();
    let release = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    let attempts = 0;
    await page.route("**/api/wave?*", async route => {
      if (new URL(route.request().url()).searchParams.get("action") !== "plan") return route.fallback();
      attempts++;
      if (attempts > 1) return route.fallback();
      if (failure === "offline") return route.abort("internetdisconnected");
      if (failure === "server") return route.fulfill({ status: 503, json: { error: "internal details must not replace localized guidance" } });
      await gate;
      await route.fallback().catch(() => {});
    });
    if (failure === "timeout") await page.clock.install();
    const search = page.locator('.simple-activity-filter').getByRole('button', { name: '역사·문화', exact: true });
    if (failure === "offline") await page.context().setOffline(true);
    await search.click();
    await expect.poll(() => attempts).toBe(1);
    if (failure === "timeout") await page.clock.fastForward(CLIENT_BUDGET_MS.plan + 1);
    release();
    const expected = failure === "offline" ? en ? "You are offline." : "인터넷 연결이 끊겼어요." : failure === "timeout" ? en ? "The request timed out." : "조회 시간이 초과됐어요." : en ? "The server couldn't complete the request." : "서버가 요청을 처리하지 못했어요.";
    await expect(page.getByRole("alert").filter({ hasText: expected }).first()).toBeVisible();
    expect(await page.evaluate(() => JSON.parse((JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values?.["wave-saved-places"]) || "[]"))).toEqual(["1001"]);
    if (failure === "offline") await page.context().setOffline(false);
    await expect(page.getByRole("button", { name: en ? "용지호수공원 add to itinerary" : "용지호수공원 일정에 담기", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: en ? "경남도립미술관 added · undo" : "경남도립미술관 담았음 · 되돌리기", exact: true })).toBeEnabled();
    expect((await new AxeBuilder({ page }).include(".simple-results").analyze()).violations).toEqual([]);
    if (testInfo.project.name === "desktop-chromium") {
      await page.setViewportSize({ width: en ? 1440 : 960, height: 960 });
      await page.locator(".simple-result-notice").scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("plan-failure.png") });
    }
    await page.getByRole("button", { name: en ? "Retry with these preferences" : "같은 조건으로 다시 시도", exact: true }).click();
    await expect(page.getByRole("button", { name: en ? "용지호수공원 add to itinerary" : "용지호수공원 일정에 담기", exact: true })).toBeEnabled();
    expect(attempts).toBe(2);
    expect(await page.evaluate(() => JSON.parse((JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values?.["wave-saved-places"]) || "[]"))).toEqual(["1001"]);
  });
}
