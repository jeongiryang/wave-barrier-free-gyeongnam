import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openLandingTools, prepareStory, storyReady, chapterIds, expectNoOverflow, expectUsableTarget } from "./landing-contract";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

test("navigation hides downward, waits for deliberate upward scrolling and remains available on keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  const nav = page.locator(".wave-header");
  await expect(nav).toHaveAttribute("data-hidden", "false");
  const top = (await nav.boundingBox())!;
  expect(top.x).toBe(0);
  expect(top.width).toBe(page.viewportSize()!.width);
  const hero = (await page.locator(".landing-hero-split").boundingBox())!;
  expect(hero.y).toBeGreaterThanOrEqual(top.y + top.height);
  await page.evaluate(() => scrollTo({ top: 500, behavior: "instant" }));
  await expect(nav).toHaveAttribute("data-hidden", "true");
  await page.evaluate(() => scrollTo({ top: 460, behavior: "instant" }));
  await expect(nav).toHaveAttribute("data-hidden", "true");
  await page.evaluate(() => scrollTo({ top: 350, behavior: "instant" }));
  await expect(nav).toHaveAttribute("data-hidden", "false");
  await expect(nav).toBeInViewport();
  const home = nav.locator(".wave-wordmark");
  await home.focus(); await expect(home).toBeFocused();
  await page.evaluate(() => scrollTo({ top: 900, behavior: "instant" }));
  await expect(nav).toHaveAttribute("data-hidden", "false");
  await expect(nav.getByRole("navigation").getByRole("link")).toHaveText(["서비스 소개", "여행 설계", "축제", "커뮤니티"]);
  for (const control of [home, nav.locator(".wave-my-trips")]) await expectUsableTarget(control);
});

for (const width of [320, 390]) {
  test(`${width}px static story remains complete under ordinary vertical scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/"); await storyReady(page);
    expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
    for (const id of chapterIds) {
      if (id === "naru") await openLandingTools(page);
      const section = page.locator(`#${id}`), heading = section.locator("h1,h2").first();
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
      await expect(section).toHaveAccessibleName(/\S/);
      await expectNoOverflow(page);
    }
    await expect(page.locator(".night-journey-tabs button")).toHaveCount(3);
    await expect(page.locator(".simple-naru-example input,.simple-naru-example button")).toHaveCount(0);
    await expectUsableTarget(page.locator(".landing-actions a"));
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
