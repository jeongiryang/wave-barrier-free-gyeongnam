import { expect, test } from "@playwright/test";
import { prepareStory, storyReady, expectNoOverflow } from "./landing-contract";
import { mockPlannerApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

for (const motion of ["no-preference", "reduce"] as const) {
  test(`text-only closing remains readable after natural entry (${motion})`, async ({ page }) => {
    await prepareStory(page);
    await page.emulateMedia({ reducedMotion: motion });
    // Observe real animation starts without changing classes, opacity or playback.
    await page.addInitScript(() => {
      const original = Element.prototype.animate;
      const recorded: string[] = [];
      Object.assign(window, { landingRevealStarts: recorded });
      Element.prototype.animate = function (...args) {
        if (this.hasAttribute("data-land-reveal")) recorded.push(this.className);
        return original.apply(this, args);
      };
    });
    await page.goto("/");
    await storyReady(page);
    const copy = page.locator(".landing-closing-copy");
    await copy.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect.poll(() => copy.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
    await expect(page.locator("#closing h2")).toHaveCSS("color", "rgb(236, 244, 255)");
    await expect(page.locator("#closing img,#closing a,#closing button")).toHaveCount(0);
    await expect(page.locator("#closing h2")).toHaveText("다음 풍경에서 만나요");
    await expect.poll(() => page.evaluate(() => (window as Window & { landingRevealStarts?: string[] }).landingRevealStarts?.filter(name => name.split(/\s+/).includes("landing-closing-copy")).length)).toBe(1);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await copy.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(copy).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => (window as Window & { landingRevealStarts?: string[] }).landingRevealStarts?.filter(name => name.split(/\s+/).includes("landing-closing-copy")).length)).toBe(1);
    await expectNoOverflow(page);
  });
}

test("missing IntersectionObserver never hides the closing content", async ({ page }) => {
  const errors: string[] = [];
  const photoRegions = new Set<string>();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname === '/api/wave' && url.searchParams.get('action') === 'photo' && response.ok()) {
      void response.finished().then(error => { if (!error) photoRegions.add(url.searchParams.get('region') || ''); });
    }
  });
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
  // All fallback map reads settle before a full document navigation. Otherwise
  // WebKit reports deliberately aborted old-document fetches as access errors.
  await expect.poll(() => photoRegions.size).toBe(18);
  expect(errors).toEqual([]);
  await page.goto('/planner');
  const welcome = page.locator('.naru-header-scene');
  await welcome.scrollIntoViewIfNeeded();
  await expect(welcome).toHaveAttribute('data-frame', '4');
  // The owner removed the decorative headline/dialogue. Without an observer,
  // the remaining scenery must still decode and expose its final visible frame.
  await expect(welcome).toHaveAccessibleName('나루와 함께 여행 준비하기');
  const scenery = welcome.locator('img.is-current');
  await expect(scenery).toBeVisible();
  await expect(scenery).toHaveCSS('opacity', '1');
  await expect.poll(() => scenery.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toBeVisible();
  await expectNoOverflow(page);
  expect(errors).toEqual([]);
});
