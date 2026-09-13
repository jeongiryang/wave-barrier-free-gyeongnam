import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi, openItinerary } from "./fixtures";

for (const english of [false, true]) for (const action of ["reload", "planner"] as const) {
  test(`a failed route module recovers through a document ${action} and preserves the trip ${english ? "EN dark" : "KO light"}`, async ({ page, isMobile }) => {
    await mockPlannerApi(page);
    await page.addInitScript(en => {
      localStorage.setItem("wave-locale", en ? "en" : "ko");
      localStorage.setItem("wave-theme", en ? "dark" : "light");
    }, english);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/planner");
    await chooseTripConditions(page); await page.locator('.simple-place-row').first().locator('.simple-place-add').click(); await openItinerary(page);
    await page.getByRole('button', { name: '내 여행에 저장', exact: true }).click();
    await expect(page.locator('.simple-save-control')).toContainText('자동으로 저장돼요');
    const saved = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith("wave-trip") || key.startsWith("wave-travel-book") || key === "wave-current-trip-v1")));
    expect(Object.keys(saved).length).toBeGreaterThan(0);
    let modules = 0;
    let documents = 0;
    page.on("request", request => { if (request.isNavigationRequest() && request.resourceType() === "document") documents++; });
    const moduleUrl = "**/app/travel-book/page.tsx*";
    await page.route(moduleUrl, route => { modules++; return route.abort("failed"); });
    await page.locator('.simple-save-control > a[href="/travel-book"]').click();
    const error = page.locator(".route-state-page");
    await expect(error).toBeVisible();
    await expect(error.getByRole("alert")).toBeVisible();
    await expect(error).toHaveAttribute("lang", english ? "en" : "ko");
    expect(modules).toBeGreaterThan(0);
    expect(documents).toBe(0);
    // Dismiss the development-only diagnostic through its real control; the product error remains.
    await page.getByTestId("vinext-dev-error-close").click();
    await expect(page.getByTestId("vinext-dev-error-overlay")).toHaveCount(0);
    await expect(error).toBeVisible();
    if (!isMobile) await page.setViewportSize({ width: english ? 1440 : 960, height: 900 });
    expect((await new AxeBuilder({ page }).include(".route-state-page").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath("route-recovery.png") });
    // The old module's failed import remains cached by the current document even after the network recovers.
    await page.unroute(moduleUrl);
    const recovery = action === "reload" ? error.getByRole("button") : error.getByRole("link");
    await recovery.focus();
    await expect(recovery).toBeFocused();
    expect(await recovery.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return Boolean(hit && element.contains(hit));
    })).toBe(true);
    await page.keyboard.press("Enter");
    await expect.poll(() => documents).toBe(1);
    await expect(error).toHaveCount(0);
    await expect(page).toHaveURL(action === "reload" ? /\/travel-book$/ : /\/planner$/);
    if (action === "reload") await expect(page.getByRole("button", { name: "새 여행 설계", exact: true })).toBeEnabled();
    else { await openItinerary(page); await expect(page.locator('.simple-stops > li')).toHaveCount(1); }
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith("wave-trip") || key.startsWith("wave-travel-book") || key === "wave-current-trip-v1")))).toEqual(saved);
    expect(documents).toBe(1);
  });
}
