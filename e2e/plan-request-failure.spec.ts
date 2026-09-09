import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";
import { CLIENT_BUDGET_MS } from "../lib/request-budget.js";

for (const failure of ["timeout", "server"] as const) for (const en of [false, true]) {
  test(`${en ? "EN guided dark" : "KO overview light"}: ${failure} keeps the previous trip and identifies the failure`, async ({ page }, testInfo) => {
    await mockPlannerApi(page, { plannerView: en ? "guided" : "overview" });
    await page.addInitScript(en => localStorage.setItem("wave-theme", en ? "dark" : "light"), en);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    if (en) {
      await page.keyboard.press("Control+Home");
      const preferences = page.locator(".preference-controls:visible");
      await preferences.getByLabel("환경설정 열기", { exact: true }).click();
      await preferences.getByLabel("언어", { exact: true }).selectOption("en");
      await preferences.getByLabel("Open preferences", { exact: true }).click();
      await page.getByRole("button", { name: "Search with new preferences", exact: true }).click();
      await expect(page.getByRole("button", { name: "용지호수공원 Add to itinerary", exact: true })).toBeEnabled();
    }
    let release = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    let attempts = 0;
    await page.route("**/api/wave?*", async route => {
      if (new URL(route.request().url()).searchParams.get("action") !== "plan") return route.fallback();
      attempts++;
      if (attempts > 1) return route.fallback();
      if (failure === "server") return route.fulfill({ status: 503, json: { error: "internal details must not replace localized guidance" } });
      await gate;
      await route.fallback().catch(() => {});
    });
    if (failure === "timeout") await page.clock.install();
    const search = page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 찾기 →", exact: true });
    if (en) await page.getByRole("button", { name: "Trip setup", exact: true }).first().click();
    await search.click();
    await expect.poll(() => attempts).toBe(1);
    if (failure === "timeout") await page.clock.fastForward(CLIENT_BUDGET_MS.plan + 1);
    release();
    const expected = failure === "timeout" ? en ? "The request timed out." : "조회 시간이 초과됐어요." : en ? "The server couldn't complete the request." : "서버가 요청을 처리하지 못했어요.";
    await expect(page.getByRole("alert").filter({ hasText: expected }).first()).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
    if (en) await page.getByRole("button", { name: "Places", exact: true }).first().click();
    await expect(page.getByRole("button", { name: en ? "용지호수공원 Add to itinerary" : "용지호수공원 일정에 추가", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: en ? "경남도립미술관 Remove from itinerary" : "경남도립미술관 일정에서 빼기", exact: true })).toBeEnabled();
    expect((await new AxeBuilder({ page }).include("#places").analyze()).violations).toEqual([]);
    if (testInfo.project.name === "desktop-chromium") {
      await page.setViewportSize({ width: en ? 1440 : 960, height: 960 });
      await page.locator(".result-notice.error").scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("plan-failure.png") });
    }
    await page.getByRole("button", { name: en ? "Try again" : "다시 시도", exact: true }).click();
    await expect(page.getByRole("button", { name: en ? "용지호수공원 Add to itinerary" : "용지호수공원 일정에 추가", exact: true })).toBeEnabled();
    expect(attempts).toBe(2);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
  });
}
