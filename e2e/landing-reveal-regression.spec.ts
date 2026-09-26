import { expect, test } from "@playwright/test";
import { prepareStory, storyReady, expectNoOverflow } from "./landing-contract";
import { mockPlannerApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

for (const motion of ["no-preference", "reduce"] as const) {
  test(`text-only closing remains readable after natural entry (${motion})`, async ({ page }) => {
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
    await expect(page.locator("#closing h2")).toHaveCSS("color", "rgb(236, 244, 255)");
    await expect(page.locator("#closing img,#closing a,#closing button")).toHaveCount(0);
    await expect(page.locator("#closing h2")).toHaveText("다음 풍경에서만나요");
    await expect.poll(() => page.evaluate(() => (window as Window & { landingRevealStarts?: string[] }).landingRevealStarts?.filter(name => name === "landing-closing-copy").length)).toBe(motion === "reduce" ? 0 : 1);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await copy.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(copy).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => (window as Window & { landingRevealStarts?: string[] }).landingRevealStarts?.filter(name => name === "landing-closing-copy").length)).toBe(motion === "reduce" ? 0 : 1);
    await expectNoOverflow(page);
  });
}

test("missing IntersectionObserver never hides the closing content", async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await prepareStory(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.addInitScript(() => { Object.defineProperty(window, "IntersectionObserver", { value: undefined, configurable: true }); });
  await page.goto("/");
  await storyReady(page);
  const closing = page.locator("#closing");
  await closing.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(closing.locator("img,a,button")).toHaveCount(0);
  await expect(closing.locator(".landing-closing-copy")).toHaveCSS("opacity", "1");
  await expect(closing.getByRole("heading")).toBeVisible();
  await expect(page.locator('#story [data-region-photo]')).toHaveCount(18);
  await page.goto('/planner');
  const footer = page.locator('.naru-conversation-footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toHaveAttribute('data-step', '4');
  await expect(footer.getByRole('heading', { name: '나루와 함께해요', exact: true })).toBeVisible();
  await expectNoOverflow(page);
  expect(errors).toEqual([]);
});
