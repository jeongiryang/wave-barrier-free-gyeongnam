import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

async function expectMediaCaptionUnobscured(page: Page) {
  for (const selector of [".story-media figcaption > span:first-child", ".story-media button", ".story-media [role=status]"]) {
    const item = page.locator(selector);
    if (selector.endsWith("[role=status]") && !(await item.textContent())) continue;
    // Measure occlusion after positioning, independently of the site's smooth scroll.
    await item.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
    const sample = await item.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const hits = [0.1, 0.5, 0.9].flatMap((x) => [0.1, 0.5, 0.9].map((y) => {
        const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y);
        return { covered: !node.contains(hit), tag: hit?.tagName, className: hit?.getAttribute("class") };
      }));
      return { rect: rect.toJSON(), hits, width: innerWidth };
    });
    expect(sample.hits.every((hit) => !hit.covered), `${selector} must not be covered: ${JSON.stringify(sample)}`).toBe(true);
  }
}

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: service story keeps media optional, pauses at runtime and connects to planning`, async ({ page }) => {
    const en = locale === "en";
    const errors: string[] = [];
    const videoRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => { if (request.url().endsWith(".mp4")) videoRequests.push(request.url()); });
    await mockPlannerApi(page);
    await page.addInitScript((language) => localStorage.setItem("wave-locale", language), locale);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const landing = page.locator(".landing-page");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(landing).toHaveCount(1);
    await expect(landing).toHaveClass(/motion-ready/);
    await expect(landing).toHaveAttribute("lang", locale);
    const player = page.locator(".story-media video");
    const control = page.locator(".story-media button");
    await expect(player).not.toHaveAttribute("src");
    expect(videoRequests).toEqual([]);
    await expect(page.locator(".story-media figcaption")).toContainText(en ? "not a real destination" : "실제 관광지나 편의시설 정보가 아닙니다");
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await expectMediaCaptionUnobscured(page);
    }
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(player).toHaveJSProperty("paused", false);
    await expect(control).toBeFocused();
    await page.locator(".landing-cta").scrollIntoViewIfNeeded();
    await expect(player).toHaveJSProperty("paused", true);
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(player).toHaveJSProperty("paused", false);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(player).toHaveJSProperty("paused", true);
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await expect(control).toBeFocused();
    expect(videoRequests.length).toBeGreaterThan(0);
    expect(new Set(videoRequests)).toEqual(new Set([new URL("/media/wave-story/hero-water-loop.mp4", page.url()).href]));
    const sourceDetails = page.locator(".journey-source-details");
    await sourceDetails.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(sourceDetails).toHaveAttribute("open");
    await expect(sourceDetails.locator("p").first()).toBeVisible();
    await expect(sourceDetails).toContainText(en ? "not an accessibility certification" : "접근성을 인증하지 않아요");
    await page.keyboard.press("Enter");
    await expect(sourceDetails).not.toHaveAttribute("open");
    await expect(sourceDetails.locator("summary")).toBeFocused();

    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await expectMediaCaptionUnobscured(page);
      const planning = page.locator(".landing-actions a");
      await planning.focus();
      await expect(planning).toBeFocused();
      expect(await planning.evaluate((link) => {
        const rect = link.getBoundingClientRect();
        return rect.height >= 44 && link.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator(".journey-scene").scrollIntoViewIfNeeded();
      await expect(page.locator(".journey-scene-stops li")).toHaveCount(3);
      await expect(page.locator(".journey-scene figcaption")).toContainText(en ? "not real places or navigation results" : "실제 장소나 길찾기 결과가 아닙니다");
      if (en) {
        for (const selector of [".landing-hero-copy", ".journey-scene", ".product-story-copy", ".landing-community-copy", ".landing-cta"]) {
          const text = await page.locator(selector).allInnerTexts();
          expect(text.join(" ")).not.toMatch(/[가-힣]/);
        }
      }
      await page.locator(".landing-hero").screenshot({ path: test.info().outputPath(`story-${locale}-${width}.png`) });
      expect((await new AxeBuilder({ page }).include(".landing-hero").include(".journey-scene").analyze()).violations).toEqual([]);
    }
    await page.locator(".landing-actions a").click();
    await expect(page).toHaveURL(/\/planner$/);
    expect(errors).toEqual([]);
  });

  test(`${locale}: failed media leaves a stable keyboard control and usable planning link`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mockPublicShellApi(page);
    await page.addInitScript((language) => localStorage.setItem("wave-locale", language), locale);
    await page.route("**/media/wave-story/*.webp", (route) => route.abort());
    await page.route("**/media/wave-story/*.mp4", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(page.locator(".landing-page")).toHaveCount(1);
    await expect(page.locator(".landing-page")).toHaveClass(/motion-ready/);
    const control = page.locator(".story-media button");
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".story-media [role=status]")).toContainText(locale === "en" ? "unavailable" : "불러오지 못했어요");
    await expect(control).toBeFocused();
    await expect(control).toHaveAttribute("aria-disabled", "true");
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await expectMediaCaptionUnobscured(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator(".landing-actions a")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const locale of ["ko", "en"] as const) {
  for (const preference of ["system", "site"] as const) {
    test(`${locale}: initial ${preference} reduced motion keeps media static without moving focus`, async ({ page }) => {
      const requests: string[] = [];
      page.on("request", (request) => { if (request.url().endsWith(".mp4")) requests.push(request.url()); });
      await mockPublicShellApi(page);
      await page.addInitScript(({ locale, preference }) => {
        localStorage.setItem("wave-locale", locale);
        if (preference === "site") localStorage.setItem("wave-motion", "calm");
      }, { locale, preference });
      await page.emulateMedia({ reducedMotion: preference === "system" ? "reduce" : "no-preference" });
      await page.goto("/");
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
      await expect(page.locator(".landing-page")).toHaveCount(1);
      const control = page.locator(".story-media button");
      await expect(control).toHaveAttribute("aria-disabled", "true");
      await control.focus();
      await page.keyboard.press("Enter");
      await expect(control).toBeFocused();
      await expect(control).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator(".story-media video")).not.toHaveAttribute("src");
      await expect(page.locator(".story-media [role=status]")).toContainText(locale === "en" ? "stays still" : "정지된 풍경");
      expect(requests).toEqual([]);
    });
  }
}
