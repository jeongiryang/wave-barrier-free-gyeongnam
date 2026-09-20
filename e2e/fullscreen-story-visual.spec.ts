import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { prepareLandingMedia, storyReady, expectNoOverflow } from "./landing-contract";

const chapterIds = ["top","regions","story","features","naru","community","departure","closing"];

test.use({ video: "on" });

test("the nonblocking arrival leads through a complete restored-section service introduction", async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1440, height: 960 });
  await prepareLandingMedia(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/"); await storyReady(page);
  await expect(page.locator(".arrival-scene")).toBeVisible();
  await expect(page.locator(".arrival-scene")).toBeHidden({ timeout: 12_000 });
  await expect(page.locator(":modal, [inert]:not(.horizon-chapter-backdrops > [aria-hidden=true]):not(.arrival-picture)")).toHaveCount(0);
  expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
  for (const id of chapterIds) {
    if (id === "features") await page.getByText("여행 도구 모두 보기", {exact:true}).click();
    const section = page.locator(`#${id}`);
    await section.locator("h1,h2").first().scrollIntoViewIfNeeded();
    await expect(section).toHaveAccessibleName(/\S/);
    await page.screenshot({ path: test.info().outputPath(`story-${id}.png`) });
    await expectNoOverflow(page);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".simple-region")).toHaveCount(6);
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
