import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

for (const english of [false, true]) for (const action of ["reload", "planner"] as const) {
  test(`a failed route module recovers through a document ${action} and preserves the trip ${english ? "EN dark" : "KO light"}`, async ({ page, isMobile }) => {
    await mockPlannerApi(page);
    await page.addInitScript(en => {
      localStorage.setItem("wave-locale", en ? "en" : "ko");
      localStorage.setItem("wave-theme", en ? "dark" : "light");
    }, english);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/planner");
    if (english) {
      await page.getByRole("button", { name: "Changwon", exact: true }).click();
      await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
      await page.getByRole("button", { name: /Nature and relaxation/ }).click();
      await page.getByRole("button", { name: "Find places →", exact: true }).click();
    } else await chooseTripConditions(page);
    await page.getByRole("button", { name: english ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
    await page.getByRole("button", { name: english ? "Save itinerary" : "내 일정에 저장", exact: true }).click();
    await expect(page.locator(".travel-book-archive-action [role=status]")).toContainText(english ? "Saved on this device" : "내 일정에 저장했어요");
    const saved = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith("wave-trip") || key.startsWith("wave-travel-book") || key === "wave-current-trip-v1")));
    expect(Object.keys(saved).length).toBeGreaterThan(0);
    let modules = 0;
    let documents = 0;
    page.on("request", request => { if (request.isNavigationRequest() && request.resourceType() === "document") documents++; });
    const moduleUrl = "**/app/travel-book/page.tsx*";
    await page.route(moduleUrl, route => { modules++; return route.abort("failed"); });
    await page.getByRole("link", { name: english ? /View saved itineraries/ : /저장한 일정 보기/ }).click();
    const error = page.locator(".route-state-page[role=alert]");
    await expect(error).toBeVisible();
    expect(modules).toBeGreaterThan(0);
    expect(documents).toBe(0);
    if (!isMobile) await page.setViewportSize({ width: english ? 1440 : 960, height: 900 });
    expect((await new AxeBuilder({ page }).include(".route-state-page").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath("route-recovery.png") });
    // The old module's failed import remains cached by the current document even after the network recovers.
    await page.unroute(moduleUrl);
    if (action === "reload") await error.getByRole("button").press("Enter");
    else await error.getByRole("link").press("Enter");
    await expect.poll(() => documents).toBe(1);
    await expect(error).toHaveCount(0);
    await expect(page).toHaveURL(action === "reload" ? /\/travel-book$/ : /\/planner$/);
    await expect(page.getByRole("button", { name: action === "reload" ? english ? "Plan a new trip" : "새 여행 설계" : english ? "My itinerary 1" : "내 일정 1", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith("wave-trip") || key.startsWith("wave-travel-book") || key === "wave-current-trip-v1")))).toEqual(saved);
    expect(documents).toBe(1);
  });
}
