import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

for (const english of [false, true]) for (const zero of [false, true]) {
  test(`${english ? "EN dark" : "KO light"} regional information distinguishes ${zero ? "reported zero" : "unavailable figures"} across viewport widths`, async ({ page }, testInfo) => {
    await mockPlannerApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(en => {
      localStorage.setItem("wave-locale", en ? "en" : "ko");
      localStorage.setItem("wave-theme", en ? "dark" : "light");
    }, english);
    let requests = 0;
    await page.route("**/api/wave?*", route => {
      if (new URL(route.request().url()).searchParams.get("action") !== "enrich") return route.fallback();
      requests++;
      return route.fulfill({ json: {
        generatedAt: plan.generatedAt, visitor: { total: 0, byType: zero ? { 현지인: 0 } : {}, startYmd: "20260801", endYmd: "20260807" },
        demand: zero ? [{ name: "Nature", value: 0, baseYm: "202608" }] : [],
        camping: [], pet: [], wellness: [], medical: [], language: [], awards: [], water: [], rests: [], events: [], lodging: [],
        statuses: [{ id: "visitor", name: "지역별 방문자수", role: "Regional visitors", note: "", state: zero ? "live" : "empty", count: zero ? 1 : 0 }],
      } });
    });
    await page.goto("/planner");
    if (english) {
      await page.getByRole("button", { name: "Changwon", exact: true }).click();
      await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
      await page.getByRole("button", { name: /Nature and relaxation/ }).click();
      await page.getByRole("button", { name: "Find places →", exact: true }).click();
    } else await chooseTripConditions(page);
    await page.getByRole("button", { name: english ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
    await page.locator("#layers > summary").click();
    const insights = page.locator(".insight-board");
    await expect(insights).toHaveAttribute("aria-busy", "false");
    if (zero) {
      await expect(insights.locator(".visitor-insight > strong")).toHaveText(english ? "0visits" : "0명");
      for (const selector of [".visitor-bars i b", ".demand-list i b"]) await expect(insights.locator(selector)).toHaveCSS("width", "0px");
      await expect(insights.locator(".visitor-bars span")).toHaveAttribute("lang", "ko");
    } else await expect(insights.locator(".visitor-empty")).toContainText(english ? "Visitor figures are not available yet." : "아직 제공되지 않은");
    await expect(insights).toContainText(english ? "Tourism demand" : "관광 수요 지표");
    await page.locator("#theme-tab-language").click();
    await expect(page.locator(".theme-explorer")).toContainText(english ? "This regional list is separate from the places in your itinerary" : "내 일정의 장소와 별도로 조회한 지역 목록");
    for (const width of [320, 390, 960, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await insights.scrollIntoViewIfNeeded();
      expect((await new AxeBuilder({ page }).include(".insight-board").include(".theme-explorer").analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (width === 960 || width === 1440) await insights.screenshot({ path: testInfo.outputPath(`regional-insights-${width}.png`) });
    }
    expect(requests).toBe(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
  });
}
