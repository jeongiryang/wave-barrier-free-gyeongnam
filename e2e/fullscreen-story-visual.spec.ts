import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test.use({ video: "on" });

test("the full-screen arrival leads through the complete Korean service story", async ({ page, isMobile }) => {
  await page.setViewportSize(isMobile ? {width:390,height:844} : {width:1366,height:900});
  await mockPublicShellApi(page);
  await page.route("**/api/region-photo**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "사진을 불러오지 못했어요." }) }));
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "WAVE", exact: true });
  await expect(intro.getByRole("button")).toHaveCount(0);
  await expect(intro.locator("canvas")).toHaveAttribute("data-intro-phase", "wordmark");
  await page.screenshot({ path: test.info().outputPath("01-fullscreen-intro.png") });
  await page.keyboard.press("Escape");
  await expect(intro).toBeHidden();
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("02-hero.png") });
  // Real elapsed playback records line transitions rather than fast-forwarded text.
  await expect(page.locator(".hero-copy-sequence")).toHaveAttribute("data-phrase", "1");
  await expect.poll(() => page.locator(".hero-phrase[data-active=true] .hero-line > span").first().evaluate(node=>getComputedStyle(node).transform)).toBe("none");
  await page.screenshot({ path: test.info().outputPath("02b-hero-phrase.png") });
  await expect(page.locator(".hero-copy-sequence")).toHaveAttribute("data-phrase", "2");
  if (!isMobile) {
    const rail=page.locator("#story-progress-list a");
    await expect(rail).toHaveCount(7);
    for (const link of await rail.all()) await expect(link).toBeVisible();
    await page.screenshot({path:test.info().outputPath("02c-progress-always-visible.png")});
    await page.locator(".landing-actions a[href='/planner']").focus();
  }
  for (const [index, selector] of [".horizon-how", ".region-story", ".horizon-account", ".horizon-departure", ".horizon-community", ".landing-cta"].entries()) {
    const section = page.locator(selector);
    const heading = section.locator(selector === ".region-story" ? ".selected-region strong" : "h2").first();
    // The chapter section now spans three native scroll scenes. Bring its
    // heading into view before asserting the heading's entrance animation.
    await heading.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
    await expect.poll(() => heading.evaluate(node => {
      const reveal = node.closest("[data-land-reveal]") || node;
      return Number(getComputedStyle(reveal).opacity);
    })).toBe(1);
    if(selector === ".horizon-how") await expect(page.locator(".horizon-chapter-copy")).toHaveCount(3);
    if(selector === ".horizon-community") await expect(page.locator(".horizon-community-photos img")).toHaveCount(2);
    await page.screenshot({ path: test.info().outputPath(`${index + 3}-scene.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  // Owner deferred the presentation to #386; Planner date/map functionality is untouched.
  await expect(page.locator(".journey-dated-scene,.story-expansion")).toHaveCount(0);
  await expect(page.locator("main > section")).toHaveCount(7);
  await expect(page.locator(".horizon-chapter-copy")).toHaveCount(3);
  await expect(page.locator(".horizon-community-photos img")).toHaveCount(2);
  // One complete static page documents the whole composition, separately from normal-motion scenes.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".region-showcase-stage")).toHaveCSS("--cinema-progress", "1");
  await page.screenshot({ fullPage: true, scale: "css", path: test.info().outputPath("whole-page-static.png") });
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
