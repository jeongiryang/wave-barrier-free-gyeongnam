import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { landingFeatures } from "../features/landing/feature-list";
import { expectNoOverflow, openLandingTools, prepareStory, storyReady } from "./landing-contract";

for (const width of [390, 960, 1440]) test(`${width}px shows every verified feature`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
  await prepareStory(page);
  await page.goto("/");
  await storyReady(page);
  // Both sections are now part of the reading flow without a disclosure.
  await expect(page.locator('#naru')).toBeVisible();
  await expect(page.locator('#features')).toBeVisible();
  await openLandingTools(page);
  const section = page.locator("#features");
  await expect(section.locator(".landing-feature-card")).toHaveCount(landingFeatures.length);
  await expect(section.locator(".landing-feature-card")).toHaveText(landingFeatures.map(item => `${item.title}${item.body}`));
  await expectNoOverflow(page);
  expect((await new AxeBuilder({ page }).include("#features").analyze()).violations).toEqual([]);
});

test("optional feature section follows the story and regional gallery with whole-card links", async ({ page }) => {
  await prepareStory(page);
  await page.goto("/");
  await storyReady(page);
  await openLandingTools(page);
  expect(await page.locator("#story, #features, #regions").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(["regions", "story", "features"]);
  await expect(page.locator("#features a.landing-feature-card")).toHaveCount(landingFeatures.filter(item => item.href).length);
  await expect(page.locator("#features .landing-feature-card h3")).toHaveCount(landingFeatures.length);
});
