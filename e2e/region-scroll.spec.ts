import { expect, test, type Page } from "@playwright/test";
import { prepareStory, storyReady, expectNoOverflow } from "./landing-contract";

async function observeRegionalMotion(page: Page) {
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, "regionalMotionCalls", { value: calls });
    const animate = Element.prototype.animate;
    Element.prototype.animate = function(keyframes, options) {
      if (this.matches(".simple-region")) calls.push(this.querySelector("h3")?.textContent || "");
      return animate.call(this, keyframes, options);
    };
  });
}

for (const width of [390, 1440]) test(`${width}px regions reveal as they enter and remain ordinary vertical content`, async ({ page }) => {
  await prepareStory(page);
  await observeRegionalMotion(page);
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/"); await storyReady(page);
  const cards = page.locator(".simple-region");
  for (const card of await cards.all()) {
    const name = await card.locator("h3").innerText();
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(value => (window as Window & { regionalMotionCalls?: string[] }).regionalMotionCalls?.filter(name => name === value).length, name)).toBe(1);
    await expect.poll(() => card.evaluate(node => node.getAnimations().filter(animation => animation.playState === "running").length)).toBe(0);
    await expectNoOverflow(page);
  }
  const before = await page.locator("#regions").evaluate(node => ({ top: node.getBoundingClientRect().top, scroll: scrollY }));
  await page.evaluate(() => scrollBy({ top: -100, behavior: "instant" }));
  const after = await page.locator("#regions").evaluate(node => ({ top: node.getBoundingClientRect().top, scroll: scrollY }));
  expect(Math.abs((after.top - before.top) + (after.scroll - before.scroll))).toBeLessThanOrEqual(1);
  expect(await page.locator("#regions").evaluate(node => getComputedStyle(node).position)).not.toBe("fixed");
  expect(await page.evaluate(() => (window as Window & { regionalMotionCalls?: string[] }).regionalMotionCalls?.length)).toBe(6);
});

test("switching OS reduction on before scrolling prevents new regional motion and preserves keyboard focus", async ({ page }) => {
  await prepareStory(page);
  await observeRegionalMotion(page);
  await page.setViewportSize({ width: 390, height: 568 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/"); await storyReady(page);
  const action = page.locator(".landing-actions a");
  await action.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const previousCalls = await page.evaluate(() => [...((window as Window & { regionalMotionCalls?: string[] }).regionalMotionCalls || [])]);
  for (const card of await page.locator(".simple-region").all()) {
    await card.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(await card.evaluate(node => node.getAnimations().filter(animation => animation.playState === "running").length)).toBe(0);
  }
  expect(await page.evaluate(() => (window as Window & { regionalMotionCalls?: string[] }).regionalMotionCalls)).toEqual(previousCalls);
  await expect(action).toBeFocused();
  await expectNoOverflow(page);
});
