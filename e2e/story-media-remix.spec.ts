import { expect, test } from "@playwright/test";
import { chapterIds, openLandingTools, prepareStory, storyReady,  expectUsableTarget } from "./landing-contract";
import { awardHeroImage, mockAwardHero } from './landing-photo-fixture';


test("the current scenery stays loaded while retired videos, screenshots and boundary modules never download", async ({ page }) => {
  await prepareStory(page);
  await mockAwardHero(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto("/"); await storyReady(page);
  const hero = page.locator(".landing-opening .award-panorama img.is-current");
  await expect(hero).toHaveAttribute("src", awardHeroImage);
  await expect.poll(() => hero.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  for (const id of chapterIds) { if(id === "naru") await openLandingTools(page); await page.locator(`#${id}`).scrollIntoViewIfNeeded(); }
  await expectUsableTarget(page.locator("#naru .simple-text-link[href*=assistant]"));
  expect(requests.filter(url => /\.mp4(?:\?|$)|ocean-expand|journey-sequence|timeline-|date-before|date-after|RegionBoundarySurface|korea-sgis-2020/.test(url))).toEqual([]);
  await expect(page.locator("main video, #regions [data-region-boundary]")).toHaveCount(0);
});
