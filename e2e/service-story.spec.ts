import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import { prepareStory, storyReady, expectUsableTarget, chapterIds } from "./landing-contract";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: static scenery, finite presentation and source notes connect to actual planning`, async ({ page }) => {
    const errors: string[] = [], videos: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (request.url().endsWith(".mp4")) videos.push(request.url()); });
    await mockPlannerApi(page);
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/"); await storyReady(page);
    await expect(page.locator(".landing-page")).toHaveAttribute("lang", locale);
    await expect(page.locator(".landing-hero .story-media img")).toHaveAttribute("alt", "");
    await expect(page.locator(".landing-hero .story-media video, .landing-hero .story-media > figcaption button")).toHaveCount(0);
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      for (const id of chapterIds) {
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
        await expect(page.locator(`#${id}`)).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      }
      const cta = page.locator(".landing-actions a");
      await expect(cta).toHaveAccessibleName(locale === "en" ? "Plan my trip" : "여행 계획하기");
      await expect(cta).toHaveAttribute("href", "/planner");
      await expectUsableTarget(cta);
      expect((await new AxeBuilder({ page }).include(".landing-hero").include("#recommendation").analyze()).violations).toEqual([]);
      await page.locator(".landing-hero").screenshot({ path: test.info().outputPath(`story-${locale}-${width}.png`) });
    }
    const evidence = page.locator('[data-place-evidence="2758443"]');
    await expect(evidence).toContainText(locale === "en" ? "Unconfirmed" : "미확인");
    await expect(page.locator('.destination-panorama figcaption a')).toHaveAttribute("href", /^https:/);
    expect(videos).toEqual([]);
    await page.locator(".landing-actions a").click(); await expect(page).toHaveURL(/\/planner$/);
    await page.goto("/policies#content-credits");
    await expect(page.locator("#content-credits")).toContainText("한국관광공사");
    expect(errors).toEqual([]);
  });

  test(`${locale}: failed artwork preserves keyboard planning and every chapter`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.route("**/media/wave-story/*.webp", route => route.abort());
    await page.goto("/"); await storyReady(page);
    await expect(page.locator(".landing-hero .story-media img")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await expectUsableTarget(page.locator(".landing-actions a"));
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    expect(await page.locator("main > section").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
    expect(errors).toEqual([]);
  });
}

test("data saving prevents video and speculative photos, preserving complete demos and focus", async ({ page }) => {
  const videos: string[] = [];
  page.on("request", request => { if (request.url().endsWith(".mp4")) videos.push(request.url()); });
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) }));
  await page.goto("/"); await storyReady(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator(".hero-copy-sequence")).toHaveAttribute("data-still", "true");
    for (const demo of [".needs-demo", ".community-demo"]) {
      await page.locator(demo).scrollIntoViewIfNeeded();
      await expect(page.locator(demo)).toHaveAttribute("data-step", "3");
      await expect(page.locator(demo)).toHaveAttribute("data-running", "false");
    }
    await expectUsableTarget(page.locator(".landing-actions a"));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`save-data-${width}.png`) });
  }
  expect(videos).toEqual([]);
});

for (const connectionMode of ["available", "unsupported"] as const) {
  test(`${connectionMode} data-saving API preserves static scenery and bounded Hero motion`, async ({ page }) => {
    await page.addInitScript(mode => Object.defineProperty(navigator, "connection", {
      configurable: true, value: mode === "available" ? Object.assign(new EventTarget(), { saveData: false }) : undefined,
    }), connectionMode);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install(); await page.goto("/"); await storyReady(page);
    const copy = page.locator(".hero-copy-sequence");
    await expect(copy).toHaveAttribute("data-running", "true");
    const cta = page.locator(".landing-actions a"); await cta.focus();
    await page.clock.fastForward(6500); await expect(copy).toHaveAttribute("data-phrase", "1");
    if (connectionMode === "available") {
      await page.evaluate(() => {
        const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
        connection.saveData = true; connection.dispatchEvent(new Event("change"));
      });
      await expect(copy).toHaveAttribute("data-still", "true");
      await expect(copy).toHaveAttribute("data-running", "false");
      await expect(copy).toHaveAttribute("data-phrase", "0");
    } else {
      await page.clock.fastForward(6500); await expect(copy).toHaveAttribute("data-phrase", "2");
      await page.clock.fastForward(6500); await expect(copy).toHaveAttribute("data-running", "false");
    }
    await expect(cta).toBeFocused();
    await expect(page.locator(".landing-hero video")).toHaveCount(0);
  });
}

for (const locale of ["ko", "en"] as const) for (const preference of ["system", "legacy-full"] as const) {
  test(`${locale}: initial ${preference} reduced motion keeps media static without moving focus`, async ({ page }) => {
    const videos: string[] = [];
    page.on("request", request => { if (request.url().endsWith(".mp4")) videos.push(request.url()); });
    await page.addInitScript(({ locale, preference }) => {
      localStorage.setItem("wave-locale", locale);
      if (preference === "legacy-full") localStorage.setItem("wave-motion", "full");
    }, { locale, preference });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install(); await page.goto("/"); await storyReady(page);
    const cta = page.locator(".landing-actions a"); await expectUsableTarget(cta);
    await page.clock.fastForward(60000);
    await expect(page.locator(".hero-copy-sequence")).toHaveAttribute("data-phrase", "0");
    await expect(page.locator(".hero-copy-sequence")).toHaveAttribute("data-running", "false");
    await expect(page.locator(".needs-demo")).toHaveAttribute("data-step", "3");
    await expect(page.locator(".community-demo")).toHaveAttribute("data-step", "3");
    await expect(cta).toBeFocused(); expect(videos).toEqual([]);
  });
}
