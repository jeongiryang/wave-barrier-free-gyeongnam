import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { prepareLandingMedia, storyReady, chapterIds, expectNoOverflow } from "./landing-contract";

test.use({ video: "on" });

test("the nonblocking arrival leads through a complete four-section service introduction", async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1440, height: 960 });
  await prepareLandingMedia(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/"); await storyReady(page);
  await expect(page.locator(".arrival-scene")).toBeHidden({ timeout: 2500 });
  await expect(page.locator(":modal, [inert]")).toHaveCount(0);
  expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
  for (const id of chapterIds) {
    const section = page.locator(`#${id}`);
    await section.locator("h1,h2").first().scrollIntoViewIfNeeded();
    await expect(section).toHaveAccessibleName(/\S/);
    await page.screenshot({ path: test.info().outputPath(`story-${id}.png`) });
    await expectNoOverflow(page);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".simple-region")).toHaveCount(6);
  await expect(page.locator(".simple-product-preview")).toContainText("화면 예시");
  await expect(page.locator(".simple-naru-example")).toContainText("대화 예시");
  // Capture the fixed navigation at the top, not at the previous scroll offset.
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator(".wave-header")).toHaveAttribute("data-hidden", "false");
  await page.screenshot({ fullPage: true, scale: "css", path: test.info().outputPath("whole-page-static.png") });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
