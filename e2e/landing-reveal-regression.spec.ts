import { expect, test } from "@playwright/test";
import { prepareStory, storyReady, expectNoOverflow } from "./landing-contract";

test.use({ storageState: { cookies: [], origins: [] } });

for (const motion of ["no-preference", "reduce"] as const) {
  test(`closing photograph and text remain readable after natural entry (${motion})`, async ({ page }) => {
    await prepareStory(page);
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto("/");
    await storyReady(page);
    // Observe real animation starts without changing classes, opacity or playback.
    await page.evaluate(() => {
      const original = Element.prototype.animate;
      const recorded: string[] = [];
      Object.assign(window, { landingRevealStarts: recorded });
      Element.prototype.animate = function (...args) {
        if (this.hasAttribute("data-land-reveal")) recorded.push(this.className);
        return original.apply(this, args);
      };
    });
    const copy = page.locator(".landing-closing-copy");
    await copy.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect.poll(() => copy.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
    await expect(page.locator("#closing h2")).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(page.locator("#closing .editorial-photo")).toHaveCSS("opacity", "1");
    await expect.poll(() => page.locator("#closing img").evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    await expect(page.locator("#closing a[href='/planner']")).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as Window & { landingRevealStarts?: string[] }).landingRevealStarts?.filter(name => name === "landing-closing-copy").length)).toBe(motion === "reduce" ? 0 : 1);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await copy.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(copy).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => (window as Window & { landingRevealStarts?: string[] }).landingRevealStarts?.filter(name => name === "landing-closing-copy").length)).toBe(motion === "reduce" ? 0 : 1);
    await expectNoOverflow(page);
  });
}

test("missing IntersectionObserver never hides the closing content", async ({ page }) => {
  await prepareStory(page);
  await page.addInitScript(() => { Object.defineProperty(window, "IntersectionObserver", { value: undefined, configurable: true }); });
  await page.goto("/");
  await storyReady(page);
  const closing = page.locator("#closing");
  await closing.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(closing.locator(".editorial-photo")).toHaveCSS("opacity", "1");
  await expect(closing.locator(".landing-closing-copy")).toHaveCSS("opacity", "1");
  await expect(closing.getByRole("heading")).toBeVisible();
});
