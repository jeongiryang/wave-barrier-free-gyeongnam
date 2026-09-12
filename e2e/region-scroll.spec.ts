import { expect, test } from "@playwright/test";
import { mockPublicShellApi, mockPlannerApi } from "./fixtures";

for (const viewport of [{ width: 1440, height: 650 }, { width: 390, height: 844 }]) {
  test(`region rows follow scroll sequentially without bars at ${viewport.width}`, async ({ page }) => {
    await mockPublicShellApi(page); await mockPlannerApi(page);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
    await page.goto("/");
    const region = page.locator("#regions"), rails = region.locator(".region-card-rail");
    await expect(region).toHaveAttribute("data-film", "true");
    await expect(region).toHaveAttribute("data-film-sticky", "false");
    const reveal = (fraction: number) => region.evaluate((el, value) => scrollTo({ top: scrollY + el.getBoundingClientRect().top - innerHeight + ((el as HTMLElement).offsetHeight + innerHeight) * value, behavior: "instant" }), fraction);
    await reveal(.2);
    await expect.poll(() => rails.first().evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    expect(await rails.last().evaluate(el => el.scrollLeft)).toBe(0);
    const firstBefore = await rails.first().evaluate(el => el.scrollLeft);
    await reveal(.35);
    await expect.poll(() => rails.first().evaluate(el => el.scrollLeft)).toBeLessThan(firstBefore);
    expect(await rails.last().evaluate(el => el.scrollLeft)).toBe(0);
    await reveal(.7);
    await expect.poll(() => rails.first().evaluate(el => el.scrollLeft)).toBeLessThanOrEqual(1);
    await expect.poll(() => rails.last().evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    const secondBefore = await rails.last().evaluate(el => el.scrollLeft);
    await reveal(.8);
    await expect.poll(() => rails.last().evaluate(el => el.scrollLeft)).toBeGreaterThan(secondBefore);
    expect(await rails.first().evaluate(el => el.scrollLeft)).toBeLessThanOrEqual(1);
    for (const row of await rails.all()) {
      await expect(row).toHaveCSS("scrollbar-width", "none");
      expect(await row.evaluate(el => getComputedStyle(el, "::-webkit-scrollbar").display)).toBe("none");
    }
    const arrow = region.locator(".region-card-start").first();
    await expect(arrow).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const size = await arrow.boundingBox();
    expect(size?.width).toBeGreaterThanOrEqual(44); expect(size?.height).toBeGreaterThanOrEqual(44);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(region).toHaveAttribute("data-film", "false");
    await expect(region.locator(".region-showcase-stage")).toHaveCSS("position", "relative");
    const still = await rails.evaluateAll(rows => rows.map(row => row.scrollLeft));
    await page.evaluate(() => scrollBy({ top: 100, behavior: "instant" }));
    await expect.poll(() => rails.evaluateAll(rows => rows.map(row => row.scrollLeft))).toEqual(still);
  });
}
