import { INTRO_DURATION_MS } from '../features/landing/intro/wave-timing';
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chapterIds, openLandingTools, freshArrival, arrivalPlaybackReady, expectNoOverflow } from "./landing-contract";



test.use({ video: "on" });

test("the nonblocking arrival leads through a complete restored-section service introduction", async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1440, height: 960 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await freshArrival(page);
  await arrivalPlaybackReady(page);
  await expect(page.locator(".arrival-scene")).toBeVisible();
  await page.clock.runFor(INTRO_DURATION_MS + 100);
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await page.clock.resume();
  await expect(page.locator(":modal, [inert]:not(.horizon-chapter-backdrops > [aria-hidden=true]):not(.arrival-picture)")).toHaveCount(0);
  expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
  for (const id of chapterIds) {
    if (id === "naru") await openLandingTools(page);
    const section = page.locator(`#${id}`);
    await section.locator("h1,h2").first().scrollIntoViewIfNeeded();
    await expect(section).toHaveAccessibleName(/\S/);
    await page.screenshot({ path: test.info().outputPath(`story-${id}.png`) });
    await expectNoOverflow(page);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".simple-region")).toHaveCount(5);
  await expect(page.locator(".night-journey-tabs button")).toHaveCount(3);
  await expect(page.locator(".horizon-checks li")).toHaveCount(4);
  await expect(page.locator(".simple-naru-example")).toContainText("대화 예시");
  // Capture the fixed navigation at the top, not at the previous scroll offset.
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator(".wave-header")).toHaveAttribute("data-hidden", "false");
  await page.screenshot({ fullPage: true, scale: "css", path: test.info().outputPath("whole-page-static.png") });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
